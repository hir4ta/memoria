---
name: save
description: 現在のセッションを手動保存する。
---

# /memoria:save

現在のセッションを手動で保存するスキルです。

## 使い方

```
/memoria:save
```

現在の会話履歴を `.memoria/sessions/` に保存します。

## 実行手順

1. 現在の会話の要約を生成（最初のユーザーメッセージから）
2. 関連タグを自動抽出（auth, api, ui, test, bug, feature, refactor, docs, config, db など）
3. `.memoria/sessions/{date}_{id}.json` に保存

### 具体的な操作

```bash
# セッションディレクトリを確認・作成
mkdir -p .memoria/sessions

# セッションJSONを作成して保存
Write: .memoria/sessions/2026-01-24_abc123.json
```

## セッションJSONスキーマ

```json
{
  "id": "2026-01-24_abc123",
  "sessionId": "claude-session-uuid",
  "createdAt": "2026-01-24T10:00:00Z",
  "endedAt": null,
  "user": {
    "name": "user-name",
    "email": "user@example.com"
  },
  "context": {
    "branch": "feature/xxx",
    "projectDir": "/path/to/project"
  },
  "tags": ["tag1", "tag2"],
  "status": "in_progress",
  "summary": "会話の要約（最初のユーザーメッセージから生成）",
  "messages": [
    {
      "type": "user",
      "timestamp": "2026-01-24T10:00:00Z",
      "content": "ユーザーのメッセージ"
    },
    {
      "type": "assistant",
      "timestamp": "2026-01-24T10:01:00Z",
      "content": "アシスタントの応答",
      "thinking": "思考プロセス（あれば）"
    }
  ],
  "filesModified": []
}
```

## タグ抽出ルール

メッセージ内容から以下のキーワードを検索してタグを付与:
- `auth` - 認証関連
- `api` - API関連
- `ui`, `component`, `react` - UI関連
- `test` - テスト関連
- `bug`, `fix` - バグ修正
- `feature` - 新機能
- `refactor` - リファクタリング
- `doc` - ドキュメント
- `config` - 設定関連
- `db`, `database` - データベース

## 注意事項

- セッション終了時には自動的に保存されます（hooks/session-end.sh）
- このコマンドは途中で明示的に保存したい場合に使用します
- 同じセッションで複数回実行すると、最新の状態で上書きされます

## 出力フォーマット

```
セッションを保存しました。

セッションID: 2026-01-24_abc123
要約: 認証機能のJWT実装を進行中
タグ: [auth] [jwt] [backend]
変更ファイル: 3件
```
