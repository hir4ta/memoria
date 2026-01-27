# /memoria:interactive

Interactive menu for memoria commands. Provides a guided interface for selecting memoria workflows.

## Invocation

```
/memoria:interactive    # Show interactive menu
/memoria:i              # Short alias
```

## Menu Display

When invoked, display the following menu:

```markdown
## memoria - Interactive Mode

Select an action:

  1) **Brainstorm** - Start design-first workflow with Socratic questioning
  2) **Plan** - Create implementation plan with 2-5 minute tasks
  3) **TDD** - Test-driven development with RED-GREEN-REFACTOR
  4) **Debug** - Systematic debugging with root cause analysis
  5) **Review** - Code review based on rules and spec compliance
  6) **Search** - Search sessions, decisions, and patterns
  7) **Resume** - Resume a previous session

_Enter number or command name_
```

## Workflow

1. Display the menu above
2. Wait for user input (number or command name)
3. Execute the corresponding command:
   - `1` or `brainstorm` → `/memoria:brainstorm`
   - `2` or `plan` → `/memoria:plan`
   - `3` or `tdd` → `/memoria:tdd`
   - `4` or `debug` → `/memoria:debug`
   - `5` or `review` → `/memoria:review`
   - `6` or `search` → Ask for search query, then `/memoria:search <query>`
   - `7` or `resume` → `/memoria:resume`

## Recommended Workflow

If user asks for recommendation, suggest:

```markdown
## Recommended Workflow

1. **/memoria:brainstorm** - Design and clarify requirements
2. **/memoria:plan** - Create implementation tasks
3. **/memoria:tdd** - Implement with test-first approach
4. **/memoria:review --full** - Review against spec and code quality

_Follow this workflow for best results_
```

## Quick Help

If user asks for help, show:

```markdown
## Quick Help

**Common commands:**
- `/memoria:resume` - Continue previous session
- `/memoria:search <query>` - Find past sessions/decisions
- `/memoria:save` - Force save current session

**Review options:**
- `--staged` - Review staged changes (default)
- `--all` - Review all changes
- `--full` - Two-stage review (spec + code quality)

**Resume options:**
- `--continue` - Load pending tasks
- `--type=<type>` - Filter by session type
- `--tag=<tag>` - Filter by tag
```

## Error Handling

If user enters invalid input:
- Show "Invalid selection. Please enter a number (1-7) or command name."
- Re-display the menu
