---
name: using-memoria
description: |
  Guide for using memoria plugin. Auto-loaded at session start to provide context.
user-invocable: false
---

# Using memoria

memoria is a long-term memory plugin for Claude Code.

## Setup

Initialize memoria in your project:

```bash
# From Claude Code (after /plugin add)
/init-memoria

# Or from terminal
npx @hir4ta/memoria --init
```

This creates the `.memoria/` directory with the required structure. memoria will not track sessions until initialized.

## Features

1. **Auto-save interactions**: Conversations auto-saved at session end (jq-based, no Claude needed)
2. **Auto memory search**: Related past sessions/decisions automatically injected on each prompt
3. **Manual save**: `/memoria:save` for full data extraction (interactions, summary, decisions, patterns, rules)
4. **Smart planning**: `/memoria:plan` for memory-informed design and task breakdown
5. **Session resume**: `/memoria:resume` to restore past sessions with chain tracking
6. **Knowledge search**: `/memoria:search` to find saved information
7. **Rule-based review**: `/memoria:review` for code review based on rules (supports PR URLs)
8. **Knowledge harvesting**: `/memoria:harvest` to extract rules/patterns from PR comments
9. **Weekly reports**: `/memoria:report` to generate review summary
10. **Web dashboard**: Visual management of sessions and decisions

## Core Commands

| Command | Description |
|---------|-------------|
| `/init-memoria` | Initialize memoria in current project |
| `/memoria:save` | Save all data: interactions, summary, decisions, patterns, rules |
| `/memoria:plan [topic]` | Memory-informed design + Socratic questions + task breakdown |
| `/memoria:resume [id]` | Resume session (omit ID for list) |
| `/memoria:search <query>` | Search knowledge |
| `/memoria:review [--staged\|--all\|--diff=branch\|--full]` | Rule-based review |
| `/memoria:review <PR URL>` | Review GitHub PR |
| `/memoria:harvest <PR URL>` | Extract knowledge from PR review comments |
| `/memoria:report [--from YYYY-MM-DD --to YYYY-MM-DD]` | Weekly review report |

## Session Saving

### Auto-Save (at Session End)

**Interactions are auto-saved** by SessionEnd hook to `.memoria/local.db`:

```
[Session ends] → [SessionEnd hook] → [jq extracts from transcript] → [SQLite updated]
```

Automatically saved to local.db:
- User messages
- Assistant responses (including thinking blocks)
- Tool usage
- File changes

**Auto-compact handling:** If auto-compact occurred during the session, the SessionEnd hook
automatically merges `preCompactBackups` with newly extracted interactions to preserve
the complete conversation history.

### Manual Save (`/memoria:save`)

**Run anytime** to save all session data (no need to exit first):

| Data | Destination |
|------|-------------|
| **Interactions** (conversation history) | local.db |
| Summary (title, goal, outcome) | sessions/*.json |
| Discussions → **Decisions** | decisions/*.json |
| Errors → **Patterns** | patterns/*.json |
| Dev rules | rules/dev-rules.json |
| Review guidelines | rules/review-guidelines.json |

<phases>
Execute all phases in order:
- Phase 0: Master Session (merge child sessions)
- Phase 1: Interactions (save to local.db)
- Phase 2: Summary
- Phase 3: Decisions
- Phase 4: Patterns
- Phase 5: Rules (scan for explicit instructions and implicit technical standards)
</phases>

### Auto Memory Search

**On every prompt**, memoria automatically:
1. Extracts keywords from your message
2. Searches sessions/decisions/patterns/rules
3. Injects relevant context to Claude

This means past knowledge is always available without manual lookup.

## Recommended Workflow

```
plan → implement → save → review
```

1. **plan**: Design with memory lookup + Socratic questions + task breakdown
2. **implement**: Follow the plan
3. **save**: Extract decisions, patterns, rules
4. **review**: Verify against plan and code quality

## Dashboard

```bash
npx @hir4ta/memoria --dashboard
```

## Data Location

`.memoria/` directory stores all data:

```
.memoria/
├── local.db          # SQLite database (interactions - gitignored)
├── tags.json         # Tag master file
├── sessions/         # Session metadata (no interactions)
│   └── YYYY/MM/
│       └── {id}.json
├── decisions/        # Technical decisions (from /save)
│   └── YYYY/MM/
│       └── {id}.json
├── patterns/         # Error patterns (from /save)
│   └── {user}.json
├── rules/            # Dev rules / review guidelines
├── reviews/          # Review results
└── reports/          # Weekly reports
```

**Privacy**: `local.db` is gitignored (private conversations stay local).

## What Gets Saved

| Field | Trigger | Destination |
|-------|---------|-------------|
| interactions | SessionEnd or /memoria:save | local.db |
| files | SessionEnd or /memoria:save | sessions/*.json |
| metrics | SessionEnd or /memoria:save | sessions/*.json |
| title, tags | /memoria:save | sessions/*.json |
| summary | /memoria:save | sessions/*.json |
| discussions → decisions/ | /memoria:save | decisions/*.json |
| errors → patterns/ | /memoria:save | patterns/*.json |
| rules/ | /memoria:save | rules/*.json |
| handoff | /memoria:save | sessions/*.json |
| references | /memoria:save | sessions/*.json |

**Note:** `/memoria:save` saves interactions to local.db immediately - no need to exit first.

## tags.json (Tag Master)

Reference when selecting tags:

```json
{
  "version": 1,
  "tags": [
    {
      "id": "frontend",
      "label": "Frontend",
      "aliases": ["front", "client", "ui"],
      "category": "domain",
      "color": "#3B82F6"
    }
  ]
}
```
