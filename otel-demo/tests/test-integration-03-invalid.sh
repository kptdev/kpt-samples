#!/usr/bin/env bash
# Integration test: an invalid storeType causes kpt fn render to fail with a
# non-zero exit code. Mirrors Section 8.3 of phase-3-implementation-plan.md.

set -euo pipefail

source "$(dirname "$0")/_lib.sh"

require_kpt
require_file "$BRANDING_CONFIG"

ORIGINAL_TYPE="$(current_store_type)"
info "original storeType is '${ORIGINAL_TYPE}'"
register_cleanup "$ORIGINAL_TYPE"

# Pick an invalid value that is definitely not in the allowed set.
INVALID_TYPE="grocery"

set_store_type "$INVALID_TYPE"
info "rendering app/ with invalid storeType='${INVALID_TYPE}' — expect failure"

stderr_output="$(render_app 2>&1)"
render_exit=$?

if [ "$render_exit" -eq 0 ]; then
  fail "kpt fn render succeeded for invalid storeType '${INVALID_TYPE}' but should have failed"
fi

pass "kpt fn render failed with exit code ${render_exit} as expected"

# The validator's fail() message should mention the invalid value.
if echo "$stderr_output" | grep -q "${INVALID_TYPE}"; then
  pass "stderr mentions the rejected storeType '${INVALID_TYPE}'"
else
  echo "${YELLOW}WARN${RESET}: stderr did not mention '${INVALID_TYPE}' — see below for actual output"
  echo "----- captured stderr -----"
  echo "$stderr_output"
  echo "---------------------------"
  # Not a hard failure — the validator might surface the value differently
  # across kpt versions. The non-zero exit code is the load-bearing signal.
fi

echo
echo "${GREEN}${BOLD}Invalid storeType correctly rejected by the validator.${RESET}"
