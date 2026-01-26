# memoria v0.9.2 - リアルタイム更新アーキテクチャ移行タスク

> 作成日: 2026-01-25
> 更新日: 2026-01-26
> 背景: docs/plans/tasks.md（旧タスク）、本ドキュメントは v0.9.2 アーキテクチャ移行用。完了後削除予定のファイル

---

## 背景・経緯

### 問題
現行の memoria（v0.9.1）は SessionEnd hook で bash + jq を使ってトランスクリプトをパースし、セッション情報を生成している。しかし、以下の問題がある：

1. **生成データの品質が低い**
   - title が 50 文字で切られて意味不明
   - userRequests に質問文がそのまま入る（要望ではない）
   - assistantActions に発言の断片が入る（アクションではない）
   - 正規表現のバグ（`\\1` など）が混入

2. **正規表現ベースの限界**
   - jq では「要約」や「意図の抽出」ができない
   - パターンマッチで抽出するため、誤検出・漏れが多い

3. **messages の肥大化**
   - 全メッセージを保存すると 1 万行超えの可能性
   - 本当に必要な情報は一部だが、粒度のコントロールができない

### Auto-Compact で失われる情報（調査結果）

公式ドキュメントと複数の記事から判明した、Auto-Compact で失われる情報：

| 失われる情報 | 具体例 | 深刻度 |
|-------------|--------|--------|
| **extended thinking** | 推論過程、判断理由が完全消失 | 最高 |
| **具体的な技術詳細** | 変数名→「その変数」、エラーメッセージ→「何らかのエラー」 | 高 |
| **代替案の検討過程** | 「以前これについて議論した」に薄れる | 高 |
| **初期の重要な指示** | 会話開始時のコンテキストが失われる | 高 |
| **確立されたコードパターン** | プロジェクト固有のパターンが忘れられる | 中 |
| **完全なツール結果** | 中間ステップの詳細 | 中 |

参考リンク:
- [Managing context on the Claude Developer Platform](https://claude.com/blog/context-management)
- [Memory tool - Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)
- [Manage Claude's memory - Claude Code Docs](https://code.claude.com/docs/en/memory)

### 解決策
**Claude Code（LLM）に「意味のある変化があった時」にセッション JSON を更新させる**

- ドラフト概念なし、直接 `.memoria/sessions/{id}.json` を更新
- LLM が意味を理解して要約・抽出
- **interactions** 配列で細かい粒度の決定サイクルを保存
- messages は保存しない（interactions 内に必要な情報を集約）
- hook は初期化とフォールバックのみ
- **tags.json** マスターファイルで表記揺れを防止

### 新アーキテクチャ

```
SessionStart hook:
  └─ .memoria/sessions/{id}.json を初期化（メタデータのみ）
  └─ .memoria/.current-session にセッション ID とパスを書き込み
  └─ tags.json が存在しなければ雛形を作成

会話中（Claude Code LLM が自発的に更新）:
  └─ .current-session を読んでパスを取得
  └─ 「意味のある変化があった時」に sessions/{id}.json を更新
  └─ interactions 配列に新しい決定サイクルを追加
  └─ title, goal, tags を必要に応じて更新
  └─ tags.json を参照して表記揺れを防止、必要なら新規タグ追加

SessionEnd hook:
  └─ フォールバック処理（LLM が更新してなければ従来の jq 処理）
  └─ .current-session ファイルを削除（クリーンアップ）
```

### 更新タイミング

「毎ターン」ではなく「意味のある変化があった時」に更新：

| タイミング | 更新内容 |
|-----------|---------|
| セッションの目的が明確になった | title, goal |
| ユーザーの指示に対応した | interactions に新規追加 |
| 技術的決定を下した | interactions 内の proposals, choice, reasoning |
| エラーに遭遇・解決した | interactions 内の problem, choice, reasoning |
| ファイルを変更した | interactions 内の actions, filesModified |
| URL を参照した | interactions 内の webLinks |
| 新しいキーワードが出現 | tags（tags.json を参照して追加） |

### title, tags の自動更新判断

Claude Code が interaction 追加時に判断：

| 判断 | 例 |
|------|-----|
| title 更新不要 | 同じテーマの深掘り（認証→リフレッシュトークン） |
| title 更新必要 | 新しい大きなテーマ（認証→UI実装） |
| tags 追加不要 | 既存 tags でカバー |
| tags 追加必要 | 新しいキーワード出現（ui, test など） |

---

## 新 JSON スキーマ

### sessions/{id}.json

**interactions 配列**を中心とした構造。各 interaction が「ユーザー指示 → 検討 → 選択 → 実装」のサイクルを表す。

```json
{
  "id": "2026-01-26_abc123",
  "sessionId": "full-uuid-from-claude-code",
  "createdAt": "2026-01-26T10:00:00Z",
  "context": {
    "branch": "feature/auth",
    "projectDir": "/path/to/project",
    "user": {
      "name": "tanaka",
      "email": "tanaka@example.com"
    }
  },

  "title": "認証機能のJWT実装",
  "goal": "JWTベースの認証機能を実装し、リフレッシュトークンにも対応する",
  "tags": ["auth", "jwt", "backend"],

  "interactions": [
    {
      "id": "int-001",
      "topic": "認証方式の選択",
      "timestamp": "2026-01-26T10:15:00Z",

      "request": "認証機能を実装したい",
      "thinking": "JWTとセッションCookieを比較。スケーラビリティとマイクロサービス間の認証共有を考慮...",
      "webLinks": [
        "https://jwt.io/introduction",
        "https://auth0.com/docs/tokens"
      ],
      "proposals": [
        { "option": "JWT", "description": "ステートレス、スケーラブル" },
        { "option": "セッションCookie", "description": "シンプル、サーバー状態管理" }
      ],
      "choice": "JWT",
      "reasoning": "マイクロサービス間の認証共有が容易",
      "actions": [
        { "type": "create", "path": "src/auth/jwt.ts", "summary": "JWT生成・検証モジュール" },
        { "type": "create", "path": "src/auth/middleware.ts", "summary": "認証ミドルウェア" }
      ],
      "filesModified": ["src/auth/jwt.ts", "src/auth/middleware.ts"]
    },
    {
      "id": "int-002",
      "topic": "リフレッシュトークンの有効期限",
      "timestamp": "2026-01-26T10:30:00Z",

      "request": "リフレッシュトークンの期限は？",
      "thinking": "セキュリティとUXのトレードオフ。短すぎると再ログイン頻発、長すぎるとリスク...",
      "webLinks": ["https://auth0.com/docs/tokens/refresh-tokens"],
      "proposals": [
        { "option": "1日", "description": "セキュリティ重視" },
        { "option": "7日", "description": "バランス" },
        { "option": "30日", "description": "UX重視" }
      ],
      "choice": "7日",
      "reasoning": "セキュリティとUXのバランス",
      "actions": [
        { "type": "edit", "path": "src/auth/config.ts", "summary": "有効期限設定を追加" }
      ],
      "filesModified": ["src/auth/config.ts"]
    },
    {
      "id": "int-003",
      "topic": "JWT署名エラーの解決",
      "timestamp": "2026-01-26T11:00:00Z",

      "request": null,
      "problem": "JWT署名エラー: secretOrPrivateKey must be asymmetric",
      "thinking": "エラーメッセージから非対称鍵が必要と判明。HS256かRS256か...",
      "webLinks": ["https://github.com/auth0/node-jsonwebtoken/issues/xxx"],
      "proposals": [
        { "option": "HS256に変更", "description": "対称鍵、シンプル" },
        { "option": "RS256用の鍵形式に変更", "description": "非対称鍵、セキュア" }
      ],
      "choice": "RS256用の鍵形式に変更",
      "reasoning": "本番環境でのセキュリティを考慮",
      "actions": [
        { "type": "edit", "path": "src/auth/jwt.ts", "summary": "鍵形式をPEMに変更" }
      ],
      "filesModified": ["src/auth/jwt.ts"]
    }
  ]
}
```

### interaction フィールド詳細

| フィールド | 必須 | 説明 |
|-----------|------|------|
| id | ✓ | 一意識別子（int-001, int-002, ...） |
| topic | ✓ | このやりとりのトピック（検索キーワード） |
| timestamp | ✓ | 発生時刻 |
| request | | ユーザーの指示・質問（エラー解決時は null） |
| problem | | エラーや問題（エラー解決時に使用） |
| thinking | | Claude の思考プロセス（Auto-Compact で失われる） |
| webLinks | | 参照した URL |
| proposals | | 検討した選択肢（option, description） |
| choice | | 最終的な選択 |
| reasoning | | 選択理由 |
| actions | | 実行したアクション（type, path, summary） |
| filesModified | | 変更したファイル一覧 |

### tags.json（タグマスターファイル）

表記揺れを防ぐためのタグ一覧。Claude Code はこのファイルを参照してタグを選択し、該当がなければ新規追加する。

```json
{
  "version": 1,
  "tags": [
    {
      "id": "frontend",
      "label": "フロントエンド",
      "aliases": ["front", "フロント", "client", "クライアント", "browser"],
      "category": "domain",
      "color": "#3B82F6"
    },
    {
      "id": "backend",
      "label": "バックエンド",
      "aliases": ["back", "バック", "server", "サーバー"],
      "category": "domain",
      "color": "#10B981"
    },
    {
      "id": "api",
      "label": "API",
      "aliases": ["rest", "graphql", "endpoint", "エンドポイント"],
      "category": "domain",
      "color": "#06B6D4"
    },
    {
      "id": "db",
      "label": "データベース",
      "aliases": ["database", "sql", "query", "クエリ", "rdb", "nosql", "orm"],
      "category": "domain",
      "color": "#8B5CF6"
    },
    {
      "id": "infra",
      "label": "インフラ",
      "aliases": ["infrastructure", "cloud", "クラウド", "aws", "gcp", "azure"],
      "category": "domain",
      "color": "#F97316"
    },
    {
      "id": "mobile",
      "label": "モバイル",
      "aliases": ["ios", "android", "react-native", "flutter", "アプリ"],
      "category": "domain",
      "color": "#A855F7"
    },
    {
      "id": "cli",
      "label": "CLI",
      "aliases": ["command-line", "terminal", "コマンドライン", "shell"],
      "category": "domain",
      "color": "#1F2937"
    },
    {
      "id": "feature",
      "label": "新機能",
      "aliases": ["new", "機能追加", "実装", "feat"],
      "category": "phase",
      "color": "#22C55E"
    },
    {
      "id": "bugfix",
      "label": "バグ修正",
      "aliases": ["bug", "fix", "バグ", "修正", "hotfix"],
      "category": "phase",
      "color": "#EF4444"
    },
    {
      "id": "refactor",
      "label": "リファクタリング",
      "aliases": ["refactoring", "cleanup", "整理", "改善"],
      "category": "phase",
      "color": "#6B7280"
    },
    {
      "id": "test",
      "label": "テスト",
      "aliases": ["testing", "spec", "jest", "vitest", "e2e", "unit"],
      "category": "phase",
      "color": "#EC4899"
    },
    {
      "id": "docs",
      "label": "ドキュメント",
      "aliases": ["documentation", "readme", "doc", "仕様書", "設計書"],
      "category": "phase",
      "color": "#64748B"
    },
    {
      "id": "config",
      "label": "設定",
      "aliases": ["configuration", "env", "環境", "settings", "dotfile"],
      "category": "phase",
      "color": "#A855F7"
    },
    {
      "id": "perf",
      "label": "パフォーマンス",
      "aliases": ["performance", "optimization", "最適化", "高速化", "チューニング"],
      "category": "phase",
      "color": "#FBBF24"
    },
    {
      "id": "security",
      "label": "セキュリティ",
      "aliases": ["sec", "vulnerability", "脆弱性", "セキュア", "hardening"],
      "category": "phase",
      "color": "#DC2626"
    },
    {
      "id": "docker",
      "label": "Docker",
      "aliases": ["container", "コンテナ", "dockerfile", "compose"],
      "category": "infra",
      "color": "#2496ED"
    },
    {
      "id": "k8s",
      "label": "Kubernetes",
      "aliases": ["kubernetes", "kubectl", "helm", "クーバネティス"],
      "category": "infra",
      "color": "#326CE5"
    },
    {
      "id": "ci-cd",
      "label": "CI/CD",
      "aliases": ["cicd", "pipeline", "github-actions", "jenkins", "パイプライン"],
      "category": "infra",
      "color": "#4A5568"
    },
    {
      "id": "monitoring",
      "label": "監視",
      "aliases": ["monitor", "datadog", "prometheus", "grafana", "アラート", "alert"],
      "category": "infra",
      "color": "#F59E0B"
    },
    {
      "id": "deploy",
      "label": "デプロイ",
      "aliases": ["deployment", "release", "リリース", "本番", "production", "staging"],
      "category": "infra",
      "color": "#7C3AED"
    },
    {
      "id": "network",
      "label": "ネットワーク",
      "aliases": ["networking", "dns", "cdn", "load-balancer", "lb", "proxy", "nginx"],
      "category": "infra",
      "color": "#0EA5E9"
    },
    {
      "id": "architecture",
      "label": "アーキテクチャ",
      "aliases": ["arch", "設計", "構成", "design-pattern"],
      "category": "architecture",
      "color": "#0D9488"
    },
    {
      "id": "migration",
      "label": "マイグレーション",
      "aliases": ["migrate", "移行", "upgrade", "バージョンアップ"],
      "category": "architecture",
      "color": "#F97316"
    },
    {
      "id": "auth",
      "label": "認証",
      "aliases": ["authentication", "login", "ログイン", "認可", "authorization", "oauth", "jwt", "session"],
      "category": "feature",
      "color": "#F59E0B"
    },
    {
      "id": "cache",
      "label": "キャッシュ",
      "aliases": ["caching", "redis", "memcached", "cdn-cache"],
      "category": "feature",
      "color": "#EF4444"
    },
    {
      "id": "search",
      "label": "検索",
      "aliases": ["elasticsearch", "algolia", "全文検索", "インデックス"],
      "category": "feature",
      "color": "#3B82F6"
    },
    {
      "id": "notification",
      "label": "通知",
      "aliases": ["notify", "push", "プッシュ通知", "email", "slack"],
      "category": "feature",
      "color": "#EC4899"
    },
    {
      "id": "payment",
      "label": "決済",
      "aliases": ["billing", "stripe", "課金", "サブスクリプション", "subscription"],
      "category": "feature",
      "color": "#10B981"
    },
    {
      "id": "batch",
      "label": "バッチ処理",
      "aliases": ["job", "cron", "scheduler", "定期実行", "background"],
      "category": "feature",
      "color": "#7C3AED"
    },
    {
      "id": "realtime",
      "label": "リアルタイム",
      "aliases": ["websocket", "socket", "sse", "push", "live"],
      "category": "feature",
      "color": "#06B6D4"
    },
    {
      "id": "ui",
      "label": "UI",
      "aliases": ["user-interface", "画面", "コンポーネント", "component"],
      "category": "ui",
      "color": "#E879F9"
    },
    {
      "id": "ux",
      "label": "UX",
      "aliases": ["user-experience", "ユーザビリティ", "usability"],
      "category": "ui",
      "color": "#F472B6"
    },
    {
      "id": "a11y",
      "label": "アクセシビリティ",
      "aliases": ["accessibility", "aria", "wcag", "スクリーンリーダー"],
      "category": "ui",
      "color": "#14B8A6"
    },
    {
      "id": "i18n",
      "label": "国際化",
      "aliases": ["internationalization", "多言語", "翻訳", "locale", "l10n"],
      "category": "ui",
      "color": "#0EA5E9"
    },
    {
      "id": "form",
      "label": "フォーム",
      "aliases": ["input", "validation", "バリデーション", "入力"],
      "category": "ui",
      "color": "#6366F1"
    },
    {
      "id": "chart",
      "label": "チャート",
      "aliases": ["graph", "グラフ", "可視化", "visualization", "dashboard"],
      "category": "ui",
      "color": "#22C55E"
    },
    {
      "id": "analytics",
      "label": "分析",
      "aliases": ["tracking", "ga", "mixpanel", "トラッキング", "計測"],
      "category": "data",
      "color": "#F97316"
    },
    {
      "id": "seo",
      "label": "SEO",
      "aliases": ["検索エンジン", "meta", "sitemap", "ogp"],
      "category": "data",
      "color": "#84CC16"
    },
    {
      "id": "data-model",
      "label": "データモデル",
      "aliases": ["schema", "スキーマ", "entity", "er図", "テーブル設計"],
      "category": "data",
      "color": "#8B5CF6"
    },
    {
      "id": "ml",
      "label": "機械学習",
      "aliases": ["machine-learning", "ai", "model", "推論", "inference"],
      "category": "data",
      "color": "#7C3AED"
    },
    {
      "id": "error-handling",
      "label": "エラーハンドリング",
      "aliases": ["exception", "例外", "error", "エラー処理"],
      "category": "quality",
      "color": "#EF4444"
    },
    {
      "id": "validation",
      "label": "バリデーション",
      "aliases": ["validate", "検証", "入力チェック", "zod", "yup"],
      "category": "quality",
      "color": "#F59E0B"
    },
    {
      "id": "lint",
      "label": "Lint",
      "aliases": ["eslint", "prettier", "format", "フォーマット", "biome"],
      "category": "quality",
      "color": "#6366F1"
    },
    {
      "id": "type",
      "label": "型",
      "aliases": ["typescript", "typing", "型定義", "generics"],
      "category": "quality",
      "color": "#3B82F6"
    },
    {
      "id": "dependency",
      "label": "依存関係",
      "aliases": ["npm", "package", "パッケージ", "ライブラリ", "upgrade"],
      "category": "quality",
      "color": "#78716C"
    },
    {
      "id": "debug",
      "label": "デバッグ",
      "aliases": ["debugging", "調査", "原因調査", "トラブルシューティング"],
      "category": "quality",
      "color": "#F97316"
    }
  ]
}
```

### タグカテゴリ一覧

| カテゴリ | 説明 | 例 |
|---------|------|-----|
| `domain` | 技術領域 | frontend, backend, infra, db |
| `phase` | 開発フェーズ | feature, bugfix, refactor, test |
| `infra` | インフラ・DevOps | docker, k8s, ci-cd, deploy |
| `architecture` | 設計・構成 | architecture, migration |
| `feature` | 機能カテゴリ | auth, cache, search, payment |
| `ui` | UI/UX | ui, a11y, i18n, form |
| `data` | データ・分析 | analytics, seo, ml |
| `quality` | 品質・運用 | error-handling, lint, debug |

### .current-session ファイル

セッション ID とパスを保持するファイル。SessionStart hook で作成、SessionEnd hook で削除。

```json
{
  "id": "2026-01-26_abc123",
  "path": ".memoria/sessions/2026/01/2026-01-26_abc123.json"
}
```

### 削除されるフィールド（旧スキーマとの比較）

| フィールド | 理由 |
|-----------|------|
| messages | 巨大化するため。interactions 内の thinking で代替 |
| status | "completed" かどうか判断できないため不要 |
| endedAt | 同上 |
| summary | トップレベル（title, goal）と interactions に統合 |
| summary.stats | messages がないため不要 |
| keyThinking | interactions 内の thinking に統合 |
| alternatives | interactions 内の proposals に統合 |
| errors | interactions 内の problem に統合 |
| userRequests | interactions 内の request に統合 |
| assistantActions | interactions 内の actions に統合 |
| webLinks（トップレベル） | interactions 内の webLinks に統合 |
| filesModified（トップレベル） | interactions 内の filesModified に統合 |

---

## タスク一覧

### Phase 1: 設計ドキュメント更新

#### 1.1 design.md 更新
- [x] `docs/plans/design.md` を開く
- [x] 「データ構造」セクションを完全に書き換え
  - [x] sessions スキーマを interactions ベースに更新
    - [x] messages, status, endedAt, summary を削除
    - [x] title, goal, tags をトップレベルに
    - [x] interactions 配列を追加（決定サイクルの単位）
    - [x] interaction 内に request, thinking, webLinks, proposals, choice, reasoning, actions, filesModified を含める
    - [x] problem フィールド（エラー解決時）
  - [x] tags.json スキーマを追加（タグマスターファイル）
    - [x] id, label, aliases, category, color
  - [x] .current-session ファイルの説明を追加
- [x] 「フック設計」セクションを更新
  - [x] SessionStart: セッション JSON 初期化 + .current-session 作成 + tags.json 雛形作成
  - [x] SessionEnd: フォールバック処理 + .current-session 削除
  - [x] PreCompact: 不要になる旨を記載
- [x] 「データフロー」セクションを更新
  - [x] 新アーキテクチャの図を追加
  - [x] Claude Code（LLM）が「意味のある変化があった時」に更新する旨を記載
  - [x] tags.json を参照して表記揺れを防止する旨を記載

#### 1.2 requirements.md 更新
- [x] `docs/plans/requirements.md` を開く
- [x] 「セッション要約の自動保存」セクションを更新
  - [x] 「Claude Code が意味のある変化があった時に自動更新」に変更
  - [x] 保存する情報リストを interactions ベースに合わせる
  - [x] Auto-Compact で失われる情報を保存する旨を明記

#### 1.3 background.md 更新（任意）
- [x] `docs/plans/background.md` を開く
- [x] 「解決策」セクションに v0.9.2 アーキテクチャの説明を追加
- [x] Auto-Compact 調査結果を追記

---

### Phase 2: Hooks 実装

#### 2.1 hooks.json 更新
- [x] `hooks/hooks.json` を開く
- [x] SessionStart 設定を確認（変更なし or 微調整）
- [x] SessionEnd 設定を確認（変更なし or 微調整）
- [x] PreCompact 設定を削除（不要になるため）

#### 2.2 session-start.sh 更新
- [x] `hooks/session-start.sh` を開く
- [x] 新しいセッション JSON を初期化するロジックを追加
  - [x] `.memoria/sessions/YYYY/MM/{id}.json` を作成
  - [x] id: `YYYY-MM-DD_短縮UUID` 形式
  - [x] sessionId: Claude Code から渡される session_id
  - [x] createdAt: 現在時刻（ISO8601）
  - [x] context.branch: `git rev-parse --abbrev-ref HEAD`
  - [x] context.projectDir: `$cwd` または `$PWD`
  - [x] context.user.name: `git config user.name`
  - [x] context.user.email: `git config user.email`
  - [x] title: 空文字列（Claude Code が更新）
  - [x] goal: 空文字列（Claude Code が更新）
  - [x] tags: 空配列
  - [x] interactions: 空配列
- [x] `.memoria/.current-session` ファイルに ID とパスを書き込み
  ```json
  { "id": "2026-01-26_abc123", "path": ".memoria/sessions/2026/01/2026-01-26_abc123.json" }
  ```
- [x] `.memoria/tags.json` が存在しなければ雛形を作成
- [x] hookSpecificOutput.additionalContext に以下を含める
  - [x] セッション ID とパス
  - [x] 更新ルール（意味のある変化があった時に更新）
  - [x] interactions の追加方法
  - [x] tags.json の参照方法

#### 2.3 session-end.sh 更新
- [x] `hooks/session-end.sh` を開く
- [x] 現在のロジックを「フォールバック処理」として整理
  - [x] `.memoria/.current-session` からセッション ID とパスを読み取り
  - [x] 対応するセッション JSON を読み込み
  - [x] interactions が空なら jq でフォールバック生成
    - [x] トランスクリプトから基本的な情報を抽出
    - [x] 1つの interaction として保存
  - [x] title が空なら jq でフォールバック生成
- [x] フォールバック生成のロジックを改善
  - [x] title: 100 文字制限に変更
  - [x] 正規表現バグ（`\\1` など）を修正
- [x] `.memoria/.current-session` ファイルを削除（クリーンアップ）

#### 2.4 pre-compact.sh の扱い
- [x] `hooks/pre-compact.sh` を開く
- [x] 現行ロジックを確認
- [x] 方針: 削除（Claude Code がリアルタイム更新するため不要）
- [x] hooks.json から PreCompact 設定を削除

#### 2.5 tags.json 雛形作成
- [x] `.memoria/tags.json` の雛形ファイルを作成
- [x] 上記「新 JSON スキーマ」セクションの tags.json を使用
- [x] SessionStart hook で存在しなければコピーするロジックを追加

#### 2.6 hooks テスト
- [ ] SessionStart hook を手動実行してテスト
  - [ ] `.memoria/sessions/YYYY/MM/{id}.json` が作成されることを確認
  - [ ] `.memoria/.current-session` が作成されることを確認
  - [ ] `.memoria/tags.json` が作成されることを確認（存在しない場合）
  - [ ] 各フィールドが正しく初期化されていることを確認
- [ ] SessionEnd hook を手動実行してテスト
  - [ ] フォールバック処理が動作することを確認
  - [ ] `.memoria/.current-session` が削除されることを確認

---

### Phase 3: CLAUDE.md / Settings 更新

#### 3.1 プラグイン用 CLAUDE.md または settings.json 更新
- [x] Claude Code がセッション JSON を更新するルールを追加
  - ✅ session-start.sh の additionalContext に更新ルールを注入済み
- [x] 以下の内容を含める：

```markdown
## memoria 連携ルール

会話中、「意味のある変化があった時」に `.memoria/sessions/{current_session_id}.json` を更新すること。
セッション ID とファイルパスは `.memoria/.current-session` から取得する。

### 更新タイミング

| タイミング | 更新内容 |
|-----------|---------|
| セッションの目的が明確になった | title, goal を更新 |
| ユーザーの指示に対応した | interactions に新規追加 |
| 技術的決定を下した | interaction 内の proposals, choice, reasoning |
| エラーに遭遇・解決した | interaction 内の problem, choice, reasoning |
| ファイルを変更した | interaction 内の actions, filesModified |
| URL を参照した | interaction 内の webLinks |
| 新しいキーワードが出現 | tags（tags.json を参照） |

### interaction の追加方法

ユーザーの指示に対応する際、以下の形式で interaction を追加：

```json
{
  "id": "int-XXX",
  "topic": "このやりとりのトピック（検索キーワード）",
  "timestamp": "2026-01-26T10:15:00Z",
  "request": "ユーザーの指示（エラー解決時は null）",
  "problem": "エラー内容（エラー解決時のみ）",
  "thinking": "思考プロセス（Auto-Compact で失われる重要な情報）",
  "webLinks": ["参照した URL"],
  "proposals": [
    { "option": "選択肢1", "description": "説明" },
    { "option": "選択肢2", "description": "説明" }
  ],
  "choice": "最終的な選択",
  "reasoning": "選択理由",
  "actions": [
    { "type": "create|edit|delete", "path": "ファイルパス", "summary": "概要" }
  ],
  "filesModified": ["変更したファイル"]
}
```

### tags の選択方法

1. `.memoria/tags.json` を読む
2. topic に該当するタグを aliases からも探す
3. 該当があれば id を使用（例: "フロント" → "frontend"）
4. 該当がなければ新規タグを tags.json に追加

### title, goal の更新判断

interaction 追加時に判断：
- 同じテーマの深掘り → title, goal はそのまま
- 新しい大きなテーマ → title, goal を更新

### 注意事項

- `.current-session` が存在しない場合は更新しない（hook が初期化する）
- interaction の id は連番（int-001, int-002, ...）
- thinking には Auto-Compact で失われる重要な情報を記録
```

#### 3.2 using-memoria スキル更新
- [x] `skills/using-memoria/skill.md` を開く
- [x] 新アーキテクチャの説明を追加
  - [x] 「Claude Code が意味のある変化があった時に自動更新」の説明
  - [x] interactions ベースの新しい JSON スキーマの説明
- [x] フィールドの説明を更新
  - [x] messages が削除されたことを反映
  - [x] interactions の各フィールドの説明を追加
  - [x] tags.json の説明を追加

---

### Phase 4: Skills 更新

#### 4.1 /memoria:resume 更新
- [x] `skills/resume/skill.md` を開く
- [x] セッション詳細表示フォーマットを更新
  - [x] messages セクションを削除
  - [x] interactions セクションを追加
    - [x] 各 interaction の topic, choice, reasoning を表示
    - [x] 思考プロセス（thinking）を表示
    - [x] エラー解決（problem）を表示
- [x] 再開時のコンテキスト注入内容を更新
  - [x] title, goal から目的を復元
  - [x] interactions から進捗・決定事項を復元
  - [x] interactions 内の thinking から思考プロセスを復元
  - [x] interactions 内の problem から解決済み問題を復元
- [x] セッション JSON 読み込みロジックの更新
  - [x] 新スキーマ（interactions ベース）に対応

#### 4.2 /memoria:save の扱い
- [x] `skills/save/skill.md` を開く
- [x] 方針: 「強制フラッシュ」として残す
  - [x] Claude Code に「現在の状態を .memoria に保存して」と促す
  - [x] 自動更新が動作していない場合の手動トリガーとして機能

#### 4.3 /memoria:decision 更新
- [x] `skills/decision/skill.md` を開く
- [x] セッション JSON の interactions との連携を確認
  - [x] /memoria:decision で明示的に記録 → decisions/{id}.json に保存
  - [x] セッション JSON の interactions にも反映
- [x] decisions/{id}.json のスキーマは変更なし（確認のみ）

#### 4.4 /memoria:search 更新
- [x] `skills/search/skill.md` を開く
- [x] 検索対象フィールドを更新
  - [x] messages を削除
  - [x] interactions を追加
    - [x] interactions[].topic（検索キーワード）
    - [x] interactions[].thinking
    - [x] interactions[].choice
    - [x] interactions[].reasoning
    - [x] interactions[].problem
  - [x] tags（tags.json の aliases も検索対象）
- [x] 検索結果表示フォーマットを更新
  - [x] マッチした interaction の topic と概要を表示

#### 4.5 /memoria:review 更新
- [x] `skills/review/skill.md` を開く
- [x] 変更が必要か確認
  - [x] セッション JSON の変更は review には影響しない（確認済み）
  - [x] rules/dev-rules.json, rules/review-guidelines.json は変更なし
- [x] 英語化のみ実施

#### 4.6 /memoria:report 更新
- [x] `skills/report/skill.md` を開く
- [x] 変更が必要か確認
- [x] 英語化のみ実施

---

### Phase 5: ダッシュボード更新

#### 5.1 TypeScript 型定義更新
- [ ] `dashboard/src/lib/types.ts` を開く
- [ ] Session 型を完全に書き換え
  - [ ] 削除: messages, status, endedAt, summary
  - [ ] 追加: title, goal, tags（トップレベル）
  - [ ] 追加: interactions 配列
  ```typescript
  interface Interaction {
    id: string;
    topic: string;
    timestamp: string;
    request?: string;
    problem?: string;
    thinking?: string;
    webLinks?: string[];
    proposals?: { option: string; description: string }[];
    choice?: string;
    reasoning?: string;
    actions?: { type: string; path: string; summary: string }[];
    filesModified?: string[];
  }

  interface Session {
    id: string;
    sessionId: string;
    createdAt: string;
    context: {
      branch?: string;
      projectDir: string;
      user: { name: string; email?: string };
    };
    title: string;
    goal?: string;
    tags: string[];
    interactions: Interaction[];
  }
  ```
- [ ] Tag 型を追加
  ```typescript
  interface Tag {
    id: string;
    label: string;
    aliases: string[];
    category: string;
    color: string;
  }
  ```

#### 5.2 API レスポンス確認
- [ ] `dashboard/server/index.ts` を開く
- [ ] GET /api/sessions のレスポンスを確認
  - [ ] 新スキーマでも動作することを確認
- [ ] GET /api/sessions/:id のレスポンスを確認
  - [ ] 新スキーマでも動作することを確認
- [ ] GET /api/tags を追加（tags.json を返す）
- [ ] 型定義との整合性を確認

#### 5.3 セッション一覧ページ更新
- [ ] `dashboard/src/pages/sessions/index.tsx` を開く
- [ ] セッションカードの表示を更新
  - [ ] title, goal を表示
  - [ ] interactions の数を表示
  - [ ] tags をカラー付きバッジで表示（tags.json の color を使用）
- [ ] フィルタリングロジックを更新
  - [ ] status フィルタを削除
  - [ ] tags フィルタを追加

#### 5.4 セッション詳細ページ更新
- [ ] `dashboard/src/pages/sessions/[id].tsx` を開く
- [ ] 基本情報セクション更新
  - [ ] title, goal を表示
  - [ ] tags をカラー付きバッジで表示
  - [ ] status, endedAt を削除
- [ ] interactions セクション追加（新規・メイン）
  - [ ] 各 interaction をカード形式で表示
  - [ ] topic をタイトルとして表示
  - [ ] request または problem を表示
  - [ ] proposals を選択肢リストで表示
  - [ ] choice, reasoning を強調表示
  - [ ] thinking をアコーディオンで表示（折りたたみ）
  - [ ] actions を実行ログとして表示
  - [ ] webLinks をリンクリストで表示
  - [ ] filesModified をファイルリストで表示
- [ ] 削除するセクション
  - [ ] messages（会話履歴）
  - [ ] keyThinking, alternatives, errors（interactions に統合）

#### 5.5 コンポーネント更新
- [ ] 既存コンポーネントの確認と更新
  - [ ] session-card.tsx（一覧用）→ 新スキーマ対応
- [ ] 新コンポーネント作成
  - [ ] interaction-card.tsx（interaction 表示用）
  - [ ] tag-badge.tsx（タグ表示用、色付き）
  - [ ] proposals-list.tsx（選択肢リスト表示用）
- [ ] 削除するコンポーネント（不要になる場合）
  - [ ] thinking-list.tsx
  - [ ] alternatives-list.tsx
  - [ ] errors-list.tsx

#### 5.6 ダッシュボードテスト
- [ ] `npm run dev` でダッシュボード起動
- [ ] セッション一覧ページの表示確認
  - [ ] tags のカラー表示確認
- [ ] セッション詳細ページの表示確認
  - [ ] interactions の表示確認
  - [ ] thinking のアコーディオン動作確認
- [ ] 編集・削除機能の動作確認

---

### Phase 6: 統合テスト

#### 6.1 新規セッションの E2E テスト
- [ ] Claude Code を起動
- [ ] memoria プラグインが読み込まれることを確認
- [ ] SessionStart hook が発火し、セッション JSON が初期化されることを確認
- [ ] 会話を進める
  - [ ] ユーザーが質問を投げる
  - [ ] Claude Code が応答する
  - [ ] セッション JSON が更新されることを確認
    - [ ] title が設定されているか
    - [ ] userRequests が追加されているか
    - [ ] assistantActions が追加されているか
- [ ] セッションを終了
- [ ] SessionEnd hook が発火することを確認
- [ ] ダッシュボードでセッションを確認

#### 6.2 フォールバック処理のテスト
- [ ] Claude Code がセッション JSON を更新しないケースをシミュレート
  - [ ] CLAUDE.md のルールを一時的に削除
  - [ ] または、セッション JSON を空のまま維持
- [ ] セッションを終了
- [ ] SessionEnd hook のフォールバック処理が動作することを確認
  - [ ] jq で title, userRequests, assistantActions が生成されているか

#### 6.3 /memoria:resume テスト
- [ ] 過去のセッションを用意（新スキーマ）
- [ ] /memoria:resume を実行
- [ ] セッション一覧が表示されることを確認
- [ ] セッション ID を指定して再開
- [ ] コンテキストが正しく注入されることを確認
  - [ ] title, userRequests から目的が復元されているか
  - [ ] keyThinking から思考プロセスが復元されているか

#### 6.4 /memoria:search テスト
- [ ] 複数のセッションを用意（新スキーマ）
- [ ] /memoria:search を実行
- [ ] keyThinking, alternatives, errors も検索対象になっていることを確認

#### 6.5 /memoria:decision テスト
- [ ] 会話中に技術的な判断を下す
- [ ] Claude Code が decisions/{id}.json を作成することを確認
- [ ] セッション JSON の decisions 配列に ID が追加されることを確認

---

### Phase 7: ドキュメント・マイグレーション

#### 7.1 README.md 更新
- [ ] `README.md` を開く
- [ ] 「仕組み」セクションを更新
  - [ ] 新アーキテクチャの説明を追加
  - [ ] Claude Code が毎ターン更新する旨を記載
- [ ] 「データ保存」セクションを更新
  - [ ] 新しい JSON スキーマの説明を追加

#### 7.2 マイグレーションガイド作成（不要：旧スキーマは維持しない。完全新スキーマのみに対応すれば十分）
- [ ] `docs/migration-v0.9.2.md` を作成（任意）
- [ ] v0.9.x から v0.9.2 への移行手順を記載
  - [ ] 既存の sessions JSON は旧スキーマのまま動作するか
  - [ ] ダッシュボードは両方のスキーマに対応するか
  - [ ] 必要なら変換スクリプトを提供

#### 7.3 既存データの互換性確認（不要：旧スキーマは維持しない。完全新スキーマのみに対応すれば十分）
- [ ] 旧スキーマ（messages あり）のセッション JSON を用意
- [ ] ダッシュボードで表示できることを確認
- [ ] /memoria:resume で読み込めることを確認
- [ ] 後方互換性を維持する方針を決定
  - [ ] オプション A: 両方のスキーマに対応（推奨）
  - [ ] オプション B: マイグレーションスクリプトで変換

---

### Phase 8: リリース準備

#### 8.1 バージョン更新
- [ ] `package.json` を開く
- [ ] version を `0.9.2` に更新

#### 8.2 ビルド・テスト
- [ ] `npm run build` でビルド確認
- [ ] `npm run lint` で lint 確認
- [ ] 全体的な動作確認

#### 8.3 リリース
- [ ] Git コミット
- [ ] Git タグ（v0.9.2）
- [ ] npm publish（必要に応じて）

---

## 進捗管理

| Phase | 状態 | 備考 |
|-------|------|------|
| Phase 1: 設計ドキュメント更新 | ✅ 完了 | design.md, requirements.md, background.md 更新済み |
| Phase 2: Hooks 実装 | 🔄 実装完了 | session-start.sh, session-end.sh 更新、pre-compact.sh 削除。**2.6 テスト未実施** |
| Phase 3: CLAUDE.md / Settings 更新 | ✅ 完了 | session-start.sh additionalContext に更新ルール注入、using-memoria スキル更新済み |
| Phase 4: Skills 更新 | ✅ 完了 | 全スキルを新スキーマ対応 + 英語化 |
| Phase 5: ダッシュボード更新 | 未着手 | |
| Phase 6: 統合テスト | 未着手 | |
| Phase 7: ドキュメント・マイグレーション | 未着手 | |
| Phase 8: リリース準備 | 未着手 | |

---

## 参考リンク

- [Claude Code Hooks ドキュメント](https://code.claude.com/docs/en/hooks)
- [Auto-Compact 機能](https://code.claude.com/docs/en/how-claude-code-works)
- [現行 design.md](docs/plans/design.md)
- [現行 tasks.md](docs/plans/tasks.md)
