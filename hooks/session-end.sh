#!/usr/bin/env bash
#
# session-end.sh - SessionEnd hook for memoria plugin
#
# Auto-save session by extracting interactions from transcript using jq.
# This ensures all thinking, user messages, and responses are preserved
# without relying on Claude to update the session file.
#
# IMPORTANT: This script merges preCompactBackups with newly extracted interactions
# to preserve conversations from before auto-compact events.
#
# Input (stdin): JSON with session_id, transcript_path, cwd
# Output (stderr): Log messages
# Exit codes: 0 = success (SessionEnd cannot be blocked)
#
# Dependencies: jq

set -euo pipefail

# Read input from stdin
input_json=$(cat)

# Extract fields
session_id=$(echo "$input_json" | jq -r '.session_id // empty' 2>/dev/null || echo "")
transcript_path=$(echo "$input_json" | jq -r '.transcript_path // empty' 2>/dev/null || echo "")
cwd=$(echo "$input_json" | jq -r '.cwd // empty' 2>/dev/null || echo "")

if [ -z "$session_id" ]; then
    exit 0
fi

# Use cwd from input or fallback to PWD
if [ -z "$cwd" ]; then
    cwd="${PWD}"
fi

# Resolve paths
cwd=$(cd "$cwd" 2>/dev/null && pwd || echo "$cwd")
sessions_dir="${cwd}/.memoria/sessions"

# Find session file
session_short_id="${session_id:0:8}"
session_file=""

if [ -d "$sessions_dir" ]; then
    session_file=$(find "$sessions_dir" -type f -name "${session_short_id}.json" 2>/dev/null | head -1)
fi

if [ -z "$session_file" ] || [ ! -f "$session_file" ]; then
    exit 0
fi

# Extract interactions from transcript if available
if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
    # Extract interactions using jq
    interactions_json=$(cat "$transcript_path" | jq -s '
        # User messages (text only, exclude tool results and local command outputs)
        # Include isCompactSummary flag for auto-compact summaries
        [.[] | select(
            .type == "user" and
            .message.role == "user" and
            (.message.content | type) == "string" and
            (.message.content | startswith("<local-command-stdout>") | not) and
            (.message.content | startswith("<local-command-caveat>") | not)
        ) | {
            timestamp: .timestamp,
            content: .message.content,
            isCompactSummary: (.isCompactSummary // false)
        }] as $user_messages |

        # Get user message timestamps for grouping
        ($user_messages | map(.timestamp)) as $user_timestamps |

        # All assistant messages with thinking or text
        [.[] | select(.type == "assistant") | . as $msg |
            ($msg.message.content // []) |
            {
                timestamp: $msg.timestamp,
                thinking: ([.[] | select(.type == "thinking") | .thinking] | join("\n")),
                text: ([.[] | select(.type == "text") | .text] | join("\n"))
            } | select(.thinking != "" or .text != "")
        ] as $all_assistant |

        # Tool usage summary
        [.[] | select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | .name] |
        group_by(.) | map({name: .[0], count: length}) | sort_by(-.count) as $tool_usage |

        # Build interactions by grouping all assistant responses between user messages
        [range(0; $user_messages | length) | . as $i |
            $user_messages[$i] as $user |
            # Get next user message timestamp (or far future if last)
            (if $i + 1 < ($user_messages | length) then $user_messages[$i + 1].timestamp else "9999-12-31T23:59:59Z" end) as $next_user_ts |
            # Collect all assistant responses between this user message and next
            [$all_assistant[] | select(.timestamp > $user.timestamp and .timestamp < $next_user_ts)] as $turn_responses |
            if ($turn_responses | length) > 0 then (
                {
                    id: ("int-" + (($i + 1) | tostring | if length < 3 then "00"[0:(3-length)] + . else . end)),
                    timestamp: $user.timestamp,
                    user: $user.content,
                    thinking: ([$turn_responses[].thinking | select(. != "")] | join("\n")),
                    assistant: ([$turn_responses[].text | select(. != "")] | join("\n"))
                } + (if $user.isCompactSummary then {isCompactSummary: true} else {} end)
            ) else empty end
        ] as $interactions |

        # File changes from tool usage
        [.[] | select(.type == "assistant") | .message.content[]? |
            select(.type == "tool_use" and (.name == "Edit" or .name == "Write")) |
            {
                path: .input.file_path,
                action: (if .name == "Write" then "create" else "edit" end)
            }
        ] | unique_by(.path) as $files |

        {
            interactions: $interactions,
            toolUsage: $tool_usage,
            files: $files,
            metrics: {
                userMessages: ($user_messages | length),
                assistantResponses: ($all_assistant | length),
                thinkingBlocks: ([$all_assistant[].thinking | select(. != "")] | length)
            }
        }
    ' 2>/dev/null || echo '{"interactions":[],"toolUsage":[],"files":[],"metrics":{}}')

    # Update session file with extracted data, merging with existing data
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Read existing data to merge: use the most complete source
    # Priority: preCompactBackups (if exists) > existing .interactions > empty
    existing_backup=$(jq -r '
        # Get preCompactBackups last entry (most complete)
        (if (.preCompactBackups | length) > 0 then
            .preCompactBackups[-1].interactions
        else
            []
        end) as $backup |

        # Get existing interactions
        (.interactions // []) as $existing |

        # Use whichever has more entries or later timestamps
        if ($backup | length) > ($existing | length) then
            $backup
        elif ($backup | length) < ($existing | length) then
            $existing
        elif ($backup | length) > 0 and ($existing | length) > 0 then
            # Same length: compare last timestamp
            (($backup | last | .timestamp) // "1970-01-01") as $backup_ts |
            (($existing | last | .timestamp) // "1970-01-01") as $existing_ts |
            if $backup_ts > $existing_ts then $backup else $existing end
        else
            $existing
        end
    ' "$session_file" 2>/dev/null || echo '[]')

    jq --argjson extracted "$interactions_json" \
       --argjson backup "$existing_backup" \
       --arg status "complete" \
       --arg endedAt "$now" \
       --arg updatedAt "$now" '
        # Merge preCompactBackups with extracted interactions
        # Strategy: Use backup as base, add NEW interactions from extracted
        # that have timestamps after the last backup interaction
        ($backup | if type == "array" then . else [] end) as $backup_arr |
        ($extracted.interactions // []) as $new_arr |

        # Get the last timestamp from backup (or epoch if empty)
        ($backup_arr | if length > 0 then .[-1].timestamp else "1970-01-01T00:00:00Z" end) as $last_backup_ts |

        # Filter new interactions that are after backup
        [$new_arr[] | select(.timestamp > $last_backup_ts)] as $truly_new |

        # Merge: backup + truly new interactions
        ($backup_arr + $truly_new) as $merged |

        # Re-number IDs sequentially
        [$merged | to_entries[] | .value + {id: ("int-" + ((.key + 1) | tostring | if length < 3 then "00"[0:(3-length)] + . else . end))}] as $final_interactions |

        # Apply updates
        .interactions = $final_interactions |
        # Update files
        .files = ((.files // []) + ($extracted.files // []) | unique_by(.path)) |
        # Update metrics (recalculate from merged interactions)
        .metrics = (.metrics // {}) + {
            userMessages: ($final_interactions | length),
            assistantResponses: ($final_interactions | length),
            thinkingBlocks: ([$final_interactions[].thinking | select(. != "" and . != null)] | length),
            toolUsage: ($extracted.toolUsage // [])
        } |
        # Clear preCompactBackups (merged into interactions)
        .preCompactBackups = [] |
        # Set status and timestamps
        .status = $status |
        .endedAt = $endedAt |
        .updatedAt = $updatedAt
    ' "$session_file" > "${session_file}.tmp" && mv "${session_file}.tmp" "$session_file"

    # Report merged count
    merged_count=$(jq '.interactions | length' "$session_file")
    backup_count=$(echo "$existing_backup" | jq 'if type == "array" then length else 0 end')
    echo "[memoria] Session auto-saved with ${merged_count} interactions (${backup_count} from backup): ${session_file}" >&2
else
    # No transcript, just update status
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    jq --arg status "complete" --arg endedAt "$now" --arg updatedAt "$now" '
        .status = $status | .endedAt = $endedAt | .updatedAt = $updatedAt
    ' "$session_file" > "${session_file}.tmp" && mv "${session_file}.tmp" "$session_file"

    echo "[memoria] Session completed (no transcript): ${session_file}" >&2
fi

exit 0
