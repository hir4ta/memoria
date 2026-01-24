---
name: resume
description: セッションを再開する。ID省略で一覧表示。
---

# /memoria:resume

セッションを再開するためのスキルです。

## 使い方

### セッション一覧を表示

```
/memoria:resume
```

最近のセッション一覧を表示します。

### 特定のセッションを再開

```
/memoria:resume <session_id>
```

指定したIDのセッションを再開します。

## 実行手順

1. `.memoria/sessions/` ディレクトリ内のJSONファイルを読み込む
2. セッション一覧をユーザーに表示
3. セッションIDが指定された場合、該当ファイルを読み込んで詳細を取得
4. セッションのコンテキスト（summary, messages, filesModified）を読み込んで作業を再開

### 具体的な操作

```bash
# セッション一覧を取得
Glob: .memoria/sessions/*.json

# 各セッションファイルを読み込み
Read: .memoria/sessions/{filename}.json
```

## 出力フォーマット

### 一覧表示時

```
最近のセッション:
  1. [abc123] 認証機能のJWT実装 (2026-01-24, feature/auth)
     [auth] [jwt] [backend]
  2. [def456] ユーザー管理API (2026-01-23, feature/user)
     [user] [api]

再開するセッションを選択してください (1-3)、またはIDを入力:
```

### セッション再開時

```
セッション「認証機能のJWT実装」を再開します。

前回の状況:
- 目的: JWTで認証機能を実装
- 進捗: JWT生成・検証ロジック完了
- 変更ファイル:
  - src/auth/jwt.ts (created)
  - src/auth/refresh.ts (modified)

続きから作業を開始しますか？
```

## セッションJSONフォーマット

```json
{
  "id": "2026-01-24_abc123",
  "sessionId": "full-uuid",
  "summary": "認証機能のJWT実装",
  "tags": ["auth", "jwt"],
  "context": {
    "branch": "feature/auth",
    "projectDir": "/path/to/project"
  },
  "messages": [...],
  "filesModified": [...]
}
```
