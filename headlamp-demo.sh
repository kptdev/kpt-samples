#!/usr/bin/env bash
set -e

# Colors
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEADLAMP_DIR="${SCRIPT_DIR}/headlamp"
PORT_FORWARD_PID=""

cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        echo ""
        echo -e "\033[0;31m${BOLD}An error occurred. Running cleanup...${RESET}"
    fi
    if [[ -n "${PORT_FORWARD_PID}" ]]; then
        kill "${PORT_FORWARD_PID}" 2>/dev/null || true
    fi
    kind delete cluster --name kpt-demo 2>/dev/null || true
    rm -rf "${HEADLAMP_DIR}"
}
trap cleanup EXIT

banner() {
    echo ""
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${CYAN}${BOLD}  $1${RESET}"
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo ""
}

run() {
    echo -e "${GREEN}> $*${RESET}"
    "$@"
}

pause() {
    echo ""
    read -rp "Press Enter to continue to the next step..."
    echo ""
}

# ─── Step 1 ───────────────────────────────────────────────────────────────────
banner "Step 1: Create kind cluster 'kpt-demo'"

run kind create cluster --name kpt-demo

pause

# ─── Step 2 ───────────────────────────────────────────────────────────────────
banner "Step 2: Download headlamp KRM file and initialize kpt package"

run mkdir -p "${HEADLAMP_DIR}"
cd "${HEADLAMP_DIR}"

run curl -sLO https://raw.githubusercontent.com/kubernetes-sigs/headlamp/main/kubernetes-headlamp.yaml

echo -e "${BOLD}# Generating security configuration${RESET}"
echo -e "${GREEN}> Generating headlamp-admin-sa.yaml${RESET}"
cat > headlamp-admin-sa.yaml <<'EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: headlamp-admin
  namespace: kube-system
EOF

echo -e "${GREEN}> Generating headlamp-admin-crb.yaml${RESET}"
cat > headlamp-admin-crb.yaml <<'EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: headlamp-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: headlamp-admin
    namespace: kube-system
EOF

run kpt pkg init

pause

# ─── Step 3 ───────────────────────────────────────────────────────────────────
banner "Step 3: Add set-label mutator pipeline to Kptfile"

echo -e "${GREEN}> Appending pipeline block to Kptfile${RESET}"
cat >> Kptfile <<'EOF'
pipeline:
  mutators:
    - image: ghcr.io/kptdev/krm-functions-catalog/set-labels:v0.1.5
      configMap:
        k8s-app: headlamp-kpt-demo
EOF

echo "Kptfile now contains:"
cat Kptfile

pause

# ─── Step 4 ───────────────────────────────────────────────────────────────────
banner "Step 4: Run kpt fn render"

run kpt fn render

pause

# ─── Step 5 ───────────────────────────────────────────────────────────────────
banner "Step 5: Deploy to cluster, expose port, and create service account token"

run kpt live init
run kpt live apply --output=table --reconcile-timeout=5m

echo ""
echo -e "${GREEN}> kubectl port-forward -n kube-system service/headlamp 8080:80 &${RESET}"
kubectl port-forward -n kube-system service/headlamp 8080:80 &
PORT_FORWARD_PID=$!
echo "Port-forward running (PID: ${PORT_FORWARD_PID})"

echo ""
echo -e "${GREEN}> kubectl create token headlamp-admin -n kube-system${RESET}"
TOKEN=$(kubectl create token headlamp-admin -n kube-system)

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  Headlamp is available at: http://localhost:8080${RESET}"
echo -e "${BOLD}  Access token:${RESET}"
echo ""
echo "${TOKEN}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

pause

# ─── Step 6 ───────────────────────────────────────────────────────────────────
banner "Step 6: Cleanup"

# The EXIT trap handles cleanup; just print a message and exit cleanly.
echo -e "${BOLD}Demo complete. Cluster deleted and package removed.${RESET}"
