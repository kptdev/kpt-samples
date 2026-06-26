#!/usr/bin/env bash
# Integration test: switching storeType to "florist" and rendering propagates
# the florist images, product ID, and catalog SQL into the shop/ resources.
# Mirrors Section 8.2 of phase-3-implementation-plan.md.

set -euo pipefail

source "$(dirname "$0")/_lib.sh"

require_kpt
require_file "$BRANDING_CONFIG"

ORIGINAL_TYPE="$(current_store_type)"
if [ -z "$ORIGINAL_TYPE" ]; then
  fail "could not read storeType from $BRANDING_CONFIG"
fi
info "original storeType is '${ORIGINAL_TYPE}'"
register_cleanup "$ORIGINAL_TYPE"

# Switch to florist and render.
set_store_type "florist"
info "rendering app/ with storeType=florist"
render_app >/dev/null

# --- Image propagation ---------------------------------------------------
info "asserting florist container images propagated into shop/"

check_image() {
  local service="$1" expected="$2"
  local deployment="$APP_DIR/shop/${service}/deployment_${service}.yaml"
  require_file "$deployment"
  if grep -Eq "image:[[:space:]]*${expected}([[:space:]]|$)" "$deployment"; then
    pass "${service}: image=${expected}"
  else
    fail "${service}: expected image '${expected}' not found in $deployment"
  fi
}

check_image frontend          "florist-frontend:v1"
check_image ad                "florist-ad:v1"
check_image image-provider    "florist-image-provider:v1"
check_image llm               "florist-llm:v1"
check_image load-generator    "florist-load-generator:v1"

# --- Product ID substitution ---------------------------------------------
info "asserting florist product ID (FLR001) reached shop/flagd/"
FLAGD_CONFIG="$APP_DIR/shop/flagd/configmap_flagd-config.yaml"
require_file "$FLAGD_CONFIG"
if grep -q "FLR001" "$FLAGD_CONFIG"; then
  pass "flagd-config: FLR001 present"
else
  fail "flagd-config: FLR001 not found — search-replace did not run"
fi

if grep -q "L9ECAV7KIM" "$FLAGD_CONFIG"; then
  fail "flagd-config: astronomy product ID (L9ECAV7KIM) still present — search-replace did not complete"
else
  pass "flagd-config: astronomy product ID was replaced"
fi

# --- Catalog SQL swap ----------------------------------------------------
info "asserting florist catalog SQL reached shop/postgresql/"
POSTGRES_CONFIG="$APP_DIR/shop/postgresql/configmap_postgresql-init.yaml"
require_file "$POSTGRES_CONFIG"
if grep -q "FLR001" "$POSTGRES_CONFIG"; then
  pass "postgresql-init: florist product data present"
else
  fail "postgresql-init: florist product data (FLR001) missing — ApplyReplacements did not propagate SQL"
fi

echo
echo "${GREEN}${BOLD}Florist render applied branding correctly.${RESET}"
