#!/usr/bin/env bash
# Regression test: the global product-ID search-replace inside
# setup-branding.yaml must never mutate resources under app/branding/.
# This guards the fix that scopes the search-replace by path.

set -euo pipefail

source "$(dirname "$0")/_lib.sh"

require_kpt
require_file "$BRANDING_CONFIG"

ORIGINAL_TYPE="$(current_store_type)"
info "original storeType is '${ORIGINAL_TYPE}'"
register_cleanup "$ORIGINAL_TYPE"

# Hash every file under app/branding/ BEFORE the render, then compare AFTER.
# Anything that changes is a leak from the search-replace (or any other
# branding-layer mutation that doesn't belong there).
hash_branding_tree() {
  # sha256sum is portable on Linux + macOS (coreutils on mac).
  ( cd "$APP_DIR/branding" && find . -type f -print0 \
      | sort -z \
      | xargs -0 sha256sum )
}

BEFORE="$(hash_branding_tree)"
info "captured ${BEFORE//$'\n'/ } pre-render hashes"

# Render with florist — this is the worst case for the search-replace because
# the florist data file legitimately contains FLR001 and we don't want the
# other store's ID to bleed into it (or vice versa).
set_store_type "florist"
info "rendering app/ with storeType=florist"
render_app >/dev/null

AFTER="$(hash_branding_tree)"

if [ "$BEFORE" = "$AFTER" ]; then
  pass "no file under app/branding/ changed during render"
else
  echo "${RED}Diff in app/branding/ before vs after render:${RESET}" >&2
  diff <(echo "$BEFORE") <(echo "$AFTER") >&2 || true
  fail "search-replace (or another branding-layer mutation) touched a file under app/branding/"
fi

# Targeted spot-check: florist-postgresql-init.yaml must still carry FLR001
# (its original product ID), proving the search-replace did not rewrite it.
FLORIST_INIT="$APP_DIR/branding/florist/florist-postgresql-init.yaml"
require_file "$FLORIST_INIT"
if grep -q "FLR001" "$FLORIST_INIT"; then
  pass "florist-postgresql-init.yaml still contains FLR001"
else
  fail "florist-postgresql-init.yaml no longer contains FLR001 — it was rewritten by search-replace"
fi

echo
echo "${GREEN}${BOLD}Branding folder is correctly scoped out of the search-replace.${RESET}"
