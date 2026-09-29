#!/usr/bin/env bash
# Integration test: with the default storeType=astronomy, kpt fn render app/
# leaves every upstream image in shop/ untouched (idempotent default).
# Mirrors Section 8.1 of phase-3-implementation-plan.md.

set -euo pipefail

source "$(dirname "$0")/_lib.sh"

require_kpt
require_file "$BRANDING_CONFIG"

info "rendering app/ with default branding-config (no edits)"
render_app >/dev/null

info "asserting upstream images in shop/ are unchanged"

# Spot-check a few representative services. If any of these have been swapped
# for florist variants, the default render is no longer a no-op.
check_upstream_image() {
  local service="$1"
  local deployment="$APP_DIR/shop/${service}/deployment_${service}.yaml"
  require_file "$deployment"
  if grep -Eq "image:[[:space:]]*ghcr\\.io/open-telemetry/demo:2\\.2\\.0-${service}([[:space:]]|$)" "$deployment"; then
    pass "${service}: upstream image preserved"
  else
    fail "${service}: upstream image is missing or was replaced — render is not idempotent"
  fi
}

check_upstream_image frontend
check_upstream_image ad
check_upstream_image image-provider
check_upstream_image load-generator

info "asserting product ID in shop/flagd matches the astronomy value (L9ECAV7KIM)"
FLAGD_CONFIG="$APP_DIR/shop/flagd/configmap_flagd-config.yaml"
require_file "$FLAGD_CONFIG"
if grep -q "L9ECAV7KIM" "$FLAGD_CONFIG"; then
  pass "flagd-config: astronomy product ID present"
else
  fail "flagd-config: astronomy product ID (L9ECAV7KIM) missing — search-replace overwrote it"
fi

echo
echo "${GREEN}${BOLD}Astronomy render is idempotent.${RESET}"
