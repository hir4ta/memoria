#!/usr/bin/env bash
#
# pre-compact.sh - Create summary before Auto-Compact
#
# Blocks compaction and instructs Claude to create a session summary.
# Interactions are auto-saved by session-end.sh via jq, so this hook
# focuses only on summary creation which requires Claude's intelligence.
#
# Input (stdin): JSON with session_id, transcript_path, cwd, trigger
# Output: JSON with decision to block and reason (instruction for Claude)

set -euo pipefail

# Read stdin
input_json=$(cat)

# Extract fields
session_id=$(echo "$input_json" | jq -r '.session_id // empty')
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

# Get relative path for cleaner output
session_relative="${session_file#$cwd/}"

echo "[memoria] PreCompact: Creating session summary before Auto-Compact..." >&2

# Build the instruction for Claude to create summary
instruction="[MEMORIA PRE-COMPACT] Auto-Compact detected (context 95% full). Create session summary NOW.

**Session file:** ${session_relative}

## What to Do

Read the session file and update **summary** field with:

\`\`\`json
{
  \"summary\": {
    \"title\": \"Brief descriptive title (e.g., 'JWT authentication implementation')\",
    \"goal\": \"What was the main objective\",
    \"outcome\": \"success\" | \"partial\" | \"blocked\" | \"abandoned\",
    \"description\": \"2-3 sentence summary of what was accomplished\"
  }
}
\`\`\`

Also update if needed:
- **sessionType**: decision, implementation, research, exploration, discussion, debug, review
- **tags**: Relevant keywords from .memoria/tags.json

**Note:** Interactions are auto-saved by SessionEnd hook. Focus on summary only.

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
