# nginx-shop — How to run

A lightweight, buildless demo: stock nginx serves a static storefront; a KRM
function switches store (astronomy | florist) and locale (en-US | hi-IN | cs-CZ |
zh-CN). For what it is and how it works, see [README.md](./README.md).

Install the tools in order: **container runtime → kind → kubectl → kpt** (kind
runs the cluster in a container runtime, and `kpt fn render` runs the KRM
functions as containers, so the runtime must be working first).

---

## 1. Install a container runtime

Install Docker for your environment following the official guide:
<https://docs.docker.com/engine/install/>. Then verify:

```bash
docker run --rm hello-world
```

Podman is also supported — both `kind` and `kpt fn render` work with it. If you
use Podman, set `export KIND_EXPERIMENTAL_PROVIDER=podman` and
`export KRM_FN_RUNTIME=podman`.

## 2. Install `kind`

**Linux:**

```bash
A=$([ "$(uname -m)" = aarch64 ] && echo arm64 || echo amd64)
curl -Lo ./kind "https://kind.sigs.k8s.io/dl/v0.33.0/kind-linux-${A}"
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind
kind version
```

**macOS:**

```bash
brew install kind
# or: A=$([ "$(uname -m)" = arm64 ] && echo arm64 || echo amd64)
#     curl -Lo ./kind "https://kind.sigs.k8s.io/dl/v0.33.0/kind-darwin-${A}"
#     chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind
```

## 3. Install `kubectl`

**Linux:**

```bash
A=$([ "$(uname -m)" = aarch64 ] && echo arm64 || echo amd64)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/${A}/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/kubectl
kubectl version --client
```

**macOS:**

```bash
brew install kubectl
```

## 4. Install `kpt`

Follow the official binary install instructions for your platform:
<https://kpt.dev/installation/kpt-cli/#binaries>. Then verify:

```bash
kpt version
```

## 5. Create a cluster

```bash
kind create cluster --name nginx-shop
```

## 6. Get the package

Fetch this package with `kpt`, then enter it:

```bash
kpt pkg get https://github.com/kptdev/kpt-samples.git/nginx-shop@main
cd nginx-shop
```

## 7. Run the demo

From the package directory (`nginx-shop/`):

```bash
# 1. render the package (runs the function pipeline)
kpt fn render .

# 2. initialize the live inventory (first time only)
kpt live init .

# 3. apply to the cluster
kpt live apply .

# 4. open the storefront (runs in its own terminal)
kubectl port-forward -n nginx-shop svc/nginx-shop 8080:80
```

Open <http://localhost:8080/>.

## 8. Switch store / locale

Edit `ui-config.yaml`:

```yaml
data:
  namespace: nginx-shop
  storeType: florist     # astronomy | florist
  locale: hi-IN          # en-US | hi-IN | cs-CZ | zh-CN
```

Then re-render and re-apply (the pod rolls automatically on a store/locale change):

```bash
kpt fn render .
kpt live apply .
```

## 9. Tear down

```bash
kpt live destroy .
# or remove the whole cluster:
kind delete cluster --name nginx-shop
```
