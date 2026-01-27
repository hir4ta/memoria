---
name: using-memoria
description: How to use memoria - auto-loaded at session start
---

# Using memoria

memoria is a long-term memory plugin for Claude Code.

## Features

1. **Explicit session saving**: Save with `/memoria:save` or "save session" request
2. **Auto-fallback**: PreCompact/SessionEnd auto-save via OpenAI API (if configured)
3. **Session resume**: `/memoria:resume` to restore past sessions
4. **Decision recording**: Auto-detect at session end + `/memoria:decision` for manual recording
5. **Knowledge search**: `/memoria:search` to find saved information
6. **Rule-based review**: `/memoria:review` for code review based on rules
7. **Weekly reports**: `/memoria:report` to generate review summary
8. **Web dashboard**: Visual management of sessions and decisions
9. **Brainstorming**: `/memoria:brainstorm` for design-first workflow with Socratic questioning
10. **Planning**: `/memoria:plan` for detailed implementation plans with 2-5 min tasks
11. **TDD**: `/memoria:tdd` for strict RED-GREEN-REFACTOR enforcement
12. **Debugging**: `/memoria:debug` for systematic root cause analysis

## Recommended Workflow

```
brainstorm → plan → tdd → review
```

1. **brainstorm**: Design with Socratic questions + past memory lookup
2. **plan**: Break into 2-5 minute TDD tasks
3. **tdd**: Implement with RED → GREEN → REFACTOR
4. **review**: Verify against plan (--full) and code quality

## Session Saving

Sessions are saved **explicitly** (not automatically on every change).

### Saving Methods

| Method | Trigger | Status |
|--------|---------|--------|
| **Explicit** | `/memoria:save` or "save session" request | `complete` |
| **PreCompact** | Before Auto-Compact (API fallback) | `draft` |
| **SessionEnd** | Session end (API fallback) | `complete` |

### Status Flow

```
null (template) → draft (API saved) → complete (confirmed)
                      ↓
              explicit save → complete
```

**Note**: API fallback requires `~/.claude/memoria.json` with `openai_api_key`.

### What to Save

| Field | Description |
|-------|-------------|
| title, goal | Session purpose |
| sessionType | Session classification |
| tags | Related keywords (reference tags.json) |
| interactions | Decision cycle history (request → thinking → choice) |
| status | `complete` for explicit save |

### sessionType (Required)

Classify session type. **Always set this** even if interactions is empty.

| Value | Description |
|-------|-------------|
| `decision` | Decision cycle present (design choices, tech selection) |
| `implementation` | Code changes made |
| `research` | Research, learning, catchup |
| `exploration` | Codebase exploration |
| `discussion` | Discussion, consultation only |
| `debug` | Debugging, investigation |
| `review` | Code review |

### Session File Location

- Session ID/path: Provided via additionalContext at session start
- Session JSON: `.memoria/sessions/YYYY/MM/{id}.json`

## Commands

| Command | Description |
|---------|-------------|
| `/memoria:resume [id]` | Resume session (omit ID for list) |
| `/memoria:save` | Force flush current session |
| `/memoria:decision "title"` | Record a technical decision |
| `/memoria:search <query>` | Search knowledge |
| `/memoria:review [--staged\|--all\|--diff=branch\|--full]` | Rule-based review (--full for spec+code) |
| `/memoria:report [--from YYYY-MM-DD --to YYYY-MM-DD]` | Weekly review report |
| `/memoria:brainstorm [topic]` | Design-first Socratic questioning + memory lookup |
| `/memoria:plan [topic]` | Create implementation plan with 2-5 min TDD tasks |
| `/memoria:tdd` | Strict RED-GREEN-REFACTOR development cycle |
| `/memoria:debug` | Systematic debugging with error pattern lookup |

## Dashboard

```bash
npx @hir4ta/memoria --dashboard
```

## Data Location

`.memoria/` directory stores JSON files:

```
.memoria/
├── tags.json         # Tag master file (prevents notation variations)
├── sessions/         # Session history (interactions-based)
├── decisions/        # Technical decisions
├── rules/            # Dev rules / review guidelines
├── reviews/          # Review results
└── reports/          # Weekly reports
```

## File Operations

When executing skills, directly operate JSON files under `.memoria/`:

- **Read**: Use Read tool for `.memoria/{type}/*.json`
- **Write**: Use Write tool for `.memoria/{type}/{id}.json`
- **Search**: Use Glob + Read to find and read files

## Session JSON Schema

**interactions array** is the core structure. Each interaction represents a decision cycle (request → thinking → proposals → choice → implementation).

```json
{
  "id": "2026-01-26_abc123",
  "sessionId": "full-uuid-from-claude-code",
  "createdAt": "2026-01-26T10:00:00Z",
  "context": {
    "branch": "feature/auth",
    "projectDir": "/path/to/project",
    "user": { "name": "tanaka", "email": "tanaka@example.com" }
  },
  "title": "JWT authentication implementation",
  "goal": "Implement JWT-based auth with refresh token support",
  "tags": ["auth", "jwt", "backend"],
  "sessionType": "implementation",
  "status": "complete",
  "interactions": [
    {
      "id": "int-001",
      "topic": "Auth method selection",
      "timestamp": "2026-01-26T10:15:00Z",
      "request": "Implement authentication",
      "thinking": "Comparing JWT vs session cookies for scalability...",
      "webLinks": ["https://jwt.io/introduction"],
      "proposals": [
        { "option": "JWT", "description": "Stateless, scalable" },
        { "option": "Session Cookie", "description": "Simple" }
      ],
      "choice": "JWT",
      "reasoning": "Easy auth sharing between microservices",
      "actions": [
        { "type": "create", "path": "src/auth/jwt.ts", "summary": "JWT generation/verification" }
      ],
      "filesModified": ["src/auth/jwt.ts"]
    }
  ]
}
```

### Interaction Fields

| Field | Required | Description |
|-------|----------|-------------|
| id | ✓ | Unique identifier (int-001, int-002, ...) |
| topic | ✓ | Topic of this interaction (search keyword) |
| timestamp | ✓ | ISO8601 timestamp |
| request | | User instruction (null for error resolution) |
| problem | | Error/problem (for error resolution) |
| thinking | | Claude's thought process (lost in Auto-Compact) |
| webLinks | | Referenced URLs |
| proposals | | Options considered (option, description) |
| choice | | Final selection |
| reasoning | | Why this choice |
| actions | | Actions taken (type, path, summary) |
| filesModified | | List of modified files |

## tags.json (Tag Master File)

Prevents notation variations. Reference this when selecting tags:

1. Read `.memoria/tags.json`
2. Find matching tag from aliases
3. Use id if found (e.g., "フロント" → "frontend")
4. Add new tag to tags.json if not found
5. **Limit: 5-10 tags max, ordered by relevance (most relevant first)**

```json
{
  "version": 1,
  "tags": [
    {
      "id": "frontend",
      "label": "Frontend",
      "aliases": ["front", "フロント", "client"],
      "category": "domain",
      "color": "#3B82F6"
    }
  ]
}
```

## Decision JSON Schema

```json
{
  "id": "jwt-auth-001",
  "title": "Auth method selection",
  "decision": "Adopt JWT",
  "reasoning": "Easy auth sharing between microservices",
  "alternatives": ["Session Cookie", "OAuth2"],
  "tags": ["auth", "architecture"],
  "createdAt": "2026-01-26T10:00:00Z",
  "user": { "name": "user" },
  "source": "manual",
  "status": "active"
}
```

### status Field

| Value | Description |
|-------|-------------|
| `draft` | Auto-detected (needs review) |
| `active` | Confirmed |
| `superseded` | Replaced by later decision |
| `deprecated` | No longer recommended |

### source Field

| Value | Description |
|-------|-------------|
| `auto` | Auto-detected at session end |
| `manual` | Recorded via `/memoria:decision` |
