#!/usr/bin/env bash
#
# post-tool-use.sh - Post-tool use hook for Bash operations
#
# This hook is called after Bash tool execution.
# It detects errors and suggests /memoria:debug for systematic debugging.
#
# Input (stdin): JSON with tool_name, tool_input, tool_result
# Output: JSON with continue (boolean) and optional additionalContext

set -euo pipefail

# Read stdin
input_json=$(cat)

# Extract relevant fields
exit_code=$(echo "$input_json" | jq -r '.tool_result.exit_code // 0')
stderr=$(echo "$input_json" | jq -r '.tool_result.stderr // ""')
command=$(echo "$input_json" | jq -r '.tool_input.command // ""')

# Check for error conditions
if [[ "$exit_code" != "0" && -n "$stderr" ]]; then
  # Error detected - suggest debug skill

  # Escape stderr for JSON
  escaped_stderr=$(echo "$stderr" | head -c 200 | jq -Rs '.')

  # Build suggestion message
  suggestion="Error detected (exit code: $exit_code). Consider using /memoria:debug for systematic root cause analysis."

  # Output with additionalContext
  echo "{\"continue\": true, \"additionalContext\": \"$suggestion\"}"
else
  # No error - continue normally
  echo '{"continue": true}'
fi
