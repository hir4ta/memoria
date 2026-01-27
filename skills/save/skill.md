---
name: save
description: Force flush current session state to JSON.
---

# /memoria:save

Explicitly save current session state and extract rules from conversation.

## Usage

```
/memoria:save
```

## What Gets Saved

| Target | Content |
|--------|---------|
| Session JSON | summary, metrics, files, decisions, errors, tags |
| dev-rules.json | Development rules mentioned in conversation |
| review-guidelines.json | Review guidelines mentioned in conversation |

## Session JSON Structure

The session uses an **analysis-friendly structure** with separated quantitative and qualitative data.

```json
{
  "id": "abc12345",
  "sessionId": "full-uuid",
  "createdAt": "2026-01-27T10:00:00Z",
  "endedAt": "2026-01-27T11:30:00Z",
  "context": { "branch": "...", "projectDir": "...", "user": {...} },

  "summary": {
    "title": "JWT認証の実装",
    "goal": "JWTベースの認証機能を実装",
    "outcome": "success",
    "description": "JWTを使った認証機能を実装。RS256署名エラーを解決"
  },

  "metrics": {
    "durationMinutes": 90,
    "filesCreated": 2,
    "filesModified": 1,
    "filesDeleted": 0,
    "decisionsCount": 2,
    "errorsEncountered": 1,
    "errorsResolved": 1
  },

  "files": [...],
  "decisions": [...],
  "errors": [...],
  "webLinks": [...],
  "tags": [...],
  "sessionType": "implementation",
  "status": "complete"
}
```

## Execution Steps

### 1. Save Session

1. Get session path from additionalContext
2. Extract from current conversation:

**summary** (narrative):
- title: Session purpose (max 50 chars)
- goal: What we're trying to achieve
- outcome: `success` | `partial` | `abandoned`
- description: Brief summary (1-2 sentences)

**metrics** (quantitative):
- Count files created/modified/deleted
- Count decisions made
- Count errors encountered/resolved
- Calculate duration (endedAt - createdAt)

**files** (structured array):
```json
{ "path": "src/auth/jwt.ts", "action": "create", "summary": "JWT module" }
```

**decisions** (structured array):
```json
{
  "id": "dec-001",
  "topic": "認証方式",
  "choice": "JWT",
  "alternatives": ["セッションCookie"],
  "reasoning": "マイクロサービス間の認証共有が容易",
  "timestamp": "2026-01-27T10:15:00Z"
}
```

**errors** (structured array):
```json
{
  "id": "err-001",
  "message": "JWT署名エラー: ...",
  "type": "runtime",
  "file": "src/auth/jwt.ts",
  "resolved": true,
  "solution": "RS256用の鍵形式に変更",
  "timestamp": "2026-01-27T11:00:00Z"
}
```

**Other fields**:
- webLinks: URLs referenced
- tags: Keywords (reference tags.json)
- sessionType: decision|implementation|research|exploration|discussion|debug|review
- status: "complete"

### 2. Extract and Save Rules

Scan the conversation for user instructions that should become persistent rules.

#### Identify Dev Rules

Look for user statements like:
- "〜を使って" / "Use X"
- "〜は禁止" / "Don't use X"
- "〜パターンで書いて" / "Write with X pattern"
- "〜は避けて" / "Avoid X"
- "必ず〜して" / "Always do X"

#### Identify Review Guidelines

Look for user statements like:
- "レビューで〜を確認して" / "Check X in reviews"
- "〜は指摘して" / "Point out X"
- "〜があったら警告して" / "Warn if X"

#### Duplicate Check (Semantic Similarity)

Before adding a new rule:
1. Read existing items in the target file
2. Compare semantically with each existing item
3. **Skip if similar rule already exists** (same intent, different wording)
4. Only add if genuinely new

#### Update Rules Files

For each new rule found:

```json
{
  "id": "rule-{timestamp}",
  "content": "早期リターンを使用する",
  "category": "code-style",
  "source": "session:{session_id}",
  "addedAt": "2026-01-27T10:00:00Z"
}
```

Categories for dev-rules:
- `code-style`: Formatting, naming, patterns
- `architecture`: Structure, dependencies, modules
- `error-handling`: Exceptions, validation, fallbacks
- `performance`: Optimization, caching
- `security`: Auth, validation, sanitization
- `testing`: Test patterns, coverage
- `other`: Misc

Categories for review-guidelines:
- `must-check`: Critical items to always verify
- `warning`: Patterns that should trigger warnings
- `suggestion`: Nice-to-have improvements
- `other`: Misc

### 3. Handle Rule Modifications

Also scan for user requests to modify existing rules.

#### Delete Rules

Look for:
- "〜のルールを削除して" / "Delete the X rule"
- "〜は不要" / "X is no longer needed"

Action: Set `status: "deprecated"` on matching rule

#### Edit Rules

Look for:
- "〜のルールを〜に変更して" / "Change X rule to Y"
- "〜を〜に修正して" / "Update X to Y"

Action: Update `content` field of matching rule

### File Operations

```bash
# Session
Read: .memoria/sessions/YYYY/MM/{id}.json
Read: .memoria/tags.json
Write: .memoria/sessions/YYYY/MM/{id}.json

# Rules (read for duplicate check, write to append)
Read: .memoria/rules/dev-rules.json
Read: .memoria/rules/review-guidelines.json
Write: .memoria/rules/dev-rules.json (if changes)
Write: .memoria/rules/review-guidelines.json (if changes)
```

## Output Format

```
Session saved.

Session ID: abc12345
Title: JWT authentication implementation
Outcome: success
Duration: 90 minutes

Metrics:
  Files: +2 created, ~1 modified
  Decisions: 2
  Errors: 1 encountered, 1 resolved

Tags: [auth] [jwt] [backend]

Rules updated:
  dev-rules.json:
    + [code-style] 早期リターンを使用する
    ~ [code-style] anyを使わない (skipped: similar rule exists)
    - [other] 古いルール (deprecated)
    * [code-style] ルールの内容を変更 (edited)

  review-guidelines.json:
    (no changes)
```

Legend:
- `+` = Added
- `~` = Skipped (similar exists)
- `-` = Deprecated
- `*` = Edited

## Notes

- Session path is provided via additionalContext at session start
- Multiple saves overwrite session with latest state
- Rules are appended (not overwritten) - duplicates are skipped
- Explicit save includes your thinking process
- Rule deletion sets `status: "deprecated"` (soft delete for history)
- Edited rules preserve their original ID
