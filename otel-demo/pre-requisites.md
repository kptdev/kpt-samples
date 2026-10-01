# For Ubuntu 26.04 with Podman on WSL2 

This machine is Ubuntu 26.04 on WSL2, with rootless Podman 5.7 already installed. [kind](https://kind.sigs.k8s.io/) runs
a local Kubernetes cluster by starting node containers. With Podman present and Docker absent, kind uses Podman as its
container provider.

kind stable release used below: **v0.33.0**. Podman 3.0 or later is required; 5.7 satisfies that.

## 1. Install Podman

Ubuntu 26.04 includes Podman in the universe repository. `apt` also installs the rootless helpers
(`uidmap`, `passt`, `crun`, and `conmon`).

```bash
sudo apt update
sudo apt install -y podman
podman --version
```

Expect a 5.x version. kind needs 3.0 or later.

Rootless mode runs containers as your login user. Confirm that user has a subordinate UID and GID range, then confirm
Podman is rootless:

```bash
grep "^$(id -un):" /etc/subuid /etc/subgid
podman info --format 'rootless={{.Host.Security.Rootless}}'
```

`rootless` should be `true`. If either file has no line for your user, add a range of 65536 IDs and reload Podman’s
configuration:

```bash
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 "$USER"
podman system migrate
```

Log out of the WSL session and back in if `podman info` still cannot find a UID or GID for the user.

## 2. Make the root mount shared

Run this in the WSL shell. It lasts until the distro stops:

```bash
sudo mount --make-rshared /
findmnt -o TARGET,PROPAGATION /
```

`PROPAGATION` should be `shared`.

systemd is already enabled in `/etc/wsl.conf`. Persist the shared mount with a oneshot unit so it is applied again on every boot:

```bash
sudo tee /etc/systemd/system/rshared-root.service >/dev/null <<'EOF'
[Unit]
Description=Make the root filesystem a shared mount for rootless Podman
After=local-fs.target
Before=user.slice

[Service]
Type=oneshot
ExecStart=/bin/mount --make-rshared /
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now rshared-root.service
findmnt -o TARGET,PROPAGATION /
```

## 3. Configure rootless Podman for kind

Create `~/.config/containers/containers.conf`:

```bash
mkdir -p ~/.config/containers
cat > ~/.config/containers/containers.conf <<'EOF'
[containers]
# kind tails `podman logs` for the node boot message. The default
# rootless journal relay often attaches too late, so kind times out
# even when the node actually started.
log_driver = "k8s-file"

# Default PID limit (often 4096) is too low for a kind node,
# especially with ingress controllers.
pids_limit = 65536
EOF
```

Confirm Podman still sees cgroup v2 and the `cpu` controller:

```bash
podman info --format 'cgroupVersion={{.Host.CgroupVersion}} manager={{.Host.CgroupManager}} controllers={{.Host.CgroupControllers}}'
```

Expected shape: `cgroupVersion=v2`, `manager=systemd`, and `controllers` includes `cpu`, `memory`, and `pids`.

kind talks to the `podman` CLI. The `podman.socket` user unit does not need to be running.

## 4. Load iptables kernel modules

Rootless containers do not get the host’s iptables modules unless those modules are loaded on the host. Ingress,
Gateway, and kube-proxy NAT need them. The module files are already under `/lib/modules/$(uname -r)/`.

```bash
sudo tee /etc/modules-load.d/iptables.conf >/dev/null <<'EOF'
ip6_tables
ip6table_nat
ip_tables
iptable_nat
EOF

sudo modprobe ip_tables iptable_nat ip6_tables ip6table_nat
sudo systemctl restart systemd-modules-load.service
lsmod | grep -E 'ip_tables|iptable_nat|ip6_tables|ip6table_nat'
```

Install the iptables userspace tools as well. Podman uses them when it publishes the Kubernetes API port:

```bash
sudo apt update
sudo apt install -y iptables
```

## 5. Raise inotify limits

`fs.inotify.max_user_watches` is already 524288. `fs.inotify.max_user_instances` is 128; kind’s rootless guide uses 512 so ingress controllers do not run out of inotify instances.

```bash
sudo tee /etc/sysctl.d/99-kind.conf >/dev/null <<'EOF'
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 512
EOF
sudo sysctl --system
```

Leave `net.ipv4.ip_unprivileged_port_start` at 1024. Map ingress to host ports 8080 and 8443 (see below) instead of 80 and 443.

## 6. Install kind

Download the v0.33.0 Linux amd64 binary and check it against the published checksum:

```bash
cd /tmp
curl -Lo kind https://kind.sigs.k8s.io/dl/v0.33.0/kind-linux-amd64
curl -Lo kind.sha256sum https://kind.sigs.k8s.io/dl/v0.33.0/kind-linux-amd64.sha256sum
# The checksum file is "<hash>  kind-linux-amd64". Compare it to ./kind.
awk '{print $1 "  kind"}' kind.sha256sum | sha256sum --check
chmod +x kind
sudo mv kind /usr/local/bin/kind
kind version
```

`go install sigs.k8s.io/kind@v0.33.0` is an alternative. That binary lands in `$(go env GOPATH)/bin`, which is already on `PATH` (`~/go/bin`).

## 7. Install kubectl

kind writes a kubeconfig, and kubectl is what you use to talk to the cluster.

```bash
cd /tmp
KVER="$(curl -L -s https://dl.k8s.io/release/stable.txt)"
curl -Lo kubectl "https://dl.k8s.io/release/${KVER}/bin/linux/amd64/kubectl"
curl -Lo kubectl.sha256 "https://dl.k8s.io/release/${KVER}/bin/linux/amd64/kubectl.sha256"
echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check
chmod +x kubectl
sudo mv kubectl /usr/local/bin/kubectl
kubectl version --client
```

## 8. Create a cluster

Pin the provider so a later Docker install does not change which runtime kind picks:

```bash
echo 'export KIND_EXPERIMENTAL_PROVIDER=podman' >> ~/.bashrc
source ~/.bashrc

KIND_EXPERIMENTAL_PROVIDER=podman kind create cluster --wait 180s
```

kind pulls `docker.io/kindest/node` (the tag for v0.33.0 is listed in that release’s notes) and starts a container named `kind-control-plane`. The kubeconfig context is `kind-kind`.

```bash
kubectl cluster-info --context kind-kind
kubectl get nodes
podman ps --filter label=io.x-k8s.kind.cluster=kind
```

If creation fails with `running kind with rootless provider requires setting systemd property "Delegate=yes"`, start kind inside a delegated user scope:

```bash
systemd-run --scope --user -p "Delegate=yes" -- \
  env KIND_EXPERIMENTAL_PROVIDER=podman kind create cluster --wait 180s
```

On this host that should be unnecessary: systemd 259 already delegates `cpu`, `memory`, and `pids` into the user slice.

### Delete the cluster

```bash
KIND_EXPERIMENTAL_PROVIDER=podman kind delete cluster
```

Deleting a cluster that is already gone exits successfully.

## 9. Optional: publish HTTP and HTTPS

Rootless Podman cannot bind host ports below 1024 while `ip_unprivileged_port_start` is 1024. Publish NodePorts on 8080 and 8443:

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 80
    hostPort: 8080
    protocol: TCP
  - containerPort: 443
    hostPort: 8443
    protocol: TCP
```

```bash
KIND_EXPERIMENTAL_PROVIDER=podman kind create cluster --config kind-config.yaml --wait 180s
```

Reach those services at `http://127.0.0.1:8080` and `https://127.0.0.1:8443` from WSL. From Windows, use the WSL distro’s address (`hostname -I`) or enable WSL mirrored networking in `%UserProfile%\.wslconfig` if you want `localhost` on the Windows side.

## Load a local image

Build with Podman, then load into the node. Avoid the `:latest` tag, or set `imagePullPolicy: IfNotPresent`, so the kubelet does not try to pull the image again.

```bash
podman build -t my-app:dev .
KIND_EXPERIMENTAL_PROVIDER=podman kind load docker-image my-app:dev
```

## If cluster creation fails

| Symptom | What to do |
| --- | --- |
| `could not find a log line that matches "Reached target .*Multi-User System"` | Confirm `log_driver = "k8s-file"` in `~/.config/containers/containers.conf`, then `kind delete cluster` and create again. `podman logs kind-control-plane` should show systemd boot lines. |
| `"/' is not a shared mount` from `podman info`, or missing mounts in the node | `sudo mount --make-rshared /` and confirm `findmnt` shows `shared`. |
| `Delegate=yes` error | `systemd-run --scope --user -p "Delegate=yes" -- env KIND_EXPERIMENTAL_PROVIDER=podman kind create cluster` |
| API port is not published, or `kubectl` cannot connect | `sudo apt install -y iptables`, then recreate the cluster. If Podman still cannot program NAT, add `firewall_driver = "iptables"` under a `[network]` section in `~/.config/containers/containers.conf`. |
| Node container exits or pods stuck in `ContainerCreating` after a PID error | `pids_limit = 65536` must be set before the cluster is created. Recreate the cluster after changing it. |

Export logs when you need more than the kind error line:

```bash
KIND_EXPERIMENTAL_PROVIDER=podman kind export logs ./kind-logs
```

## 10. Install kpt

Download and intall the most recent version of kpt fom .deb.

```bash
wget https://github.com/kptdev/kpt/releases/download/v1.0.1/kpt_linux_arm64-1.0.1.deb
sudo apt install ./kpt_linux_arm64-1.0.1.deb
```

## 11. Set Podman as the KRM Functions Runtime

```bash
export KRM_FN_RUNTIME=podman
kpt fn render .
```

or 

```bash
KRM_FN_RUNTIME=podman kpt fn render .
```

## References

- [Install Podman](https://podman.io/docs/installation) (distribution packages, including Ubuntu)
- [kind quick start](https://kind.sigs.k8s.io/docs/user/quick-start/) (install, provider selection)
- [kind rootless](https://kind.sigs.k8s.io/docs/user/rootless/) (cgroup v2, iptables modules, PID limit, `k8s-file` log driver)
- [Install kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/)


