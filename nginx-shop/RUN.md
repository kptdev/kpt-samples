# nginx-shop — How to run

A lightweight, buildless demo: stock nginx serves a static storefront; a KRM
function switches store (astronomy | florist) and locale (en-US | hi-IN | cs-CZ |
zh-CN). For what it is and how it works, see [README.md](./README.md).

---

## 1. Install `kind` and `kubectl`

```bash
# kind
[ "$(uname -m)" = aarch64 ] && A=arm64 || A=amd64
curl -Lo ./kind "https://kind.sigs.k8s.io/dl/v0.33.0/kind-linux-${A}"
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/${A}/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/kubectl
```

## 2. Install `kpt`

```bash
# arm64 shown; use kpt_linux_amd64-<ver>.deb on x86_64
wget https://github.com/kptdev/kpt/releases/download/v1.0.1/kpt_linux_arm64-1.0.1.deb
sudo apt install ./kpt_linux_arm64-1.0.1.deb
kpt version
```

## 3. Create a cluster

```bash
kind create cluster --name nginx-shop
```

## 4. Pre-download and load images

Only the workload image needs to be in the cluster. The three KRM-function
images are pulled by `kpt fn render` on the host (docker/podman) and cached
there — they do not need loading into kind.

Images to pre-download:

| Image | Where it runs | Load into kind? |
| --- | --- | --- |
| `nginx:stable` | cluster workload | **yes** |
| `ghcr.io/kptdev/krm-functions-catalog/starlark:v0.5.5` | `kpt fn render` (host) | no |
| `ghcr.io/kptdev/krm-functions-catalog/set-namespace:v0.4.5` | `kpt fn render` (host) | no |
| `ghcr.io/kptdev/krm-functions-catalog/kubeconform:latest` | `kpt fn render` (host) | no |

```bash
# pull all four (so nothing is fetched later), then load nginx into the cluster
docker pull nginx:stable
docker pull ghcr.io/kptdev/krm-functions-catalog/starlark:v0.5.5
docker pull ghcr.io/kptdev/krm-functions-catalog/set-namespace:v0.4.5
docker pull ghcr.io/kptdev/krm-functions-catalog/kubeconform:latest

kind load docker-image nginx:stable --name nginx-shop
```

> The storefront logo/banner/product images are fetched by the **browser** from
> GitHub at page load (with inline-SVG fallbacks if offline); nothing to
> pre-download for the cluster.

## 5. Run the demo

From this directory (`nginx-shop/`):

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

## 6. Switch store / locale

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

## 7. Tear down

```bash
kpt live destroy .
# or remove the whole cluster:
kind delete cluster --name nginx-shop
```
