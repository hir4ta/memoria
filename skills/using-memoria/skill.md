---
name: using-memoria
description: How to use memoria - auto-loaded at session start
---

# Using memoria

memoria is a long-term memory plugin for Claude Code.

## Features

1. **Auto-save interactions**: Conversations auto-saved at session end (jq-based, no Claude needed)
2. **Summary on PreCompact**: Summary created before Auto-Compact (context 95% full)
3. **Manual save**: `/memoria:save` for summary creation and rule extraction
4. **Session resume**: `/memoria:resume` to restore past sessions
5. **Knowledge search**: `/memoria:search` to find saved information
6. **Rule-based review**: `/memoria:review` for code review based on rules
7. **Weekly reports**: `/memoria:report` to generate review summary
8. **Web dashboard**: Visual management of sessions and decisions
9. **Brainstorming**: `/memoria:brainstorm` for design-first workflow
10. **Planning**: `/memoria:plan` for detailed implementation plans
11. **TDD**: `/memoria:tdd` for RED-GREEN-REFACTOR workflow (recommended)
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

### Auto-Save (at Session End)

**Interactions are auto-saved** by SessionEnd hook using jq:

```
[Session ends] → [SessionEnd hook] → [jq extracts from transcript] → [JSON updated]
```

Automatically saved:
- User messages
- Assistant responses (including thinking blocks)
- Tool usage
- File changes

### Summary Creation

Summary is created in these scenarios:

| Trigger | When | What |
|---------|------|------|
| **PreCompact** | Context 95% full | Claude creates summary before compact |
| **Manual** | `/memoria:save` | User requests summary + rules extraction |
| **Resume prompt** | Session resumed with no summary | Suggested in additionalContext |

### Manual Save (`/memoria:save`)

Use for:
- Creating/updating session summary
- Extracting development rules to `dev-rules.json`
- Extracting review guidelines to `review-guidelines.json`
- Generating detailed MD file for AI resume

### What Gets Saved

**Session JSON** (structured data for search/dashboard):
| Field | Auto-saved | Manual |
|-------|------------|--------|
| interactions | SessionEnd | - |
| files | SessionEnd | - |
| toolUsage | SessionEnd | - |
| summary | PreCompact | /memoria:save |
| decisions | - | /memoria:save |
| errors | - | /memoria:save |
| tags | - | /memoria:save |

**Session MD** (detailed context for AI resume):
| Section | Description |
|---------|-------------|
| 計画・タスク | Goals, task list, remaining tasks |
| 議論の経緯 | Decisions made, alternatives considered |
| コード例 | Before/after code snippets |
| 参照情報 | Documents, URLs referenced |
| 次回への引き継ぎ | Why stopped, notes, next steps |
| エラー・解決策 | Errors and solutions |

## Commands

| Command | Description |
|---------|-------------|
| `/memoria:resume [id]` | Resume session (omit ID for list) |
| `/memoria:save` | Create summary + extract rules |
| `/memoria:search <query>` | Search knowledge |
| `/memoria:review [--staged\|--all\|--diff=branch\|--full]` | Rule-based review |
| `/memoria:report [--from YYYY-MM-DD --to YYYY-MM-DD]` | Weekly review report |
| `/memoria:brainstorm [topic]` | Design-first Socratic questioning |
| `/memoria:plan [topic]` | Create implementation plan |
| `/memoria:tdd` | Strict RED-GREEN-REFACTOR cycle |
| `/memoria:debug` | Systematic debugging |

## Dashboard

```bash
npx @hir4ta/memoria --dashboard
```

## Data Location

`.memoria/` directory stores session data:

```
.memoria/
├── tags.json         # Tag master file
├── sessions/         # Session history
│   └── YYYY/MM/
│       ├── {id}.json # Structured data (search/dashboard)
│       └── {id}.md   # Detailed context (AI resume)
├── decisions/        # Technical decisions
├── rules/            # Dev rules / review guidelines
├── reviews/          # Review results
└── reports/          # Weekly reports
```

## Session JSON Schema

```json
{
  "id": "abc12345",
  "sessionId": "full-uuid",
  "createdAt": "2026-01-26T10:00:00Z",
  "context": {
    "branch": "feature/auth",
    "projectDir": "/path/to/project",
    "user": { "name": "user" }
  },
  "summary": {
    "title": "JWT authentication implementation",
    "goal": "Implement JWT-based auth",
    "outcome": "success",
    "description": "Implemented JWT auth with RS256 signing"
  },
  "interactions": [
    {
      "timestamp": "2026-01-26T10:15:00Z",
      "user": "Implement authentication",
      "assistant": "Implemented JWT auth with RS256 signing",
      "thinking": "Key insights from thinking process"
    }
  ],
  "metrics": {
    "userMessages": 5,
    "assistantResponses": 5,
    "thinkingBlocks": 5,
    "toolUsage": [{"name": "Edit", "count": 3}]
  },
  "files": [
    {"path": "src/auth.ts", "action": "create"}
  ],
  "decisions": [...],
  "errors": [...],
  "tags": ["auth", "jwt"],
  "sessionType": "implementation",
  "status": "complete"
}
```

### sessionType Values

| Value | Description |
|-------|-------------|
| `decision` | Design choices, tech selection |
| `implementation` | Code changes made |
| `research` | Research, learning |
| `exploration` | Codebase exploration |
| `discussion` | Discussion only |
| `debug` | Debugging, investigation |
| `review` | Code review |

## tags.json (Tag Master)

Reference when selecting tags to prevent notation variations:

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
  "status": "active"
}
```

### status Values

| Value | Description |
|-------|-------------|
| `draft` | Auto-detected (needs review) |
| `active` | Confirmed |
| `superseded` | Replaced by later decision |
| `deprecated` | No longer recommended |
