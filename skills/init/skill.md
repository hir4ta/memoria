---
name: init
description: Initialize memoria configuration file (~/.claude/memoria.json).
---

# /memoria:init

Initialize memoria configuration file for API-based session saving.

## Usage

```
/memoria:init
```

## What This Does

Creates `~/.claude/memoria.json` with a template configuration:

```json
{
  "openai_api_key": "sk-..."
}
```

## Configuration Options

| Key | Required | Description |
|-----|----------|-------------|
| `openai_api_key` | No | OpenAI API key for auto-save (without this, only manual save works) |

## Execution Steps

1. Check if `~/.claude/memoria.json` already exists
2. If exists: Show current config and ask if user wants to overwrite
3. If not exists: Create the file with template

### File Operations

```bash
# Check existence
Read: ~/.claude/memoria.json (may not exist)

# Create config
Write: ~/.claude/memoria.json
```

## Why This Is Needed

Session auto-saving at PreCompact and SessionEnd uses OpenAI API to summarize the conversation. Without this configuration:

- PreCompact hook skips auto-save
- SessionEnd hook skips API fallback
- Only explicit `/memoria:save` works (Claude writes JSON directly)

## Output Format

### New Installation

```
memoria configuration initialized.

Path: ~/.claude/memoria.json

{
  "openai_api_key": "sk-..."
}

Next steps:
1. Edit ~/.claude/memoria.json
2. Replace "sk-..." with your OpenAI API key

Get your API key at: https://platform.openai.com/api-keys
```

### Already Exists

```
Configuration already exists at ~/.claude/memoria.json

Current config:
{
  "openai_api_key": "sk-***"
}

Use --force to overwrite.
```

## Notes

- API key is stored in user's home directory, not in project
- File is not committed to git (outside project directory)
- Used by PreCompact and SessionEnd hooks only
