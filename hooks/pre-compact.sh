#!/usr/bin/env bash
#
# pre-compact.sh - Auto-save before Auto-Compact using Claude Code LLM
#
# This is the LAST CHANCE to save information before Auto-Compact.
# Blocks compaction and instructs Claude Code LLM to save the session with full context.
#
# Input (stdin): JSON with session_id, transcript_path, cwd, trigger
# Output: JSON with decision to block and reason (instruction for Claude)

set -euo pipefail

# Read stdin
input_json=$(cat)

# Extract fields
session_id=$(echo "$input_json" | jq -r '.session_id // empty')
transcript_path=$(echo "$input_json" | jq -r '.transcript_path // empty')
cwd=$(echo "$input_json" | jq -r '.cwd // empty')

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

session_file=$(find "$sessions_dir" -name "${session_short_id}.json" -type f 2>/dev/null | head -1)

if [ -z "$session_file" ] || [ ! -f "$session_file" ]; then
    echo '{"continue": true}'
    exit 0
fi

# Check transcript exists
if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
    echo "[memoria] No transcript found at PreCompact" >&2
    echo '{"continue": true}'
    exit 0
fi

# Get relative path for cleaner output
session_relative="${session_file#$cwd/}"

echo "[memoria] PreCompact: Triggering Claude Code LLM to save session before Auto-Compact..." >&2

# Build the instruction for Claude to save the session
instruction="[MEMORIA AUTO-SAVE] Auto-Compact detected. Save session NOW before context is lost.

**Transcript file (read this to extract thinking):** ${transcript_path}
**Session file to update:** ${session_relative}

## CRITICAL: Avoid Duplicates

1. **First, read the existing session file** to check:
   - Last interaction's timestamp (if any)
   - Already saved content

2. **Only add NEW interactions** since the last saved timestamp
   - If interactions array is empty, save everything
   - If interactions exist, only add content AFTER the last timestamp
   - Skip any content that appears to already be saved

## Instructions

1. **Read the transcript file** (JSONL format) to find:
   - Your thinking blocks (type: \"thinking\")
   - User messages (type: \"user\")
   - Your responses (type: \"assistant\")
   - Tool usage

2. **Add to 'interactions' array** (only new ones!) with this structure:
   \`\`\`json
   {
     \"id\": \"int-NNN\",
     \"timestamp\": \"ISO8601\",
     \"topic\": \"What this interaction was about (for search)\",
     \"request\": \"User's original request/question\",
     \"thinking\": \"Key insights from your thinking process\",
     \"response\": \"Summary of your response\",
     \"choice\": \"What was decided/chosen (if any)\",
     \"reasoning\": \"Why this approach was taken\",
     \"toolsUsed\": [{\"name\": \"...\", \"target\": \"...\"}],
     \"filesModified\": [\"...\"]
   }
   \`\`\`

3. **Update 'summary'**: title, goal, outcome, description

4. **Update 'metrics'**: filesCreated, filesModified, decisionsCount, etc.

5. **Update 'decisions' array** if any NEW technical decisions were made

6. **Update 'errors' array** if any NEW errors were encountered/resolved

7. **Update 'tags'** and 'sessionType' if needed

After updating, just continue. No confirmation needed."

# Escape the instruction for JSON
escaped_instruction=$(echo "$instruction" | jq -Rs '.')

# Block compaction and instruct Claude to save
cat <<EOF
{
  "decision": "block",
  "reason": ${escaped_instruction}
}
EOF
