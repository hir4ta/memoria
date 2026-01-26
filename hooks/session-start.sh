#!/usr/bin/env bash
# SessionStart hook for memoria plugin
# Initializes session JSON, creates .current-session, and injects context

set -euo pipefail

# Determine plugin root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Read using-memoria skill content
using_memoria_content=$(cat "${PLUGIN_ROOT}/skills/using-memoria/skill.md" 2>/dev/null || echo "")

# Read input from stdin
input_json=$(cat)

# Extract fields from input (requires jq)
if ! command -v jq &> /dev/null; then
    echo '{"error": "jq is required. Install with: brew install jq"}' >&2
    exit 0
fi

cwd=$(echo "$input_json" | jq -r '.cwd // empty' 2>/dev/null || echo "")
session_id=$(echo "$input_json" | jq -r '.session_id // empty' 2>/dev/null || echo "")

# If no cwd, use PWD
if [ -z "$cwd" ]; then
    cwd="${PWD}"
fi

# Resolve cwd to absolute path
cwd=$(cd "$cwd" 2>/dev/null && pwd || echo "$cwd")

# Find .memoria directory
memoria_dir="${cwd}/.memoria"
sessions_dir="${memoria_dir}/sessions"
rules_dir="${memoria_dir}/rules"

# Ensure directories exist
mkdir -p "$sessions_dir"
mkdir -p "$rules_dir"

# Current timestamp and date parts
now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
date_part=$(echo "$now" | cut -d'T' -f1)
year_part=$(echo "$date_part" | cut -d'-' -f1)
month_part=$(echo "$date_part" | cut -d'-' -f2)

# Generate session ID: YYYY-MM-DD_short-uuid
if [ -n "$session_id" ]; then
    session_short_id="${session_id:0:8}"
else
    session_short_id=$(uuidgen 2>/dev/null | tr '[:upper:]' '[:lower:]' | cut -c1-8 || date +%s | md5sum | cut -c1-8)
fi
file_id="${date_part}_${session_short_id}"

# Create sessions directory (year/month)
session_year_month_dir="${sessions_dir}/${year_part}/${month_part}"
mkdir -p "$session_year_month_dir"

# Get git info
current_branch=""
git_user_name="unknown"
git_user_email=""

if git -C "$cwd" rev-parse --git-dir &> /dev/null 2>&1; then
    current_branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    git_user_name=$(git -C "$cwd" config user.name 2>/dev/null || echo "unknown")
    git_user_email=$(git -C "$cwd" config user.email 2>/dev/null || echo "")
fi

# ============================================
# Initialize session JSON
# ============================================
session_path="${session_year_month_dir}/${file_id}.json"

session_json=$(jq -n \
    --arg id "$file_id" \
    --arg sessionId "${session_id:-$session_short_id}" \
    --arg createdAt "$now" \
    --arg branch "$current_branch" \
    --arg projectDir "$cwd" \
    --arg userName "$git_user_name" \
    --arg userEmail "$git_user_email" \
    '{
        id: $id,
        sessionId: $sessionId,
        createdAt: $createdAt,
        context: {
            branch: (if $branch == "" then null else $branch end),
            projectDir: $projectDir,
            user: {
                name: $userName,
                email: (if $userEmail == "" then null else $userEmail end)
            } | with_entries(select(.value != null))
        } | with_entries(select(.value != null)),
        title: "",
        goal: "",
        tags: [],
        interactions: []
    }')

echo "$session_json" > "$session_path"
echo "[memoria] Session initialized: ${session_path}" >&2

# ============================================
# Create .current-session file
# ============================================
current_session_path="${memoria_dir}/.current-session"
current_session_relative_path=".memoria/sessions/${year_part}/${month_part}/${file_id}.json"

jq -n \
    --arg id "$file_id" \
    --arg path "$current_session_relative_path" \
    '{
        id: $id,
        path: $path
    }' > "$current_session_path"

echo "[memoria] Current session file created: ${current_session_path}" >&2

# ============================================
# Initialize tags.json if not exists
# ============================================
tags_path="${memoria_dir}/tags.json"

if [ ! -f "$tags_path" ]; then
    cat > "$tags_path" << 'TAGS_EOF'
{
  "version": 1,
  "tags": [
    {"id": "frontend", "label": "Frontend", "aliases": ["front", "フロント", "client", "クライアント", "browser"], "category": "domain", "color": "#3B82F6"},
    {"id": "backend", "label": "Backend", "aliases": ["back", "バック", "server", "サーバー"], "category": "domain", "color": "#10B981"},
    {"id": "api", "label": "API", "aliases": ["rest", "graphql", "endpoint", "エンドポイント"], "category": "domain", "color": "#06B6D4"},
    {"id": "db", "label": "Database", "aliases": ["database", "sql", "query", "クエリ", "rdb", "nosql", "orm", "データベース"], "category": "domain", "color": "#8B5CF6"},
    {"id": "infra", "label": "Infrastructure", "aliases": ["infrastructure", "cloud", "クラウド", "aws", "gcp", "azure", "インフラ"], "category": "domain", "color": "#F97316"},
    {"id": "mobile", "label": "Mobile", "aliases": ["ios", "android", "react-native", "flutter", "アプリ", "モバイル"], "category": "domain", "color": "#A855F7"},
    {"id": "cli", "label": "CLI", "aliases": ["command-line", "terminal", "コマンドライン", "shell"], "category": "domain", "color": "#1F2937"},
    {"id": "feature", "label": "Feature", "aliases": ["new", "機能追加", "実装", "feat", "新機能"], "category": "phase", "color": "#22C55E"},
    {"id": "bugfix", "label": "Bug Fix", "aliases": ["bug", "fix", "バグ", "修正", "hotfix", "バグ修正"], "category": "phase", "color": "#EF4444"},
    {"id": "refactor", "label": "Refactoring", "aliases": ["refactoring", "cleanup", "整理", "改善", "リファクタリング"], "category": "phase", "color": "#6B7280"},
    {"id": "test", "label": "Test", "aliases": ["testing", "spec", "jest", "vitest", "e2e", "unit", "テスト"], "category": "phase", "color": "#EC4899"},
    {"id": "docs", "label": "Documentation", "aliases": ["documentation", "readme", "doc", "仕様書", "設計書", "ドキュメント"], "category": "phase", "color": "#64748B"},
    {"id": "config", "label": "Configuration", "aliases": ["configuration", "env", "環境", "settings", "dotfile", "設定"], "category": "phase", "color": "#A855F7"},
    {"id": "perf", "label": "Performance", "aliases": ["performance", "optimization", "最適化", "高速化", "チューニング", "パフォーマンス"], "category": "phase", "color": "#FBBF24"},
    {"id": "security", "label": "Security", "aliases": ["sec", "vulnerability", "脆弱性", "セキュア", "hardening", "セキュリティ"], "category": "phase", "color": "#DC2626"},
    {"id": "docker", "label": "Docker", "aliases": ["container", "コンテナ", "dockerfile", "compose"], "category": "infra", "color": "#2496ED"},
    {"id": "k8s", "label": "Kubernetes", "aliases": ["kubernetes", "kubectl", "helm", "クーバネティス"], "category": "infra", "color": "#326CE5"},
    {"id": "ci-cd", "label": "CI/CD", "aliases": ["cicd", "pipeline", "github-actions", "jenkins", "パイプライン"], "category": "infra", "color": "#4A5568"},
    {"id": "monitoring", "label": "Monitoring", "aliases": ["monitor", "datadog", "prometheus", "grafana", "アラート", "alert", "監視"], "category": "infra", "color": "#F59E0B"},
    {"id": "deploy", "label": "Deployment", "aliases": ["deployment", "release", "リリース", "本番", "production", "staging", "デプロイ"], "category": "infra", "color": "#7C3AED"},
    {"id": "network", "label": "Network", "aliases": ["networking", "dns", "cdn", "load-balancer", "lb", "proxy", "nginx", "ネットワーク"], "category": "infra", "color": "#0EA5E9"},
    {"id": "architecture", "label": "Architecture", "aliases": ["arch", "設計", "構成", "design-pattern", "アーキテクチャ"], "category": "architecture", "color": "#0D9488"},
    {"id": "migration", "label": "Migration", "aliases": ["migrate", "移行", "upgrade", "バージョンアップ", "マイグレーション"], "category": "architecture", "color": "#F97316"},
    {"id": "auth", "label": "Authentication", "aliases": ["authentication", "login", "ログイン", "認可", "authorization", "oauth", "jwt", "session", "認証"], "category": "feature", "color": "#F59E0B"},
    {"id": "cache", "label": "Cache", "aliases": ["caching", "redis", "memcached", "cdn-cache", "キャッシュ"], "category": "feature", "color": "#EF4444"},
    {"id": "search", "label": "Search", "aliases": ["elasticsearch", "algolia", "全文検索", "インデックス", "検索"], "category": "feature", "color": "#3B82F6"},
    {"id": "notification", "label": "Notification", "aliases": ["notify", "push", "プッシュ通知", "email", "slack", "通知"], "category": "feature", "color": "#EC4899"},
    {"id": "payment", "label": "Payment", "aliases": ["billing", "stripe", "課金", "サブスクリプション", "subscription", "決済"], "category": "feature", "color": "#10B981"},
    {"id": "batch", "label": "Batch Processing", "aliases": ["job", "cron", "scheduler", "定期実行", "background", "バッチ処理"], "category": "feature", "color": "#7C3AED"},
    {"id": "realtime", "label": "Realtime", "aliases": ["websocket", "socket", "sse", "push", "live", "リアルタイム"], "category": "feature", "color": "#06B6D4"},
    {"id": "ui", "label": "UI", "aliases": ["user-interface", "画面", "コンポーネント", "component"], "category": "ui", "color": "#E879F9"},
    {"id": "ux", "label": "UX", "aliases": ["user-experience", "ユーザビリティ", "usability"], "category": "ui", "color": "#F472B6"},
    {"id": "a11y", "label": "Accessibility", "aliases": ["accessibility", "aria", "wcag", "スクリーンリーダー", "アクセシビリティ"], "category": "ui", "color": "#14B8A6"},
    {"id": "i18n", "label": "Internationalization", "aliases": ["internationalization", "多言語", "翻訳", "locale", "l10n", "国際化"], "category": "ui", "color": "#0EA5E9"},
    {"id": "form", "label": "Form", "aliases": ["input", "validation", "バリデーション", "入力", "フォーム"], "category": "ui", "color": "#6366F1"},
    {"id": "chart", "label": "Chart", "aliases": ["graph", "グラフ", "可視化", "visualization", "dashboard", "チャート"], "category": "ui", "color": "#22C55E"},
    {"id": "analytics", "label": "Analytics", "aliases": ["tracking", "ga", "mixpanel", "トラッキング", "計測", "分析"], "category": "data", "color": "#F97316"},
    {"id": "seo", "label": "SEO", "aliases": ["検索エンジン", "meta", "sitemap", "ogp"], "category": "data", "color": "#84CC16"},
    {"id": "data-model", "label": "Data Model", "aliases": ["schema", "スキーマ", "entity", "er図", "テーブル設計", "データモデル"], "category": "data", "color": "#8B5CF6"},
    {"id": "ml", "label": "Machine Learning", "aliases": ["machine-learning", "ai", "model", "推論", "inference", "機械学習"], "category": "data", "color": "#7C3AED"},
    {"id": "error-handling", "label": "Error Handling", "aliases": ["exception", "例外", "error", "エラー処理", "エラーハンドリング"], "category": "quality", "color": "#EF4444"},
    {"id": "validation", "label": "Validation", "aliases": ["validate", "検証", "入力チェック", "zod", "yup", "バリデーション"], "category": "quality", "color": "#F59E0B"},
    {"id": "lint", "label": "Lint", "aliases": ["eslint", "prettier", "format", "フォーマット", "biome"], "category": "quality", "color": "#6366F1"},
    {"id": "type", "label": "Type", "aliases": ["typescript", "typing", "型定義", "generics", "型"], "category": "quality", "color": "#3B82F6"},
    {"id": "dependency", "label": "Dependency", "aliases": ["npm", "package", "パッケージ", "ライブラリ", "upgrade", "依存関係"], "category": "quality", "color": "#78716C"},
    {"id": "debug", "label": "Debug", "aliases": ["debugging", "調査", "原因調査", "トラブルシューティング", "デバッグ"], "category": "quality", "color": "#F97316"}
  ]
}
TAGS_EOF
    echo "[memoria] Tags master file created: ${tags_path}" >&2
fi

# ============================================
# Ensure rules templates exist
# ============================================
rules_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

init_rules_file() {
    local path="$1"
    if [ ! -f "$path" ]; then
        cat <<EOF > "$path"
{
  "schemaVersion": 1,
  "createdAt": "${rules_timestamp}",
  "updatedAt": "${rules_timestamp}",
  "items": []
}
EOF
    fi
}

init_rules_file "${rules_dir}/review-guidelines.json"
init_rules_file "${rules_dir}/dev-rules.json"

# ============================================
# Find related sessions
# ============================================
related_sessions=""
if [ -d "$sessions_dir" ]; then
    session_files=$(find "$sessions_dir" -mindepth 3 -maxdepth 3 -name "*.json" -type f 2>/dev/null | head -5)

    if [ -n "$session_files" ]; then
        for file in $session_files; do
            if [ -f "$file" ]; then
                session_info=$(jq -r '"\(.id): \(.title // "no title") [branch: \(.context.branch // "unknown")]"' "$file" 2>/dev/null || echo "")
                if [ -n "$session_info" ]; then
                    related_sessions="${related_sessions}  - ${session_info}\n"
                fi
            fi
        done
    fi
fi

# ============================================
# Build context message
# ============================================
context_parts=""
if [ -n "$related_sessions" ]; then
    context_parts="[memoria] Related sessions found:\n\n${related_sessions}\nUse \`/memoria:resume <id>\` to resume a previous session."
fi

# Escape for JSON
escape_for_json() {
    local input="$1"
    local output=""
    local i char
    for (( i=0; i<${#input}; i++ )); do
        char="${input:$i:1}"
        case "$char" in
            $'\\') output+='\\\\';;
            '"') output+='\\"';;
            $'\n') output+='\\n';;
            $'\r') output+='\\r';;
            $'\t') output+='\\t';;
            *) output+="$char";;
        esac
    done
    printf '%s' "$output"
}

using_memoria_escaped=$(escape_for_json "$using_memoria_content")
context_escaped=$(escape_for_json "$context_parts")

# ============================================
# Build update rules for Claude Code LLM
# ============================================
update_rules="## memoria Real-time Update Rules

**This session's JSON file:**
- ID: ${file_id}
- Path: ${current_session_relative_path}

**Update Timing:** Update with Write tool when meaningful changes occur.

| Trigger | Update |
|---------|--------|
| Session purpose becomes clear | Update title, goal |
| User instruction handled | Add to interactions |
| Technical decision made | proposals, choice, reasoning in interaction |
| Error encountered/resolved | problem, choice, reasoning in interaction |
| File modified | actions, filesModified in interaction |
| URL referenced | webLinks in interaction |
| New keyword appears | tags (reference tags.json) |

**How to add interaction:**
\`\`\`json
{
  \"id\": \"int-XXX\",
  \"topic\": \"Topic of this interaction (search keyword)\",
  \"timestamp\": \"ISO8601 format\",
  \"request\": \"User instruction (null for error resolution)\",
  \"problem\": \"Error content (only for error resolution)\",
  \"thinking\": \"Thought process (important info lost in Auto-Compact)\",
  \"webLinks\": [\"Referenced URLs\"],
  \"proposals\": [{\"option\": \"Option\", \"description\": \"Description\"}],
  \"choice\": \"Final selection\",
  \"reasoning\": \"Why this choice\",
  \"actions\": [{\"type\": \"create|edit|delete\", \"path\": \"path\", \"summary\": \"summary\"}],
  \"filesModified\": [\"Modified files\"]
}
\`\`\`

**Tag selection:**
1. Read .memoria/tags.json
2. Find matching tag from aliases
3. Use id if found (e.g., \"フロント\" -> \"frontend\")
4. Add new tag to tags.json if not found

**Notes:**
- interaction id is sequential (int-001, int-002, ...)
- Record important info in thinking that would be lost in Auto-Compact
- Update title, goal when a new major theme emerges"

update_rules_escaped=$(escape_for_json "$update_rules")

# Output context injection as JSON
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<memoria-plugin>\nYou have memoria installed - a long-term memory plugin for Claude Code.\n\n**Your memoria skills are available:**\n- /memoria:resume - Resume a previous session\n- /memoria:save - Manually save current session\n- /memoria:decision - Record a design decision\n- /memoria:search - Search saved knowledge\n\nDashboard: npx @hir4ta/memoria --dashboard\n\n${context_escaped}\n\n${update_rules_escaped}\n\n**Full using-memoria skill:**\n${using_memoria_escaped}\n</memoria-plugin>"
  }
}
EOF

exit 0
