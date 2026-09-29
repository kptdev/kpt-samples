#!/usr/bin/env bash
# Unit test: validator-branding.yaml accepts astronomy/florist, rejects everything else.
# Runs the Starlark function in isolation via `kpt fn eval`, feeding it a minimal
# ResourceList containing only the branding-config ConfigMap under test.

set -euo pipefail

source "$(dirname "$0")/_lib.sh"

require_kpt
require_file "$APP_DIR/branding/validator-branding.yaml"

VALIDATOR="$APP_DIR/branding/validator-branding.yaml"

# Run the validator against a ResourceList read from stdin.
# Echoes stderr; returns the function's exit code.
run_validator() {
  local store_type="$1"
  local stderr_file
  stderr_file=$(mktemp)
  local exit_code=0

  cat <<YAML | kpt fn eval --fn-config "$VALIDATOR" - 2>"$stderr_file" || exit_code=$?
apiVersion: config.kubernetes.io/v1
kind: ResourceList
items:
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: branding-config
      annotations:
        config.kubernetes.io/local-config: "true"
    data:
      storeType: ${store_type}
YAML

  cat "$stderr_file" >&2
  rm -f "$stderr_file"
  return "$exit_code"
}

assert_accepted() {
  local store_type="$1"
  info "expecting validator to accept storeType='${store_type}'"
  if run_validator "$store_type" >/dev/null 2>&1; then
    pass "storeType='${store_type}' was accepted"
  else
    fail "storeType='${store_type}' was rejected, but should have been accepted"
  fi
}

assert_rejected() {
  local store_type="$1"
  info "expecting validator to reject storeType='${store_type}'"
  if run_validator "$store_type" >/dev/null 2>&1; then
    fail "storeType='${store_type}' was accepted, but should have been rejected"
  else
    pass "storeType='${store_type}' was rejected"
  fi
}

echo "Running unit tests for $VALIDATOR"
echo

# Allowed values per validator-branding.yaml
assert_accepted "astronomy"
assert_accepted "florist"

# Disallowed values
assert_rejected "grocery"
assert_rejected "car-accessories"   # currently not in valid_types
assert_rejected ""                  # empty string defaults to "" which is not allowed

echo
echo "${GREEN}${BOLD}All validator unit tests passed.${RESET}"
