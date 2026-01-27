---
name: resume
description: Resume a previous session. Show list if ID is omitted.
---

# /memoria:resume

Resume a previous session.

## Usage

```
/memoria:resume              # Show recent sessions
/memoria:resume <id>         # Resume specific session
/memoria:resume --type=implementation  # Filter by session type
/memoria:resume --tag=auth   # Filter by tag
/memoria:resume --days=7     # Filter by last N days
/memoria:resume --branch=feature/auth  # Filter by branch
```

### Filter Options

| Option | Description | Example |
|--------|-------------|---------|
| `--type=<type>` | Filter by sessionType (from YAML) | `--type=implementation` |
| `--tag=<tag>` | Filter by tag | `--tag=auth` |
| `--days=<n>` | Filter by last N days | `--days=7` |
| `--branch=<name>` | Filter by branch | `--branch=main` |

Multiple filters can be combined:
```
/memoria:resume --type=implementation --days=14
```

### Session Types

| Type | Description |
|------|-------------|
| `decision` | Decision cycle present |
| `implementation` | Code changes made |
| `research` | Research, learning |
| `exploration` | Codebase exploration |
| `discussion` | Discussion only |
| `debug` | Debugging |
| `review` | Code review |

## Execution Steps

1. Read all JSON files under `.memoria/sessions/` (including year/month folders)
2. For each session, check if YAML file exists for richer data
3. Apply filters if specified:
   - `--type`: Match `summary.session_type` from YAML (if exists)
   - `--tag`: Match any tag in `tags` array (JSON)
   - `--days`: Compare `createdAt` with current date
   - `--branch`: Match `context.branch` field
4. Sort by `createdAt` descending (most recent first)
5. Display filtered session list
6. If session ID specified, read the files and get details
7. **Update current session JSON with `resumedFrom` field**
8. Load session context to resume work

### File Operations

```bash
# Get session list
Glob: .memoria/sessions/**/*.json

# Read each session file
Read: .memoria/sessions/{year}/{month}/{filename}.json

# Read session YAML file if exists (for detailed context)
Read: .memoria/sessions/{year}/{month}/{filename}.yaml

# Update CURRENT session with resumedFrom
Edit: .memoria/sessions/{current_year}/{current_month}/{current_id}.json
  → Add "resumedFrom": "{resumed_session_id}"

# Filter logic (pseudo-code)
for each session:
  if --type specified:
    read YAML if exists, check summary.session_type
  if --tag specified and tag not in session.tags: skip
  if --days specified and session.createdAt < (now - days): skip
  if --branch specified and session.context.branch != branch: skip
```

## Output Format

### List View

```
Recent sessions (filtered: --type=implementation --days=14):

  1. [abc123] JWT authentication implementation (2026-01-24, feature/auth)
     Type: implementation
     Tags: [auth] [jwt] [backend]
     Interactions: 3
     Has YAML: Yes

  2. [def456] User management API (2026-01-23, feature/user)
     Type: implementation
     Tags: [user] [api]
     Interactions: 2
     Has YAML: No

Select a session to resume (1-2), or enter ID:
```

### Resume View

```
Resuming session "JWT authentication implementation"

Session chain: current ← abc123
(Updated current session with resumedFrom: abc123)

---

## From YAML (structured data):

Summary:
  Title: JWT authentication implementation
  Goal: Implement JWT-based auth with refresh token support
  Outcome: success
  Type: implementation

Plan:
  Tasks:
    - [x] JWT署名方式の選定
    - [x] ミドルウェア実装
    - [ ] テスト追加
  Remaining:
    - テスト追加

Discussions:
  - 署名方式: RS256を採用（本番環境でのセキュリティを考慮）

Handoff:
  Stopped: テスト作成は次回に持ち越し
  Notes:
    - vitest設定済み
    - モック用のキーペアは test/fixtures/ に配置
  Next:
    - jwt.test.ts を作成
    - E2Eテスト追加

Errors:
  - secretOrPrivateKey must be asymmetric → RS256用のキーペアを生成

---

## From JSON (interactions log):

[int-001] 2026-01-24T10:00:00Z
  User: Implement authentication
  Thinking: JWT would be better for microservices...
  Assistant: Implemented JWT auth with RS256 signing

[int-002] 2026-01-24T10:30:00Z
  User: What should be the refresh token expiry?
  Thinking: Balance between security and UX...
  Assistant: Set to 7 days

---

Ready to continue?
```

## Context Injection

When resuming, inject the following context:

### From YAML file (if exists) - Priority source:
1. **Summary**: title, goal, outcome, description, session_type
2. **Plan**: tasks, remaining → what was planned and what's left
3. **Discussions**: decisions with reasoning and alternatives
4. **Code examples**: significant changes with before/after
5. **Errors**: problems encountered and solutions
6. **Handoff**: stopped_reason, notes, next_steps → critical for continuity
7. **References**: documents and resources used

### From JSON file:
8. **Title/Tags**: For context if YAML doesn't exist
9. **Interactions**: Full conversation log with thinking
10. **Files**: What files were changed
11. **PreCompactBackups**: Interactions from before auto-compact (if any)

**Important**:
- If a YAML file exists alongside the JSON, READ IT FIRST. The YAML contains structured context.
- Always update the CURRENT session's JSON with `resumedFrom` to track session chains.

## Session Chain Tracking

When resuming session `abc123` in a new session `xyz789`:

1. Read current session path from additionalContext
2. Update current session JSON:
   ```json
   {
     "id": "xyz789",
     "resumedFrom": "abc123",
     ...
   }
   ```
3. This creates a chain: `xyz789 ← abc123`

The chain allows tracking related sessions over time.
