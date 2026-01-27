#!/usr/bin/env bash
#
# stop.sh - Stop hook for session termination
#
# This hook is called when the session is about to stop.
# It handles final session state and cleanup.
#
# Input (stdin): JSON with stop reason
# Output: JSON with continue (boolean) and optional additionalContext

set -euo pipefail

# Read stdin
input_json=$(cat)

# Extract relevant fields
stop_reason=$(echo "$input_json" | jq -r '.stop_reason // "unknown"')

# Future enhancements:
# - Check for incomplete TDD cycles
# - Warn about unsaved changes
# - Trigger final session update

# For now, allow stop without intervention
echo '{"continue": true}'
