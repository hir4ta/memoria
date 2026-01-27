---
name: save
description: Force flush current session state to JSON.
---

# /memoria:save

Create session summary and extract development rules from conversation.

## When to Use

**Interactions are auto-saved** by SessionEnd hook. Use this command when you want to:

1. **Create summary** - Write title, goal, outcome, description for the session
2. **Extract rules** - Save development rules/guidelines mentioned in conversation
3. **Generate YAML file** - Create structured context for dashboard and future resume

## Usage

```
/memoria:save
```

## What Gets Saved

| Target | Content |
|--------|---------|
| Session JSON | title, tags (search index only) |
| Session YAML | summary, plan, discussions, code_examples, errors, handoff, references |
| dev-rules.json | Development rules mentioned in conversation |
| review-guidelines.json | Review guidelines mentioned in conversation |

**Note:** `interactions`, `files`, `toolUsage` are auto-saved by SessionEnd hook to JSON.

## File Structure

### JSON (Log + Search Index) - Auto-saved

```json
{
  "id": "abc12345",
  "sessionId": "abc12345-...",
  "createdAt": "2026-01-27T10:00:00Z",
  "title": "JWT認証の実装",
  "tags": ["auth", "jwt"],
  "context": { ... },
  "interactions": [...],
  "metrics": { ... },
  "files": [...],
  "preCompactBackups": [...],
  "resumedFrom": "def456",
  "status": "complete"
}
```

### YAML (Structured Data) - Manual save

```yaml
version: 1
session_id: abc12345

summary:
  title: "JWT認証の実装"
  goal: "JWTベースの認証を実装"
  outcome: success  # success | partial | blocked | abandoned
  description: "RS256署名でJWT認証を実装"
  session_type: implementation  # decision | implementation | research | exploration | discussion | debug | review

plan:
  tasks:
    - "[x] JWT署名方式の選定"
    - "[x] ミドルウェア実装"
    - "[ ] テスト追加"
  remaining:
    - "テスト追加"

discussions:
  - topic: "署名方式"
    decision: "RS256を採用"
    reasoning: "本番環境でのセキュリティを考慮"
    alternatives:
      - "HS256（シンプルだが秘密鍵共有が必要）"

code_examples:
  - file: "src/auth/jwt.ts"
    description: "JWT生成関数"
    before: |
      // なし（新規作成）
    after: |
      export function generateToken(payload: JWTPayload): string {
        return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
      }

errors:
  - error: "secretOrPrivateKey must be asymmetric"
    cause: "HS256用の秘密鍵をRS256で使用"
    solution: "RS256用のキーペアを生成して使用"

handoff:
  stopped_reason: "テスト作成は次回に持ち越し"
  notes:
    - "vitest設定済み"
    - "モック用のキーペアは test/fixtures/ に配置"
  next_steps:
    - "jwt.test.ts を作成"
    - "E2Eテスト追加"

references:
  - url: "https://jwt.io/introduction"
    title: "JWT Introduction"
  - file: "docs/auth-spec.md"
    title: "認証仕様書"
```

## Execution Steps

### 1. Update Session JSON (title, tags only)

1. Get session path from additionalContext (shown at session start)
2. Read current session file
3. Update:
   - **title**: Brief descriptive title
   - **tags**: Relevant keywords from `.memoria/tags.json`

### 2. Generate Session YAML

Generate a YAML file alongside the JSON for structured data.

**File path**: `.memoria/sessions/YYYY/MM/{id}.yaml`

Extract from the conversation:
- **summary**: title, goal, outcome, description, session_type
- **plan**: tasks, remaining
- **discussions**: decisions with reasoning and alternatives
- **code_examples**: significant code changes with before/after
- **errors**: problems encountered and solutions
- **handoff**: stopped_reason, notes, next_steps
- **references**: URLs and files referenced

**Guidelines**:
- Extract information from the conversation
- Focus on what the next Claude session needs to know
- Include specific code snippets when relevant
- Document decisions and their reasoning
- Be concise but comprehensive
- **Text formatting**: Write each sentence on a single line. Do not break sentences mid-way for line length. Use line breaks only between sentences (after periods).

### 3. Extract and Save Rules

Scan the conversation for user instructions that should become persistent rules.

#### Identify Dev Rules

Look for user statements like:
- "〜を使って" / "Use X"
- "〜は禁止" / "Don't use X"
- "〜パターンで書いて" / "Write with X pattern"
- "必ず〜して" / "Always do X"

#### Identify Review Guidelines

Look for user statements like:
- "レビューで〜を確認して" / "Check X in reviews"
- "〜は指摘して" / "Point out X"
- "〜があったら警告して" / "Warn if X"

#### Duplicate Check

Before adding a new rule:
1. Read existing items in the target file
2. Compare semantically with each existing item
3. **Skip if similar rule already exists**
4. Only add if genuinely new

#### Rule Format

```json
{
  "id": "rule-{timestamp}",
  "content": "早期リターンを使用する",
  "category": "code-style",
  "source": "session:{session_id}",
  "addedAt": "2026-01-27T10:00:00Z"
}
```

Categories for dev-rules: `code-style`, `architecture`, `error-handling`, `performance`, `security`, `testing`, `other`

Categories for review-guidelines: `must-check`, `warning`, `suggestion`, `other`

### File Operations

```bash
# Session JSON (update title, tags)
Read + Edit: .memoria/sessions/YYYY/MM/{id}.json

# Session YAML (create new)
Write: .memoria/sessions/YYYY/MM/{id}.yaml

# Rules (read for duplicate check, edit to append)
Read + Edit: .memoria/rules/dev-rules.json
Read + Edit: .memoria/rules/review-guidelines.json
```

## Output Format

```
Session saved.

Session ID: abc12345

Files:
  JSON: .memoria/sessions/2026/01/abc12345.json (title, tags updated)
  YAML: .memoria/sessions/2026/01/abc12345.yaml (created)

Summary:
  Title: JWT authentication implementation
  Goal: Implement JWT-based auth with refresh token support
  Outcome: success
  Type: implementation

Rules updated:
  dev-rules.json:
    + [code-style] 早期リターンを使用する
    ~ [code-style] anyを使わない (skipped: similar rule exists)

  review-guidelines.json:
    (no changes)
```

## Notes

- Session path is shown in additionalContext at session start
- **Interactions are auto-saved by SessionEnd hook** - no need to manually save them
- JSON stores log data + search index (title, tags)
- YAML stores structured data for dashboard and AI resume
- Rules are appended (not overwritten) - duplicates are skipped
