# Astronomy Shop for kpt

A GSoC 2026 sample that packages the [OpenTelemetry Astronomy Shop](https://opentelemetry.io/docs/demo/) — a microservices e‑commerce demo — as a composable [kpt](https://kpt.dev) package and shows how the same package can be rebranded, regionalized, wired up for telemetry, and updated safely using **Configuration as Data** and **KRM Functions**.




---

## Overview

This repository contains a complete kpt package for the OpenTelemetry Astronomy Shop, a polyglot microservices application whose real purpose is to generate rich traces, metrics, and logs for OpenTelemetry instrumentation demos.

By walking through this repository you will learn how to:

- Model a multi‑service application as a composable kpt package hierarchy.
- Use catalog KRM functions (`set-namespace`, `apply-replacements`) and a Starlark script to declaratively mutate resources.
- Keep upstream subpackages untouched so that `kpt pkg update` can perform a safe 3‑way merge.
- Customize the same package for different audiences — for example, turning the Astronomy Shop into a Florist store — by editing a single ConfigMap.
- Inject faults for resilience testing using declarative Chaos Engineering configuration.

---

## Why kpt?

Traditional Kubernetes manifest management either relies on heavyweight templating or requires every change to be re‑applied manually. kpt takes a different approach: it treats the package itself as the source of truth and applies small, composable transformations to it.

| Concern | Helm / Plain YAML | kpt |
| --- | --- | --- |
| Authoring experience | Templated strings, "magic" values | WYSIWYG YAML, edit what you deploy |
| Data model | Embedded in templating engine | KRM‑native — the API wire format |
| Transformations | Monolithic template logic | Pipeline of interoperable KRM functions |
| Debugging | Re‑render and diff | Render step‑by‑step with `kpt fn eval` |
| Upgrades | Manual re‑templating | `kpt pkg update` with 3‑way merge |
| Reuse | Chart reuse + values overrides | Subpackages + upstream tracking |

For a deeper background on the rationale behind Configuration as Data, see the [kpt rationale guide](https://kpt.dev/guides/rationale/).

---

## Features

- **Package Composition** — The application is split into independent subpackages (`shop/`, `observability/`) that can be rendered, fetched, and upgraded individually.
- **Configuration as Data** — All customization inputs are ConfigMaps or function configs — no imperative scripts required.
- **KRM Function Pipelines** — `mutators` and `validators` declared in `Kptfile` run on every render.
- **Declarative Customization** — Store branding, regional deployment, deployment profiles, chaos engineering, and telemetry endpoints are all driven by data in local‑config resources.
- **Data Derivation** — A single `region` variable drives locale, currency, tax rate, and product catalog translations across multiple services.
- **Cross‑Cutting Scaling** — A single `profile` variable drives replica counts, memory limits, CPU requests, and observability component enablement across 27 workloads.
- **Chaos Engineering** — Application-level fault injection (latency, errors, memory leaks) via OpenFeature `flagd` toggles, controlled by a declarative scenario configuration.
- **Safe Package Updates** — Upstream `shop/` and `observability/` subpackages are never edited, so `kpt pkg update` performs a clean 3‑way merge.

---

## Architecture

The package hierarchy is rooted at `app/` and is composed of five siblings:

- **`shop/`** — the e‑commerce microservices (frontend, cart, checkout, payment, product catalog, image provider, ad, recommendation, LLM, load generator, telemetry sidecars, etc.).
- **`observability/`** — the OpenTelemetry Collector, Prometheus, Grafana, Jaeger, and OpenSearch deployments.
- **`branding/`** — a customization layer that rewires service images, the postgresql init script, and feature‑flag product IDs to switch store identity.
- **`regional/`** — a customization layer that derives locale, currency, tax rate, and translated product catalog data from a single `region` field.
- **`profiles/`** — a customization layer that scales replicas, memory, CPU requests, and observability enablement from a single `profile` field.
- **`chaos/`** — a customization layer that injects faults (latency, errors, memory leaks) by manipulating `flagd` feature flags based on a single `scenario` field.

Subpackages are rendered **before** the root pipeline runs, so the branding, regional, profiles, and chaos mutators at the root see the fully rendered `shop/` resources as their input.

```
app/                              (ROOT PACKAGE)
├── shop/                         (subpackage — microservices)
├── observability/                (subpackage — telemetry stack)
├── branding/                     (customization layer — see Branding)
├── regional/                     (customization layer — see Regional)
├── profiles/                     (customization layer — see Deployment Profiles)
└── chaos/                        (customization layer — see Chaos Engineering)
```

---


## Getting Started

### Prerequisites

- A working Kubernetes cluster (kind, minikube, or any conformant cluster).
- Docker as container engine.
- If you want to build the images, you may run the provided script (this is for a kind cluster):
  ```bash
  ./scripts/build_and_load.sh <cluster_name>
  ```

- [`kubectl`](https://kubernetes.io/docs/tasks/tools/) — for cluster interaction.
- [`kpt`](https://kpt.dev/installation/kpt-cli) — for fetching, rendering, and applying the package.
- Create a namespace called `otel-demo`
```bash
kubectl create namespace otel-demo
```

### Installation

Clone the repository and enter the root package:

```bash
kpt pkg get https://github.com/<your-org>/gsoc-otel-demo.git/app@main app
cd app
```

### Deploy

Render the entire package hierarchy (root + subpackages) and apply it with `kpt live`:

```bash
# Render the root package — runs all mutators and validators in order
kpt fn render .

# Preview the inventory before applying
kpt live init .

# Apply and continuously reconcile
kpt live apply . 
```

> Tip: you can render only one subpackage (e.g. `kpt fn render shop/`) if you want to iterate without the root pipeline.

---

## Customization using KRM Functions

Every customization in this repository is driven by **Configuration as Data**: a local‑config ConfigMap holds the desired values, and a pipeline of KRM functions reads that data and rewrites the rendered resources accordingly.


Because every step is a standalone function, you can preview any one of them with `kpt fn eval --fn-config <path>` to debug a single stage without re‑rendering the whole pipeline.

### Branding

#### Rebrand in One Config: From Astronomy Shop to Florist

The branding layer turns the upstream Astronomy Shop into a Florist store — different product images, different product ID, different `init.sql` for the catalog database — by changing a single field in one ConfigMap. No file inside `shop/` is modified, so a future `kpt pkg update` will still merge cleanly.

![Astronomy storefront placeholder](./docs/images/astronomy-storefront.png)

![Florist storefront placeholder](./docs/images/florist-storefront.png)

**The source of truth** is `app/branding/branding-config.yaml`:

```yaml
data:
  storeType: astronomy     # change to "florist" to rebrand
```

**How the pipeline works:**

| Step | Function | What it does |
| --- | --- | --- |
| 1 | `setup-branding` (Starlark) | Reads `storeType`, looks up the matching folder under `app/branding/` (`astronomy/` or `florist/`), then materializes `value-store` (image references + product ID) and `active-postgresql-init` (SQL). |
| 2 | `replace-postgresql-init` (ApplyReplacements) | Copies `active-postgresql-init.data["init.sql"]` into the `postgresql-init` ConfigMap that ships with `shop/`. |
| 3 | `branding-image-provider` (ApplyReplacements) | Reads `value-store` and writes each image field into the matching Deployment in `shop/` (`frontend`, `image-provider`, `ad`, `llm`, `load-generator`). |
| 4 | `validator-branding` (Starlark) | Verifies `storeType ∈ {astronomy, florist}` and aborts the render otherwise. |

**To rebrand to Florist:**

1. Open `app/branding/branding-config.yaml` and change:

   ```yaml
   storeType: florist
   ```

2. Re‑render the package:

   ```bash
   kpt fn render .
   ```

3. Re‑apply:

   ```bash
   kpt live apply . --reconcile-timeout=2m --output=table
   ```

<!-- The product ID used by flagd (`FLR001` for Florist, the upstream ID for Astronomy) is also rewritten during render so that the right feature flags light up for each store. The search/replace is scoped to the package so it never touches the per‑store source data under `app/branding/`. -->

<!-- **What does NOT change when switching stores:**

The generic e‑commerce workflow stays identical — `cart`, `checkout`, `payment`, `shipping`, `currency`, `quote`, `email`, `accounting`, `fraud-detection`, plus all of `kafka`, `postgresql`, and `valkey-cart`. Only the brand‑specific resources (images, product ID, catalog SQL) are mutated. -->

**Adding a new store:**

1. Create `app/branding/<your-store>/` and drop in `<your-store>-postgresql-init.yaml` with the matching `data["init.sql"]`.
2. Add an entry for `<your-store>` in `app/branding/setup-branding.yaml` (images, product ID, init configmap name).
3. Extend the validator's `valid_types` list in `app/branding/validator-branding.yaml`.

No changes to `app/shop/` are required.


### Regional

#### Deploy for Any Region: One Config Drives Language, Currency, Tax, and Catalog

The regional layer transforms the store for a target market — Hindi product names for India, Czech for the Czech Republic, Chinese for China — by changing a single field in one ConfigMap. Like branding, no file inside `shop/` is modified.

**The source of truth** is `app/regional/region-config.yaml`:

```yaml
data:
  region: us           # change to "india", "czech-republic", or "china"
```

**How the pipeline works:**

| Step | Function | What it does |
| --- | --- | --- |
| 1 | `setup-region` (Starlark) | Reads `region`, looks up the derivation matrix (see below) to compute `locale`, `currency`, `tax_rate`, and `tax_label`. Resolves the correct translated PostgreSQL init data from `locales/<store>/<store>-<locale>-postgresql-init.yaml`. Injects `NEXT_PUBLIC_LOCALE`, `DEFAULT_CURRENCY`, `TAX_RATE`, and `TAX_LABEL` as environment variables into the relevant Deployments. |
| 2 | `replace-postgresql-region` (ApplyReplacements) | Copies `active-region-postgresql-init.data["init.sql"]` into the `postgresql-init` ConfigMap that ships with `shop/`. |
| 3 | `validator-region` (Starlark) | Verifies `region ∈ {us, india, czech-republic, china}` and aborts the render otherwise. |

**Region derivation matrix — one input, four outputs:**

| `region` | Derived Locale | Default Currency | Tax Rate | Tax Label |
| --- | --- | --- | --- | --- |
| `us` | `en-US` | `USD` | 8% | Sales Tax |
| `india` | `hi-IN` | `INR` | 18% | GST |
| `czech-republic` | `cs-CZ` | `CZK` | 21% | VAT |
| `china` | `zh-CN` | `CNY` | 13% | VAT |


**One field** is changed and the Starlark engine automatically derives four values, which cascade across environment‑variable injections in four services (`frontend`, `ad`, `llm`, `email`) and a translated product catalog in PostgreSQL.

<!-- **Services mutated by the regional layer:**

| Service | What changes | Mechanism |
| --- | --- | --- |
| **frontend** | `NEXT_PUBLIC_LOCALE`, `DEFAULT_CURRENCY`, `TAX_RATE`, `TAX_LABEL` env vars | Starlark `set_env_value` |
| **ad** | `NEXT_PUBLIC_LOCALE` env var | Starlark `set_env_value` |
| **llm** | `NEXT_PUBLIC_LOCALE` env var | Starlark `set_env_value` |
| **email** | `NEXT_PUBLIC_LOCALE` env var | Starlark `set_env_value` |
| **postgresql-init** | `init.sql` replaced with translated product names, descriptions, and reviews | ApplyReplacements |

The remaining 16 services (product-catalog, recommendation, currency, checkout, payment, shipping, quote, cart, accounting, fraud-detection, image-provider, load-generator, flagd, kafka, postgresql, frontend-proxy) are region‑agnostic and require no changes. -->

**To deploy for India:**

1. Open `app/regional/region-config.yaml` and change:

   ```yaml
   region: india
   ```

2. Re‑render the package:

   ```bash
   kpt fn render .
   ```

3. Re‑apply:

   ```bash
   kpt live apply . --reconcile-timeout=2m 
   ```


**Adding a new region:**

1. Add the region entry to the `region_matrix` in `app/regional/setup-region.yaml` (locale, currency, tax rate, tax label).
2. Add a `locale_data` mapping for the new locale under each store type.
3. Create the translated PostgreSQL init YAML under `app/regional/locales/astronomy/` and `app/regional/locales/florist/`.
4. Extend the `valid_regions` list in `app/regional/validator-region.yaml`.

No changes to `app/shop/` are required.

### Deployment Profiles

#### Scale the Entire Application: One Config for Small, Medium, or Large

The profiles layer scales the entire application — replicas, memory limits, CPU requests, and observability component enablement — by changing a single field in one ConfigMap. Like branding and regional, no file inside `shop/` or `observability/` is modified.

**The source of truth** is `app/profiles/profile-config.yaml`:

```yaml
data:
  profile: medium        # change to "small" or "large"
```

**How the pipeline works:**

| Step | Function | What it does |
| --- | --- | --- |
| 1 | `setup-profile` (Starlark) | Reads `profile`, looks up the profile matrix (see below), classifies all workloads into tiers, then mutates `spec.replicas`, `resources.limits.memory`, and optionally `resources.requests.cpu` on every Deployment, StatefulSet, and DaemonSet across both `shop/` and `observability/`. |
| 2 | `validator-profile` (Starlark) | Verifies `profile ∈ {small, medium, large}` and aborts the render otherwise. |

**Profile comparison — one input, three scaling strategies:**

| Aspect | `small` | `medium` | `large` |
| --- | --- | --- | --- |
| **Target environment** | Local dev, CI, single‑node | Staging, demos | Production, load testing |
| **User‑facing replicas** (frontend, frontend‑proxy) | 1 | 2 | 3 |
| **Business‑critical replicas** (checkout, cart, payment, product‑catalog) | 1 | 2 | 3 |
| **Supporting replicas** (ad, email, recommendation, etc.) | 1 | 1 | 2 |
| **Infrastructure replicas** (kafka, postgresql, flagd, valkey‑cart) | 1 | 2 | 2 |
| **Memory scaling** | 0.75× upstream | 1.0× (unchanged) | 2.0× upstream |
| **CPU requests** | None | Added for high‑traffic services | Added for all significant services |
| **Observability** | Prometheus only — Grafana, Jaeger, OpenSearch **disabled** | Full stack enabled | Full stack enabled |

**Service tier classification — why services are grouped the way they are:**

| Tier | Services | Rationale |
| --- | --- | --- |
| **Tier‑1** (user‑facing) | `frontend`, `frontend‑proxy` | Every user request hits these. If they go down, the entire store is down. |
| **Tier‑2** (business‑critical) | `checkout`, `cart`, `payment`, `product‑catalog` | In the purchase path. Failure means users cannot buy. |
| **Tier‑3** (supporting) | `ad`, `recommendation`, `email`, `llm`, `shipping`, `quote`, `currency`, `accounting`, `fraud‑detection`, `image‑provider`, `load‑generator`, `product‑reviews` | Enhance the experience but are not blocking. If `ad` is down, the store still works. |
| **Infra** | `kafka`, `postgresql`, `flagd`, `valkey‑cart` | Stateful or singleton services. |

**Observability disablement:** For the `small` profile, Grafana, Jaeger, and OpenSearch are disabled by setting `replicas: 0` rather than removing their manifests. This preserves upstream compatibility — `kpt pkg update` still performs a clean 3‑way merge, and switching back to `medium` simply restores `replicas: 1`.

**To scale for local development:**

1. Open `app/profiles/profile-config.yaml` and change:

   ```yaml
   profile: small
   ```

2. Re‑render the package:

   ```bash
   kpt fn render .
   ```

3. Re‑apply:

   ```bash
   kpt live apply . --reconcile-timeout=2m --output=table
   ```



### Chaos Engineering

#### Inject Faults for Resilience Testing: One Config for Scenarios

The chaos layer injects application-level faults (latency, errors, memory leaks) by manipulating OpenFeature [flagd](https://flagd.dev/) configurations. This allows you to verify observability dashboards and test system resilience. By changing a single field in one ConfigMap, chaos scenarios are dynamically applied.

**The source of truth** is `app/chaos/chaos-config.yaml`:

```yaml
data:
  scenario: payment-outage    # change to "high-load", "broken-catalog", "memory-leak", or "off"
```

**How the pipeline works:**

| Step | Function | What it does |
| --- | --- | --- |
| 1 | `setup-chaos` (Starlark) | Reads the `scenario` field. It finds the `flagd-config` ConfigMap inside the `shop` subpackage and mutates the `demo.flagd.json` payload inline to enable the specific failure variants mapped to that scenario. |
| 2 | `validator-chaos` (Starlark) | Verifies `scenario ∈ {off, payment-outage, high-load, broken-catalog, memory-leak}` and aborts the render otherwise. |

**To enable a chaos scenario:**

1. Open `app/chaos/chaos-config.yaml` and change:

   ```yaml
   scenario: high-load
   ```

2. Re‑render the package:

   ```bash
   kpt fn render .
   ```

3. Re‑apply:

   ```bash
   kpt live apply . --reconcile-timeout=2m --output=table
   ```



---

## The complete flow

The package follows a simple, declarative rendering pipeline. Everything between the source of truth and the running cluster is a function over YAML data.

```
telemetry-config ─► shop/ & observability/ pipelines (set-namespace, apply-telemetry)
                    │
branding-config  ─┐ ▼
region-config    ─┼─►  Root Kptfile pipeline
profile-config   ─┤     ├─ setup-branding            (Starlark)
chaos-config     ─┘     ├─ replace-postgresql-init    (apply-replacements)
                        ├─ branding-image-provider    (apply-replacements)
                        ├─ setup-region              (Starlark)
                        ├─ replace-postgresql-region   (apply-replacements)
                        ├─ setup-profile             (Starlark)
                        ├─ setup-chaos               (Starlark)
                        ├─ validator-branding         (Starlark)
                        ├─ validator-region           (Starlark)
                        ├─ validator-profile          (Starlark)
                        └─ validator-chaos            (Starlark)
                  ▼
            kpt fn render .
                  ▼
        Rendered KRM resources
                  ▼
        kpt live apply .
                  ▼
        Running application
```

`kpt fn render` walks the package hierarchy depth‑first, so subpackage pipelines (`shop/`, `observability/`) run first and their output is then fed into the root pipeline.

---

## Package Updates


```bash
kpt pkg update
```

`kpt pkg update` performs a **3-way merge** between:

1. **BASE** — the version of the package you originally fetched.
2. **LOCAL** — your customized working tree (with `branding/`, `regional/`, `profiles/`, `telemetry-config`, etc.).
3. **UPSTREAM** — the newly published upstream version.

### Updating the Package: `kpt pkg update` and Structural 3-Way Merge

This section demonstrates how **`kpt pkg update`** incorporates upstream changes into a customized local package. Unlike text-based diffs, `kpt` performs a **Kubernetes-aware, structural 3-way merge**, ensuring that local configurations are preserved alongside upstream improvements.

#### Prerequisites: Simulating the Environments

To demonstrate the update workflow, create a simulated upstream repository and a local consumer clone.

```bash
# 1. Create a simulated upstream repository
mkdir /tmp/otel-demo-upstream && cd /tmp/otel-demo-upstream
git init
cp -r <path-to-your-repo>/app/ .
git add .
git commit -m "v1.0.0: Initial upstream release"
git tag v1.0.0
git branch -M main
git remote add origin <github_repo>
git push -u origin main --tags

# Push the repository to GitHub and note its URL.

# 2. Create the local consumer package
mkdir /tmp/otel-demo-local && cd /tmp/otel-demo-local
git init
kpt pkg get <github_url>@v1.0.0 demo
```

#### Step 1: Apply Local Customizations (Consumer)

As the consumer, customize the OpenTelemetry Demo for your environment.

##### Configure the Region

Deploy the package for the Japanese market by modifying `app/regional/region-config.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: region-config
  annotations:
    config.kubernetes.io/local-config: "true"
data:
  region: china # Changed locally
```

##### Customize the Frontend Deployment

Modify `app/shop/frontend/deployment_frontend.yaml` to add debug logging, increase memory, and add a team label:

```yaml
metadata:
  labels:
    team: frontend-squad # ADDED
spec:
  template:
    spec:
      containers:
        - name: frontend
          env:
            - name: NEXT_PUBLIC_LOCALE
              value: zh-CN
            - name: LOG_LEVEL
              value: debug # ADDED
          resources:
            limits:
              memory: 512Mi # CHANGED from 250Mi
```

##### Customize the Recommendation Deployment

Add a readiness probe to `app/shop/recommendation/deployment_recommendation.yaml`:

```yaml
          readinessProbe: # ADDED
            grpc:
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
```

Commit the local changes:

```bash
cd /tmp/otel-demo-local
git add .
git commit -m "consumer: configure Japan region and custom resource settings"
```

#### Step 2: Publish an Upstream Update (Maintainer)

Switching roles, publish a new upstream release containing architectural updates and new regional support (Japan).

```bash
cd /tmp/otel-demo-upstream/app
```

##### Update Deployments

Apply the following improvements to the upstream manifests:

1. **Frontend (`shop/frontend/deployment_frontend.yaml`)**:
   ```yaml
   metadata:
     labels:
       app.kubernetes.io/version: 2.3.0 # UPSTREAM BUMP
   spec:
     template:
       spec:
         containers:
           - name: frontend
             env:
               - name: OTEL_TRACES_SAMPLER # UPSTREAM ADD
                 value: parentbased_traceidratio
               - name: OTEL_TRACES_SAMPLER_ARG
                 value: "0.25"
             resources:
               requests:
                 cpu: 100m # UPSTREAM ADD
   ```
2. **Recommendation (`shop/recommendation/deployment_recommendation.yaml`)**:
   ```yaml
             livenessProbe: # UPSTREAM ADD
               grpc:
                 port: 8080
               initialDelaySeconds: 15
               periodSeconds: 10
   ```

##### Add Japan Region Support

Extend the regional configurations to support Japan.

1. **Update `regional/setup-region.yaml`** to include Japan in the `region_matrix`:
   ```python
         "japan": {
           "locale": "ja-JP",
           "currency": "JPY",
           "tax_rate": "10",
           "tax_label": "Consumption Tax",
         },
   ```
2. **Update `regional/validator-region.yaml`** to add `"japan"` to `valid_regions`.
3. Add the `ja-JP` PostgreSQL initialization files (`astronomy-ja-JP-postgresql-init.yaml` and `florist-ja-JP-postgresql-init.yaml`) into their respective `regional/locales/` directories. *(Note: For this demonstration, these translated YAML files have already been added to the repository for you.)*

Commit and tag the release:

```bash
cd /tmp/otel-demo-upstream
git add .
git commit -m "v2.0.0: Add trace sampling, CPU requests, liveness probes, Japan region, bump version"
git tag v2.0.0
git push origin main --tags
```

#### Step 3: Update the Local Package (Consumer)

Pull the new upstream changes into your customized local package:

```bash
cd /tmp/otel-demo-local
kpt pkg update demo@v2.0.0
```

`kpt` executes a **structural 3-way merge** using the original baseline (`v1.0.0`), your local customizations, and the incoming upstream changes (`v2.0.0`).

#### Step 4: Render and Verify

Render the updated package to re-apply all pipeline mutators:

```bash
cd /tmp/otel-demo-local/app
kpt fn render .
```

Inspect the `frontend` Deployment to verify the deterministic merge behavior:

- **Local Customizations Retained**: The `china` region, `512Mi` memory limit, `debug` logging, and `team` label persist.
- **Upstream Additions Applied**: The trace sampling environment variables, `100m` CPU request, and `2.3.0` version bump are successfully integrated.
- **Regional Mutators Activated**: Based on `region: japan`, the Starlark pipeline dynamically injected the Japanese tax rate (10%) and locale (`ja-JP`).

Additionally, check the `recommendation` Deployment to see that both the consumer's `readinessProbe` and the upstream's `livenessProbe` gracefully coexist.

#### Understanding the Structural Merge

Traditional text-based merge tools such as standard `git merge` perform a three-way merge over **plain text**. They compare line changes without understanding Kubernetes resource structure. As a result, updates involving locally customized manifests may require manual conflict resolution or careful review whenever edits overlap.

Similarly, tools such as **Kustomize** focus on applying overlays and patches to a base configuration. When the upstream base evolves, users typically update the base and verify that existing overlays and patches continue to apply correctly. By contrast, **`kpt`** treats the package itself as the unit of evolution and provides a built-in package update workflow with structural merging.

**`kpt pkg update`** performs a Kubernetes-aware, three-way structural merge between the original upstream package, the updated upstream package, and your locally customized package. Rather than reasoning about line numbers, it understands the structure of Kubernetes resources:

- It recognizes that the `env` array is an associative list keyed by the `name` field, rather than simply an ordered YAML sequence.
- It understands that `resources.limits` and `resources.requests` are independent map fields that can be merged without relying on line positions.
- It distinguishes between fields such as `livenessProbe` and `readinessProbe`, treating them as separate parts of the resource specification.

This allows compatible upstream changes and local customizations to be merged using Kubernetes resource structure instead of plain text. By default, `kpt pkg update` uses the **`resource-merge`** strategy, which performs an OpenAPI schema-aware structural comparison during the three-way merge.

For more information, see the [kpt Package Update documentation](https://kpt.dev/book/03-packages/#updating-a-package).




Customizations in `branding/`, `regional/`, and `profiles/` are preserved because they live in separate files that don't collide with upstream `shop/` manifests. The `upstream` and `upstreamLock` sections of `Kptfile` track which version you're on.

The default merge strategy is `resource-merge` (structural, associative‑list aware). For niche cases, kpt also supports `fast-forward` and `force-delete-replace`, but `resource-merge` is the right choice for this package.

---



## Contributing

1. **Fork** this repository.
2. **Create a branch** for your change:

   ```bash
   git checkout -b feature/your-idea
   ```

3. **Make your changes** in a feature branch. Keep `app/shop/` and `app/observability/` upstream‑clean — put any local customization under `app/branding/`, `app/regional/`, `app/profiles/`, or a new sibling layer instead.
4. **Validate locally** with `kpt fn render .` and the existing pipelines.
5. **Commit** with a clear message and **open a Pull Request** describing the change and how you tested it.

For larger changes please open an issue first to discuss the design before submitting code.

---

