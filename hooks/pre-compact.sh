#!/usr/bin/env bash
# PreCompact hook for memoria plugin
# Saves a partial session before context compaction

set -euo pipefail

# Check for jq
if ! command -v jq &> /dev/null; then
    echo '{"error": "jq is required for session saving. Install with: brew install jq"}' >&2
    exit 0
fi

# Read input from stdin
input_json=$(cat)

# Extract fields from input
transcript_path=$(echo "$input_json" | jq -r '.transcript_path // empty')
session_id=$(echo "$input_json" | jq -r '.session_id // empty')
trigger=$(echo "$input_json" | jq -r '.trigger // "manual"')
cwd=$(echo "$input_json" | jq -r '.cwd // empty')

# Validate required fields
if [ -z "$transcript_path" ] || [ -z "$session_id" ]; then
    exit 0
fi

# Use cwd from input or fallback to PWD
if [ -z "$cwd" ]; then
    cwd="${PWD}"
fi

# Resolve paths
cwd=$(cd "$cwd" 2>/dev/null && pwd || echo "$cwd")
memoria_dir="${cwd}/.memoria"

# Get current git branch
current_branch=""
if git -C "$cwd" rev-parse --git-dir &> /dev/null 2>&1; then
    current_branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
fi

# Current timestamp
now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
date_part=$(echo "$now" | cut -d'T' -f1)
year_part=$(echo "$date_part" | cut -d'-' -f1)
month_part=$(echo "$date_part" | cut -d'-' -f2)
session_short_id="${session_id:0:8}"
file_id="${date_part}_${session_short_id}"

# Create sessions directory (year/month) if not exists
sessions_dir="${memoria_dir}/sessions/${year_part}/${month_part}"
mkdir -p "$sessions_dir"

# Check if transcript file exists
if [ ! -f "$transcript_path" ]; then
    exit 0
fi

# Parse transcript and extract messages
# JSONL format: each line is a JSON object with type "user" or "assistant"
messages=$(jq -s '
    def content_text:
        if .message.content | type == "string" then
            .message.content
        elif .message.content | type == "array" then
            [.message.content[] | select(.type == "text") | .text] | join("")
        else
            ""
        end;
    def thinking_text:
        if .message.content | type == "array" then
            [.message.content[] | select(.type == "thinking") | .thinking] | join("")
        else
            ""
        end;
    def is_noise($content):
        ($content | test("<(local-command-|command-name|command-message|command-args)"; "i"));

    [.[] |
        select((.type == "user" or .type == "assistant") and .message != null) |
        .content = content_text |
        .thinking = thinking_text |
        {
            type: .type,
            timestamp: (.timestamp // now | tostring),
            content: (.content | if . == "" then null else . end),
            thinking: (.thinking | if . == "" then null else . end)
        } |
        select((.content // "") != "" or (.thinking // "") != "") |
        select(((.content // "") | is_noise(.) | not)) |
        with_entries(select(.value != null))
    ]
' "$transcript_path" 2>/dev/null || echo "[]")

# Check if we have messages
message_count=$(echo "$messages" | jq 'length')
if [ "$message_count" -eq 0 ]; then
    exit 0
fi

user_message_count=$(echo "$messages" | jq '[.[] | select(.type == "user")] | length')
assistant_message_count=$(echo "$messages" | jq '[.[] | select(.type == "assistant")] | length')
tool_use_count=$(jq -s '[.[] | select(.type == "tool_result")] | length' "$transcript_path" 2>/dev/null || echo "0")

# Extract files modified from tool results
files_modified=$(jq -s '
    [.[] | select(.type == "tool_result" and .input.file_path != null) |
    {
        path: .input.file_path,
        action: (
            if .tool == "Write" then "created"
            elif .tool == "Edit" then "modified"
            elif .tool == "Delete" then "deleted"
            else "modified"
            end
        )
    }] | unique_by(.path)
' "$transcript_path" 2>/dev/null || echo "[]")

# Extract explicit user requests
user_requests=$(echo "$messages" | jq -c '
    def normalize: gsub("\\s+"; " ") | gsub("^\\s+|\\s+$"; "");
    def is_request:
        test("してほしい|して欲しい|にしてほしい|にして欲しい|してください|でお願いします|やって|やってください|対応して|使って|利用して|採用|にする|にして|方針|必須|前提|禁止|変更して|追加して|削除して"; "i");

    [
        .[] |
        select(.type == "user" and (.content // "") != "") |
        (.content | normalize) |
        select(length > 0) |
        select(is_request)
    ] | unique
')

# Summary title from explicit request or first user message
summary_title=$(echo "$messages" | jq -r '
    def normalize: gsub("\\s+"; " ") | gsub("^\\s+|\\s+$"; "");
    def is_request:
        test("してほしい|して欲しい|にしてほしい|にして欲しい|してください|でお願いします|やって|やってください|対応して|使って|利用して|採用|にする|にして|方針|必須|前提|禁止|変更して|追加して|削除して"; "i");
    def clip($s): if ($s | length) > 80 then ($s[0:80] + "...") else $s end;

    def first_request:
        [ .[] | select(.type == "user" and (.content // "") != "") | (.content | normalize) | select(is_request) ][0];
    def first_user:
        [ .[] | select(.type == "user" and (.content // "") != "") | (.content | normalize) ][0];

    (first_request // first_user // "Session in progress") | clip(.)
')

# Assistant actions from tool results
assistant_actions_from_tools=$(jq -s -c '
    def normalize: gsub("\\s+"; " ") | gsub("^\\s+|\\s+$"; "");

    [
        .[] |
        select(.type == "tool_result") |
        (
            if (.tool == "Write" or .tool == "Edit" or .tool == "Delete") then
                "\(.tool): \(.input.file_path // "")"
            elif (.tool | type == "string") and (.tool | length > 0) then
                if (.input.command? and (.input.command | type == "string")) then
                    "\(.tool): \(.input.command)"
                elif (.input.file_path? and (.input.file_path | type == "string")) then
                    "\(.tool): \(.input.file_path)"
                else
                    "\(.tool)"
                end
            else
                empty
            end
        )
    ] | map(normalize) | map(select(length > 0)) | unique
' "$transcript_path" 2>/dev/null || echo "[]")

# Assistant actions from assistant messages
assistant_actions_from_messages=$(echo "$messages" | jq -c '
    def normalize: gsub("\\s+"; " ") | gsub("^\\s+|\\s+$"; "");
    def is_action:
        test("修正|変更|追加|削除|更新|実装|対応|改善|整理|移行|統一|調整|作成|対応済み|修正済み|更新済み|fix|fixed|update|updated|add|added|remove|removed|refactor|refactored|improve|improved"; "i");
    [
        .[] |
        select(.type == "assistant") |
        (.content // "") |
        split("\n")[] |
        normalize |
        select(length > 4) |
        select(is_action)
    ] | unique
')

assistant_actions=$(jq -c -n --argjson a "$assistant_actions_from_tools" --argjson b "$assistant_actions_from_messages" '$a + $b | unique')

# Web links from assistant messages and tool results
links_from_messages=$(echo "$messages" | jq -c '
    def extract_links($text):
        ($text | scan("https?://[^\\s)\\]}>]+"));
    reduce [
        .[] |
        select(.type == "assistant") |
        [(.content // ""), (.thinking // "")] |
        map(extract_links(.))
    ][] as $links ([]; . + $links)
    | unique
')

links_from_tools=$(jq -s -c '
    def extract_links($text):
        ($text | scan("https?://[^\\s)\\]}>]+"));
    reduce [
        .[] |
        select(.type == "tool_result") |
        [(.output // ""), (.content // "")] |
        map(extract_links(.))
    ][] as $links ([]; . + $links)
    | unique
' "$transcript_path" 2>/dev/null || echo "[]")

web_links=$(jq -c -n --argjson a "$links_from_messages" --argjson b "$links_from_tools" '$a + $b | unique')

# Extract tags from message content
tags=$(echo "$messages" | jq -r '
    [.[] | .content // ""] | join(" ") | ascii_downcase |
    (
        (if test("auth") then ["auth"] else [] end) +
        (if test("api") then ["api"] else [] end) +
        (if test("ui|component|react") then ["ui"] else [] end) +
        (if test("test") then ["test"] else [] end) +
        (if test("bug|fix") then ["bug"] else [] end) +
        (if test("feature") then ["feature"] else [] end) +
        (if test("refactor") then ["refactor"] else [] end) +
        (if test("doc") then ["docs"] else [] end) +
        (if test("config") then ["config"] else [] end) +
        (if test("db|database") then ["db"] else [] end)
    ) | .[0:3]
')

files_modified_paths=$(echo "$files_modified" | jq -c '[.[] | .path]')

# Build partial session JSON
session_json=$(jq -n \
    --arg id "$file_id" \
    --arg sessionId "$session_id" \
    --arg createdAt "$now" \
    --arg branch "$current_branch" \
    --arg projectDir "$cwd" \
    --argjson tags "$tags" \
    --arg summaryTitle "$summary_title" \
    --argjson userRequests "$user_requests" \
    --argjson assistantActions "$assistant_actions" \
    --argjson webLinks "$web_links" \
    --argjson filesModifiedPaths "$files_modified_paths" \
    --argjson keyDecisions "[]" \
    --argjson messageCount "$message_count" \
    --argjson userMessageCount "$user_message_count" \
    --argjson assistantMessageCount "$assistant_message_count" \
    --argjson toolUseCount "$tool_use_count" \
    --argjson messages "$messages" \
    --argjson filesModified "$files_modified" \
    --arg compactedAt "$now" \
    --arg compactTrigger "$trigger" \
    '{
        id: $id,
        sessionId: $sessionId,
        createdAt: $createdAt,
        status: "in_progress",
        context: {
            branch: (if $branch == "" then null else $branch end),
            projectDir: $projectDir
        } | with_entries(select(.value != null)),
        tags: $tags,
        summary: {
            title: $summaryTitle,
            userRequests: $userRequests,
            assistantActions: $assistantActions,
            webLinks: $webLinks,
            filesModified: $filesModifiedPaths,
            keyDecisions: $keyDecisions,
            stats: {
                messageCount: $messageCount,
                userMessageCount: $userMessageCount,
                assistantMessageCount: $assistantMessageCount,
                toolUseCount: $toolUseCount
            }
        },
        messages: $messages,
        filesModified: $filesModified,
        compactedAt: $compactedAt,
        compactTrigger: $compactTrigger
    }')

# Save session
session_path="${sessions_dir}/${file_id}.json"
echo "$session_json" > "$session_path"

# Log to stderr
echo "[memoria] Partial session saved to ${session_path}" >&2

exit 0
