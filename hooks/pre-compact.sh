#!/usr/bin/env bash
#
# pre-compact.sh - Backup interactions before Auto-Compact
#
# Saves current interactions to preCompactBackups before context is compressed.
# Does NOT create summary - summary creation is manual via /memoria:save.
#
# Input (stdin): JSON with session_id, transcript_path, cwd, trigger
# Output: JSON with decision to continue (non-blocking)

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

echo "[memoria] PreCompact: Backing up interactions before Auto-Compact..." >&2

# Extract current interactions from transcript (same logic as session-end.sh)
if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
    interactions_json=$(cat "$transcript_path" | jq -s '
        # User messages (text only, exclude tool results)
        [.[] | select(.type == "user" and .message.role == "user" and (.message.content | type) == "string") | {
            timestamp: .timestamp,
            content: .message.content
        }] as $user_messages |

        # All assistant messages with thinking or text
        [.[] | select(.type == "assistant") | . as $msg |
            ($msg.message.content // []) |
            {
                timestamp: $msg.timestamp,
                thinking: ([.[] | select(.type == "thinking") | .thinking] | join("\n")),
                text: ([.[] | select(.type == "text") | .text] | join("\n"))
            } | select(.thinking != "" or .text != "")
        ] as $all_assistant |

        # Build interactions by grouping all assistant responses between user messages
        [range(0; $user_messages | length) | . as $i |
            $user_messages[$i] as $user |
            # Get next user message timestamp (or far future if last)
            (if $i + 1 < ($user_messages | length) then $user_messages[$i + 1].timestamp else "9999-12-31T23:59:59Z" end) as $next_user_ts |
            # Collect all assistant responses between this user message and next
            [$all_assistant[] | select(.timestamp > $user.timestamp and .timestamp < $next_user_ts)] as $turn_responses |
            if ($turn_responses | length) > 0 then {
                id: ("int-" + (($i + 1) | tostring | if length < 3 then "00"[0:(3-length)] + . else . end)),
                timestamp: $user.timestamp,
                user: $user.content,
                thinking: ([$turn_responses[].thinking | select(. != "")] | join("\n")),
                assistant: ([$turn_responses[].text | select(. != "")] | join("\n"))
            } else empty end
        ]
    ' 2>/dev/null || echo '[]')

    # Create backup entry
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    backup_entry=$(jq -n \
        --arg timestamp "$now" \
        --argjson interactions "$interactions_json" \
        '{
            timestamp: $timestamp,
            interactions: $interactions
        }')

    # Add to preCompactBackups array
    jq --argjson backup "$backup_entry" \
       '.preCompactBackups = ((.preCompactBackups // []) + [$backup])' \
       "$session_file" > "${session_file}.tmp" && mv "${session_file}.tmp" "$session_file"

    interaction_count=$(echo "$interactions_json" | jq 'length')
    echo "[memoria] PreCompact: Backed up ${interaction_count} interactions to preCompactBackups" >&2
fi

# Continue with compaction (non-blocking)
echo '{"continue": true}'
