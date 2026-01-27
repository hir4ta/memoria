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
  "openai_api_key": "sk-...",
  "model": "gpt-5-mini"
}
```

## Configuration Options

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `openai_api_key` | No | - | OpenAI API key for auto-save (without this, only manual save works) |
| `model` | No | `gpt-5-mini` | Model to use (gpt-5-mini, gpt-5, gpt-5.2, etc.) |

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

## Model Recommendations

| Model | Cost (input/output per 1M tokens) | Notes |
|-------|-----------------------------------|-------|
| `gpt-5-mini` | $0.25 / $2 | **Recommended** - Best cost efficiency |
| `gpt-5` | $1.25 / $10 | Higher quality summaries |
| `gpt-5.2` | $1.75 / $14 | Latest model, longer context |

## Output Format

### New Installation

```
memoria configuration initialized.

Path: ~/.claude/memoria.json

{
  "openai_api_key": "sk-...",
  "model": "gpt-5-mini"
}

Next steps:
1. Edit ~/.claude/memoria.json
2. Replace "sk-..." with your OpenAI API key
3. (Optional) Change model if needed

Get your API key at: https://platform.openai.com/api-keys
```

### Already Exists

```
Configuration already exists at ~/.claude/memoria.json

Current config:
{
  "openai_api_key": "sk-***",
  "model": "gpt-5-mini"
}

Use --force to overwrite.
```

## Notes

- API key is stored in user's home directory, not in project
- File is not committed to git (outside project directory)
- Used by PreCompact and SessionEnd hooks only
