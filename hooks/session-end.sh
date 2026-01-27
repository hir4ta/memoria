#!/usr/bin/env bash
#
# session-end.sh - SessionEnd hook for memoria plugin
#
# On session end:
# 1. If status is complete -> just log
# 2. If status is draft -> upgrade to complete
# 3. If status is null -> API fallback (append to existing data)
#
# Input (stdin): JSON with session_id, transcript_path, cwd
# Output: None (cannot block session end)

set -euo pipefail

# Read input from stdin
input_json=$(cat)

# Extract fields
session_id=$(echo "$input_json" | jq -r '.session_id // empty' 2>/dev/null || echo "")
transcript_path=$(echo "$input_json" | jq -r '.transcript_path // empty' 2>/dev/null || echo "")
cwd=$(echo "$input_json" | jq -r '.cwd // empty' 2>/dev/null || echo "")

if [ -z "$session_id" ]; then
    echo "[memoria] No session_id provided" >&2
    exit 0
fi

# Use cwd from input or fallback to PWD
if [ -z "$cwd" ]; then
    cwd="${PWD}"
fi

# Resolve paths
cwd=$(cd "$cwd" 2>/dev/null && pwd || echo "$cwd")
sessions_dir="${cwd}/.memoria/sessions"

# Find session file (new format: {session_short_id}.json without date prefix)
session_short_id="${session_id:0:8}"
session_file=""

if [ -d "$sessions_dir" ]; then
    # First try new format (without date prefix)
    session_file=$(find "$sessions_dir" -type f -name "${session_short_id}.json" 2>/dev/null | head -1)

    # Fallback to old format (with date prefix) for backwards compatibility
    if [ -z "$session_file" ]; then
        session_file=$(find "$sessions_dir" -type f -name "*_${session_short_id}.json" 2>/dev/null | head -1)
    fi
fi

if [ -z "$session_file" ] || [ ! -f "$session_file" ]; then
    echo "[memoria] Session file not found for: ${session_short_id}" >&2
    exit 0
fi

# Check current status
status=$(jq -r '.status // "null"' "$session_file" 2>/dev/null || echo "null")
title=$(jq -r '.summary.title // ""' "$session_file" 2>/dev/null || echo "")
files_count=$(jq -r '.files | length' "$session_file" 2>/dev/null || echo "0")

# If already complete, just log
if [ "$status" = "complete" ]; then
    echo "[memoria] Session complete: ${session_file}" >&2
    exit 0
fi

# If draft, upgrade to complete and set endedAt
if [ "$status" = "draft" ]; then
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    jq --arg status "complete" --arg endedAt "$now" --arg updatedAt "$now" '
        .status = $status | .endedAt = $endedAt | .updatedAt = $updatedAt
    ' "$session_file" > "${session_file}.tmp" && mv "${session_file}.tmp" "$session_file"
    echo "[memoria] Session upgraded to complete: ${session_file}" >&2
    exit 0
fi

# Status is null - try API fallback
config_file="${HOME}/.claude/memoria.json"
if [ ! -f "$config_file" ]; then
    # No config - mark as complete if has content, otherwise leave as is
    if [ -n "$title" ] && [ "$files_count" -gt 0 ]; then
        now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        jq --arg status "complete" --arg endedAt "$now" --arg updatedAt "$now" '
            .status = $status | .endedAt = $endedAt | .updatedAt = $updatedAt
        ' "$session_file" > "${session_file}.tmp" && mv "${session_file}.tmp" "$session_file"
        echo "[memoria] Session marked complete (no config): ${session_file}" >&2
    else
        echo "[memoria] Session ended without saving (no config): ${session_file}" >&2
    fi
    exit 0
fi

api_key=$(jq -r '.openai_api_key // empty' "$config_file" 2>/dev/null || echo "")
if [ -z "$api_key" ]; then
    # No API key - mark as complete if has content
    if [ -n "$title" ] && [ "$files_count" -gt 0 ]; then
        now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        jq --arg status "complete" --arg endedAt "$now" --arg updatedAt "$now" '
            .status = $status | .endedAt = $endedAt | .updatedAt = $updatedAt
        ' "$session_file" > "${session_file}.tmp" && mv "${session_file}.tmp" "$session_file"
        echo "[memoria] Session marked complete (no API key): ${session_file}" >&2
    else
        echo "[memoria] Session ended without saving (no API key): ${session_file}" >&2
    fi
    exit 0
fi

model=$(jq -r '.model // "gpt-5-mini"' "$config_file" 2>/dev/null || echo "gpt-5-mini")

# Check transcript exists
if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
    echo "[memoria] No transcript found, cannot auto-save" >&2
    exit 0
fi

echo "[memoria] Auto-saving session with OpenAI API..." >&2

# Read transcript (JSONL format) - extract user messages, assistant text, and tool usage
transcript_content=$(cat "$transcript_path" | jq -r '
  select(.type == "user" or .type == "assistant") |
  if .type == "user" then
    if (.message.content | type) == "string" then
      "User: " + .message.content
    else
      empty
    end
  elif .type == "assistant" then
    .message.content[]? |
    if .type == "text" then
      "Assistant: " + .text
    elif .type == "tool_use" then
      "Tool: " + .name + (if .input.file_path then " - " + .input.file_path elif .input.command then " - " + (.input.command | split("\n")[0]) else "" end)
    else
      empty
    end
  else
    empty
  end
' 2>/dev/null)

if [ -z "$transcript_content" ]; then
    echo "[memoria] Empty transcript, skipping auto-save" >&2
    exit 0
fi

# Get existing data from session file (new structure)
existing_summary=$(jq -c '.summary // {}' "$session_file" 2>/dev/null || echo "{}")
existing_files=$(jq -c '.files // []' "$session_file" 2>/dev/null || echo "[]")
existing_decisions=$(jq -c '.decisions // []' "$session_file" 2>/dev/null || echo "[]")
existing_errors=$(jq -c '.errors // []' "$session_file" 2>/dev/null || echo "[]")
existing_tags=$(jq -c '.tags // []' "$session_file" 2>/dev/null || echo "[]")
existing_session_type=$(jq -r '.sessionType // ""' "$session_file" 2>/dev/null || echo "")

# Calculate next IDs
next_dec_id=$(($(echo "$existing_decisions" | jq 'length') + 1))
next_err_id=$(($(echo "$existing_errors" | jq 'length') + 1))

# Prepare prompt for summarization (analysis-friendly structure)
if [ "$files_count" -gt 0 ]; then
    # Append mode: generate only NEW data
    prompt="This is a RESUMED Claude Code session. There is existing data that should NOT be regenerated.

EXISTING DATA (DO NOT MODIFY):
- summary: ${existing_summary}
- files: ${existing_files}
- decisions: ${existing_decisions}
- errors: ${existing_errors}
- tags: ${existing_tags}
- sessionType: \"${existing_session_type}\"

Generate ONLY the NEW data from this transcript that is NOT already covered.
Start decision IDs from dec-$(printf "%03d" $next_dec_id).
Start error IDs from err-$(printf "%03d" $next_err_id).

Return JSON with:
1. summary: { title, goal, outcome, description } - keep existing if good, or improve
2. newFiles: Array of ONLY NEW file changes (not in existing)
3. newDecisions: Array of ONLY NEW decisions (not in existing)
4. newErrors: Array of ONLY NEW errors (not in existing)
5. newWebLinks: Array of ONLY NEW URLs referenced
6. newTags: Array of ONLY NEW relevant tags
7. sessionType: Keep existing or update

Return ONLY valid JSON, no markdown or explanation.

Transcript:
${transcript_content}"
else
    # New session: generate all data
    prompt="Summarize this Claude Code session as JSON with analysis-friendly structure. Extract:

1. summary: {
   title: Brief title (max 50 chars),
   goal: What the user wanted to accomplish,
   outcome: \"success\" | \"partial\" | \"abandoned\",
   description: Brief summary (1-2 sentences)
}

2. files: Array of file changes, each with:
   - path: file path
   - action: \"create\" | \"edit\" | \"delete\"
   - summary: what was changed

3. decisions: Array of technical decisions, each with:
   - id: dec-001, dec-002, etc.
   - topic: decision topic
   - choice: what was chosen
   - alternatives: array of other options considered
   - reasoning: why this choice
   - timestamp: ISO8601

4. errors: Array of errors encountered, each with:
   - id: err-001, err-002, etc.
   - message: error message
   - type: \"runtime\" | \"build\" | \"lint\" | \"test\" | \"other\"
   - file: related file (if any)
   - resolved: true/false
   - solution: how it was fixed (if resolved)
   - timestamp: ISO8601

5. webLinks: Array of URLs referenced
6. tags: Array of relevant tags
7. sessionType: One of: decision, implementation, research, exploration, discussion, debug, review

Return ONLY valid JSON, no markdown or explanation.

Transcript:
${transcript_content}"
fi

# Call OpenAI API
response=$(curl -s -X POST "https://api.openai.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${api_key}" \
  -d "$(jq -n \
    --arg model "$model" \
    --arg prompt "$prompt" \
    '{
      model: $model,
      messages: [
        {role: "system", content: "You are a session summarizer. Return only valid JSON with analysis-friendly structure. When given existing data, generate ONLY new items not already covered."},
        {role: "user", content: $prompt}
      ],
      temperature: 0.3,
      max_tokens: 10000
    }')" 2>/dev/null)

# Extract content from response
summary=$(echo "$response" | jq -r '.choices[0].message.content // empty' 2>/dev/null)

if [ -z "$summary" ]; then
    echo "[memoria] API call failed or empty response" >&2
    # Still mark as complete if has content
    if [ -n "$title" ] && [ "$files_count" -gt 0 ]; then
        now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        jq --arg status "complete" --arg endedAt "$now" --arg updatedAt "$now" '
            .status = $status | .endedAt = $endedAt | .updatedAt = $updatedAt
        ' "$session_file" > "${session_file}.tmp" && mv "${session_file}.tmp" "$session_file"
    fi
    exit 0
fi

# Parse and validate JSON
if ! echo "$summary" | jq -e . >/dev/null 2>&1; then
    # Try to extract JSON from markdown code block
    summary=$(echo "$summary" | sed -n '/^```json/,/^```$/p' | sed '1d;$d')
    if ! echo "$summary" | jq -e . >/dev/null 2>&1; then
        echo "[memoria] Invalid JSON response from API" >&2
        exit 0
    fi
fi

# Update session file with summary (analysis-friendly structure)
now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ "$files_count" -gt 0 ]; then
    # Append mode: merge existing data with new data
    jq --argjson summary "$summary" \
       --argjson existingFiles "$existing_files" \
       --argjson existingDecisions "$existing_decisions" \
       --argjson existingErrors "$existing_errors" \
       --arg status "complete" --arg endedAt "$now" --arg updatedAt "$now" '
      .summary = (if ($summary.summary.title // "") != "" then $summary.summary else .summary end) |
      .files = ($existingFiles + ($summary.newFiles // [])) |
      .decisions = ($existingDecisions + ($summary.newDecisions // [])) |
      .errors = ($existingErrors + ($summary.newErrors // [])) |
      .webLinks = ((.webLinks // []) + ($summary.newWebLinks // []) | unique) |
      .tags = ((.tags // []) + ($summary.newTags // []) | unique) |
      .sessionType = (if ($summary.sessionType // "") != "" then $summary.sessionType else .sessionType end) |
      .status = $status |
      .endedAt = $endedAt |
      .updatedAt = $updatedAt |
      .metrics.filesCreated = ([.files[] | select(.action == "create")] | length) |
      .metrics.filesModified = ([.files[] | select(.action == "edit")] | length) |
      .metrics.filesDeleted = ([.files[] | select(.action == "delete")] | length) |
      .metrics.decisionsCount = (.decisions | length) |
      .metrics.errorsEncountered = (.errors | length) |
      .metrics.errorsResolved = ([.errors[] | select(.resolved == true)] | length)
    ' "$session_file" > "${session_file}.tmp" && mv "${session_file}.tmp" "$session_file"
else
    # New session: use all generated data
    jq --argjson summary "$summary" --arg status "complete" --arg endedAt "$now" --arg updatedAt "$now" '
      .summary = ($summary.summary // .summary) |
      .files = ($summary.files // .files) |
      .decisions = ($summary.decisions // .decisions) |
      .errors = ($summary.errors // .errors) |
      .webLinks = ($summary.webLinks // .webLinks) |
      .tags = ($summary.tags // .tags) |
      .sessionType = ($summary.sessionType // .sessionType) |
      .status = $status |
      .endedAt = $endedAt |
      .updatedAt = $updatedAt |
      .metrics.filesCreated = ([.files[] | select(.action == "create")] | length) |
      .metrics.filesModified = ([.files[] | select(.action == "edit")] | length) |
      .metrics.filesDeleted = ([.files[] | select(.action == "delete")] | length) |
      .metrics.decisionsCount = (.decisions | length) |
      .metrics.errorsEncountered = (.errors | length) |
      .metrics.errorsResolved = ([.errors[] | select(.resolved == true)] | length)
    ' "$session_file" > "${session_file}.tmp" && mv "${session_file}.tmp" "$session_file"
fi

echo "[memoria] Session auto-saved: ${session_file}" >&2
exit 0
