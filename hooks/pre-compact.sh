#!/usr/bin/env bash
#
# pre-compact.sh - PreCompact hook for memoria plugin
#
# Triggered before auto-compact. If session JSON is empty (template state),
# uses OpenAI API to summarize transcript and save as draft.
#
# Input (stdin): JSON with session_id, transcript_path, cwd, trigger
# Output: JSON with continue (boolean)
#
# Requires: ~/.claude/memoria.json with openai_api_key

set -euo pipefail

# Read stdin
input_json=$(cat)

# Extract fields
session_id=$(echo "$input_json" | jq -r '.session_id // empty')
transcript_path=$(echo "$input_json" | jq -r '.transcript_path // empty')
cwd=$(echo "$input_json" | jq -r '.cwd // empty')
trigger=$(echo "$input_json" | jq -r '.trigger // "auto"')

# Only process auto-trigger
if [ "$trigger" != "auto" ]; then
  echo '{"continue": true}'
  exit 0
fi

# If no cwd, use PWD
if [ -z "$cwd" ]; then
  cwd="${PWD}"
fi

# Find session file
if [ -z "$session_id" ]; then
  echo '{"continue": true}'
  exit 0
fi

session_short_id="${session_id:0:8}"
memoria_dir="${cwd}/.memoria"
sessions_dir="${memoria_dir}/sessions"

# Find session file (new format first, then old format for backwards compatibility)
session_file=$(find "$sessions_dir" -name "${session_short_id}.json" -type f 2>/dev/null | head -1)
if [ -z "$session_file" ]; then
  session_file=$(find "$sessions_dir" -name "*_${session_short_id}.json" -type f 2>/dev/null | head -1)
fi

if [ -z "$session_file" ] || [ ! -f "$session_file" ]; then
  echo '{"continue": true}'
  exit 0
fi

# Check if session needs saving (template state)
title=$(jq -r '.summary.title // ""' "$session_file")
files_count=$(jq -r '.files | length' "$session_file")
status=$(jq -r '.status // "null"' "$session_file")

# Skip if already saved
if [ "$status" = "complete" ] || [ "$status" = "draft" ]; then
  echo '{"continue": true}'
  exit 0
fi

# Skip if already has content
if [ -n "$title" ] && [ "$files_count" -gt 0 ]; then
  echo '{"continue": true}'
  exit 0
fi

# Check for API key in ~/.claude/memoria.json
config_file="${HOME}/.claude/memoria.json"
if [ ! -f "$config_file" ]; then
  echo "[memoria] No config file found at ${config_file}, skipping auto-save" >&2
  echo '{"continue": true}'
  exit 0
fi

api_key=$(jq -r '.openai_api_key // empty' "$config_file")
if [ -z "$api_key" ]; then
  echo "[memoria] No openai_api_key in config, skipping auto-save" >&2
  echo '{"continue": true}'
  exit 0
fi

model=$(jq -r '.model // "gpt-5-mini"' "$config_file")

# Check transcript exists
if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
  echo "[memoria] No transcript found, skipping auto-save" >&2
  echo '{"continue": true}'
  exit 0
fi

# Run summarization in background (don't block compaction)
(
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
    echo "[memoria] Empty transcript, skipping" >&2
    exit 0
  fi

  # Get git branch
  branch=$(jq -r '.context.branch // ""' "$session_file")

  # Prepare prompt for summarization (analysis-friendly structure)
  prompt="Summarize this Claude Code session as JSON with analysis-friendly structure. Extract:

1. summary: {
   title: Brief title (max 50 chars),
   goal: What the user wanted to accomplish,
   outcome: \"success\" | \"partial\" | \"abandoned\",
   description: Brief summary (1-2 sentences)
}

2. metrics: {
   durationMinutes: estimated session duration,
   filesCreated: count,
   filesModified: count,
   filesDeleted: count,
   decisionsCount: count,
   errorsEncountered: count,
   errorsResolved: count
}

3. files: Array of file changes, each with:
   - path: file path
   - action: \"create\" | \"edit\" | \"delete\"
   - summary: what was changed

4. decisions: Array of technical decisions, each with:
   - id: dec-001, dec-002, etc.
   - topic: decision topic
   - choice: what was chosen
   - alternatives: array of other options considered
   - reasoning: why this choice
   - timestamp: ISO8601

5. errors: Array of errors encountered, each with:
   - id: err-001, err-002, etc.
   - message: error message
   - type: \"runtime\" | \"build\" | \"lint\" | \"test\" | \"other\"
   - file: related file (if any)
   - resolved: true/false
   - solution: how it was fixed (if resolved)
   - timestamp: ISO8601

6. webLinks: Array of URLs referenced
7. tags: Array of relevant tags (e.g., frontend, backend, auth)
8. sessionType: One of: decision, implementation, research, exploration, discussion, debug, review

Return ONLY valid JSON, no markdown or explanation.

Transcript:
${transcript_content}"

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
          {role: "system", content: "You are a session summarizer. Return only valid JSON."},
          {role: "user", content: $prompt}
        ],
        temperature: 0.3,
        max_tokens: 10000
      }')" 2>/dev/null)

  # Extract content from response
  summary=$(echo "$response" | jq -r '.choices[0].message.content // empty' 2>/dev/null)

  if [ -z "$summary" ]; then
    echo "[memoria] API call failed or empty response" >&2
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

  jq --argjson summary "$summary" --arg status "draft" --arg updatedAt "$now" '
    .summary = ($summary.summary // .summary) |
    .metrics = ($summary.metrics // .metrics) |
    .files = ($summary.files // .files) |
    .decisions = ($summary.decisions // .decisions) |
    .errors = ($summary.errors // .errors) |
    .webLinks = ($summary.webLinks // .webLinks) |
    .tags = ($summary.tags // .tags) |
    .sessionType = ($summary.sessionType // .sessionType) |
    .status = $status |
    .updatedAt = $updatedAt
  ' "$session_file" > "${session_file}.tmp" && mv "${session_file}.tmp" "$session_file"

  echo "[memoria] Session saved as draft: ${session_file}" >&2

) &

# Return immediately (don't block compaction)
echo '{"continue": true}'
