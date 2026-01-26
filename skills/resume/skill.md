---
name: resume
description: Resume a previous session. Show list if ID is omitted.
---

# /memoria:resume

Resume a previous session.

## Usage

```
/memoria:resume        # Show session list
/memoria:resume <id>   # Resume specific session
```

## Execution Steps

1. Read all JSON files under `.memoria/sessions/` (including year/month folders)
2. Display session list to user
3. If session ID specified, read the file and get details
4. Load session context (title, goal, interactions) to resume work

### File Operations

```bash
# Get session list
Glob: .memoria/sessions/**/*.json

# Read each session file
Read: .memoria/sessions/{year}/{month}/{filename}.json
```

## Output Format

### List View

```
Recent sessions:
  1. [abc123] JWT authentication implementation (2026-01-24, feature/auth)
     [auth] [jwt] [backend]
     interactions: 3

  2. [def456] User management API (2026-01-23, feature/user)
     [user] [api]
     interactions: 2

Select a session to resume (1-3), or enter ID:
```

### Resume View

```
Resuming session "JWT authentication implementation"

Goal:
  Implement JWT-based auth with refresh token support

Previous decision cycles:

  [int-001] Auth method selection
    Request: Implement authentication
    Choice: JWT (easy auth sharing between microservices)
    Modified: src/auth/jwt.ts, src/auth/middleware.ts

  [int-002] Refresh token expiry
    Request: What should be the refresh token expiry?
    Choice: 7 days (balance between security and UX)
    Modified: src/auth/config.ts

  [int-003] JWT signing error resolution
    Problem: secretOrPrivateKey must be asymmetric
    Choice: Change to RS256 key format (production security)
    Modified: src/auth/jwt.ts

Ready to continue?
```

## Context Injection

When resuming, inject the following context:

1. **Purpose**: title, goal → understand session objective
2. **Progress**: interactions → what's been decided
3. **Thinking**: interactions[].thinking → reasoning behind decisions
4. **Problems solved**: interactions[].problem → errors encountered
5. **Files changed**: interactions[].filesModified → what's been modified
