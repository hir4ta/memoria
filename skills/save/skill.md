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
3. **Generate MD file** - Create detailed markdown context for future resume

## Usage

```
/memoria:save
```

## What Gets Saved

| Target | Content |
|--------|---------|
| Session JSON | summary, metrics, sessionType, tags |
| Session MD | Detailed context for AI (plans, discussions, code examples, handoff notes) |
| dev-rules.json | Development rules mentioned in conversation |
| review-guidelines.json | Review guidelines mentioned in conversation |

**Note:** `interactions`, `files`, `toolUsage` are auto-saved by SessionEnd hook.

## Session JSON Structure

```json
{
  "id": "abc12345",
  "summary": {
    "title": "JWT認証の実装",
    "goal": "JWTベースの認証機能を実装",
    "outcome": "success",
    "description": "JWTを使った認証機能を実装。RS256署名エラーを解決"
  },
  "interactions": [...],  // Auto-saved by SessionEnd
  "metrics": { ... },
  "files": [...],         // Auto-saved by SessionEnd
  "decisions": [...],
  "errors": [...],
  "tags": [...],
  "sessionType": "implementation",
  "status": "complete"
}
```

## Execution Steps

### 1. Update Session JSON

1. Get session path from additionalContext (shown at session start)
2. Read current session file
3. Update/add:
   - **summary**: title, goal, outcome, description
   - **metrics**: Update counts if needed
   - **decisions**: Technical decisions with reasoning (if any new ones)
   - **errors**: Errors encountered and solutions (if any new ones)
   - **tags**: Relevant keywords from .memoria/tags.json
   - **sessionType**: decision, implementation, research, exploration, discussion, debug, review

### 2. Extract and Save Rules

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

### 3. Generate Session MD File

Generate a markdown file alongside the JSON for detailed context preservation.

**File path**: `.memoria/sessions/YYYY/MM/{id}.md`

**Template**:

```markdown
# {title}

**Session ID:** {id}
**Date:** {createdAt}
**Status:** {status}
**Branch:** {branch}

---

## 計画・タスク

### 目標
{goal from conversation}

### タスクリスト
- [ ] Task 1
- [x] Task 2 (completed)

### 残タスク
{incomplete tasks if any}

---

## 議論の経緯

### 決定事項
| 項目 | 決定 | 理由 |
|------|------|------|
{decisions made during session}

### 検討した代替案
{alternatives considered with reasons}

---

## コード例

### 変更箇所
**ファイル:** `path/to/file.ts`

\`\`\`typescript
// Before
{original code}

// After
{modified code}
\`\`\`

---

## 参照情報

{documents, URLs, resources referenced}

---

## 次回への引き継ぎ

### 中断理由
{why session ended}

### 再開時の注意点
{things to be aware of when resuming}

### 次にやること
{next steps}

---

## エラー・解決策

| エラー | 原因 | 解決策 |
|--------|------|--------|
{errors encountered and how they were resolved}
```

**Guidelines**:
- Extract information from the conversation
- Focus on what the next Claude session needs to know
- Include specific code snippets when relevant
- Document decisions and their reasoning
- Be concise but comprehensive

### File Operations

```bash
# Session JSON
Read + Edit: .memoria/sessions/YYYY/MM/{id}.json

# Session MD (new)
Write: .memoria/sessions/YYYY/MM/{id}.md

# Rules (read for duplicate check, edit to append)
Read + Edit: .memoria/rules/dev-rules.json
Read + Edit: .memoria/rules/review-guidelines.json
```

## Output Format

```
Session saved.

Session ID: abc12345
Title: JWT authentication implementation
Outcome: success

Files:
  JSON: .memoria/sessions/2026/01/abc12345.json
  MD:   .memoria/sessions/2026/01/abc12345.md

Summary:
  Title: JWT authentication implementation
  Goal: Implement JWT-based auth with refresh token support
  Outcome: success

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
- Use this command for summary creation and rule extraction
- Rules are appended (not overwritten) - duplicates are skipped
- MD file is generated alongside JSON for detailed context
- MD file contains plans, discussions, code examples - everything needed to resume
