---
name: review
description: Code review based on repository-specific rules (`dev-rules.json` / `review-guidelines.json`).
---

# /memoria:review

Code review based on repository-specific rules (`dev-rules.json` / `review-guidelines.json`).

## Usage

```
/memoria:review           # Default: --staged
/memoria:review --staged  # Review staged changes
/memoria:review --all     # Review all changes
/memoria:review --diff=main  # Review diff against branch
```

### Default Behavior

- **`--staged` is default**
- If staged is empty, suggest `--all` / `--diff=branch`

## Execution Steps

1. **Get target diff**
   - `--staged`: `git diff --staged`
   - `--all`: `git diff`
   - `--diff=branch`: `git diff <branch>...HEAD`
2. **Load rules**
   - `.memoria/rules/dev-rules.json`
   - `.memoria/rules/review-guidelines.json`
3. **Filter applicable rules**
   - Only `status: active`
   - Filter by `scope / tags / appliesTo / exceptions`
4. **Generate findings**
   - Extract where rules match the diff
   - Determine severity from `priority`
5. **Output review**
   - Structure: Blocker / Warning / Suggestion
6. **Save review result**
   - `.memoria/reviews/YYYY/MM/review-YYYY-MM-DD_HHMMSS.json`

## Additional Review Perspectives (Required)

### Document-Code Consistency

- Verify changes match **all documentation**
- If spec documents exist, **always reference**:
  - Files/dirs containing `spec` / `requirements` / `design` / `architecture` / `adr` / `decision` / `workflow` / `contract`
  - Common doc locations: `docs/`, `documentation/`, `design/`, `spec/`, `requirements/`
  - Root docs: `README*`, `DEVELOPER*`, `ARCHITECTURE*`, `CONTRIBUTING*`, `SPEC*`, `ADR*`
  - If not found, **ask user for location** before proceeding

### Language/Framework Best Practices

- Check against language/framework conventions for changed files
- When uncertain, **research official docs** and cite source
  - e.g., React / TypeScript / Hono / Node official docs
  - Mark as **"needs investigation"** if uncertain

## Rule Application Guidelines

### scope Determination (from path)

- `dashboard/` → `dashboard`
- `hooks/` → `hooks`
- `skills/` → `skills`
- `dashboard/server/` → `server`
- `config`/`env`/`tsconfig`/`vite.config` → `config`
- Other → `general`

### tags Assignment (from path or diff content)

- `ui` (dashboard/react/css)
- `api` (server/api)
- `quality` (lint/test/build)
- `security` (auth/secret/token)
- `docs` (README/docs/*.md)
- `release` (version/changelog)

### appliesTo / exceptions Handling

- If `appliesTo` exists, apply only when **scope/tags/path** matches
- If `exceptions` matches, **exclude**

### tokens Handling

- If `tokens` exists, only target those appearing in diff
- If not appearing, **skip to avoid noise**

## Severity Mapping

| priority | severity |
|----------|----------|
| p0 | Blocker |
| p1 | Warning |
| p2 | Suggestion |

## Output Format (Markdown)

```
# Review: {target}

## Summary
- Blocker: N
- Warning: N
- Suggestion: N
- Matched rules: X (of Y)
- New rule proposals: Z

## Findings

### Blocker
1. {short title}
   - File: path/to/file.ts:123
   - Evidence: {diff snippet}
   - Rule: {rule.id} / {rule.text}
   - Rationale: {rule.rationale}

### Warning
...

### Suggestion
...

## Rule Coverage
- Applied: {rule ids}
- Skipped (scope mismatch): {rule ids}

## Rule Proposals
- {proposal} (source: {which finding triggered this})

## Stale Rules
- {rule.id} (lastSeenAt: YYYY-MM-DD)
```

## Review JSON Format

Save to `.memoria/reviews/YYYY/MM/review-YYYY-MM-DD_HHMMSS.json`:

```json
{
  "id": "review-2026-01-25_145500",
  "createdAt": "2026-01-25T14:55:00Z",
  "target": {
    "type": "staged",
    "branch": "main"
  },
  "summary": {
    "blocker": 1,
    "warning": 2,
    "suggestion": 3,
    "matchedRules": 4,
    "totalRules": 10,
    "newRuleProposals": 1
  },
  "findings": [
    {
      "id": "finding-001",
      "severity": "blocker",
      "title": "Hardcoded production secret",
      "ruleId": "review-2026-01-24_abc123-0",
      "ruleText": "Secrets should be in environment variables",
      "rationale": "Avoid leak risk",
      "file": "src/config.ts",
      "line": 42,
      "evidence": "API_KEY = \"xxx\""
    }
  ],
  "coverage": {
    "appliedRuleIds": ["review-2026-01-24_abc123-0"],
    "skippedRuleIds": ["dev-2026-01-20_def456-1"]
  },
  "proposals": [
    {
      "text": "API client must always set timeout",
      "fromFindingIds": ["finding-002"]
    }
  ],
  "staleRules": [
    { "id": "dev-2025-12-01_aaa111-0", "lastSeenAt": "2025-12-05T00:00:00Z" }
  ],
  "context": {
    "projectDir": "/path/to/project",
    "branch": "main"
  }
}
```
