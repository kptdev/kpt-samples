#!/usr/bin/env bash
# Shared helpers for the branding test suite.
# Source this from each test script:  source "$(dirname "$0")/_lib.sh"

# Locate the repository root (parent of the tests/ directory).
TEST_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$TEST_LIB_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/app"
BRANDING_CONFIG="$APP_DIR/branding/branding-config.yaml"

if command -v tput >/dev/null 2>&1 && [ -t 1 ]; then
  GREEN=$(tput setaf 2)
  RED=$(tput setaf 1)
  YELLOW=$(tput setaf 3)
  BLUE=$(tput setaf 4)
  BOLD=$(tput bold)
  RESET=$(tput sgr0)
else
  GREEN=""
  RED=""
  YELLOW=""
  BLUE=""
  BOLD=""
  RESET=""
fi

pass() {
  echo "${GREEN}PASS${RESET}: $1"
}

fail() {
  echo "${RED}FAIL${RESET}: $1" >&2
  exit 1
}

info() {
  echo "${BLUE}INFO${RESET}: $1"
}

require_file() {
  if [ ! -f "$1" ]; then
    fail "expected file not found: $1"
  fi
}

require_kpt() {
  if ! command -v kpt >/dev/null 2>&1; then
    fail "kpt CLI not found on PATH — install from https://kpt.dev/installation/kpt-cli"
  fi
}

# Read the current storeType from branding-config.yaml.
# Echoes the trimmed value (e.g. "astronomy").
current_store_type() {
  grep -E '^[[:space:]]*storeType:' "$BRANDING_CONFIG" \
    | head -n 1 \
    | sed -E 's/^[[:space:]]*storeType:[[:space:]]*//'
}

# Replace the storeType value in branding-config.yaml in place.
set_store_type() {
  local new_value="$1"
  # Match the line and rewrite only the value, preserving indentation.
  sed -i -E "s|(^[[:space:]]*storeType:[[:space:]]*).*$|\1${new_value}|" "$BRANDING_CONFIG"
}

# Restore branding-config to its pre-test storeType and re-render so that
# rendered outputs (value-store, active-postgresql-init, etc.) match.
# Registers itself as an EXIT trap; safe to call once per test.
register_cleanup() {
  local original="$1"
  trap '{
    set +e
    set_store_type "'"$original"'"
    kpt fn render "'"$APP_DIR"'" >/dev/null 2>&1
    info "restored storeType to '"$original"' and re-rendered"
  }' EXIT
}

# Run kpt fn render with stderr captured. Echoes the captured stderr so callers
# can assert on error messages; returns the function's exit code.
render_app() {
  local stderr_file
  stderr_file=$(mktemp)
  local exit_code=0
  kpt fn render "$APP_DIR" 2>"$stderr_file" || exit_code=$?
  cat "$stderr_file"
  rm -f "$stderr_file"
  return "$exit_code"
}
