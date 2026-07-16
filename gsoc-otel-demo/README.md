# Astronomy Shop for kpt

A GSoC 2026 sample that packages the [OpenTelemetry Astronomy Shop](https://opentelemetry.io/docs/demo/) — a microservices e‑commerce demo — as a composable [kpt](https://kpt.dev) package and shows how the same package can be rebranded, regionalized, wired up for telemetry, and updated safely using **Configuration as Data** and **KRM Functions**.

<!-- <p align="center">
  <!-- Project banner / architecture image / GIF — replace with your own -->
  <!-- ![banner](./docs/images/banner.png) -->
<!-- </p> --> 


---

## Overview

This repository contains a complete kpt package for the OpenTelemetry Astronomy Shop, a polyglot microservices application whose real purpose is to generate rich traces, metrics, and logs for OpenTelemetry instrumentation demos.

Instead of shipping hand‑rendered YAML or a templating tool like Helm, every service manifest lives in a plain, WYSIWYG, KRM‑native package. Local customizations — namespace, telemetry endpoints, store branding — are layered on top by kpt's function pipeline rather than by editing the upstream manifests directly.

By walking through this repository you will learn how to:

- Model a multi‑service application as a composable kpt package hierarchy.
- Use catalog KRM functions (`set-namespace`, `apply-replacements`, `search-replace`) and a small Starlark script to declaratively mutate resources.
- Keep upstream subpackages untouched so that `kpt pkg update` can perform a safe 3‑way merge.
- Customize the same package for different audiences — for example, turning the Astronomy Shop into a Florist store — by editing a single ConfigMap.

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
- **Declarative Customization** — Store branding, regional deployment, deployment profiles, namespace, and telemetry endpoints are all driven by data in local‑config resources.
- **Data Derivation** — A single `region` variable drives locale, currency, tax rate, and product catalog translations across multiple services.
- **Cross‑Cutting Scaling** — A single `profile` variable drives replica counts, memory limits, CPU requests, and observability component enablement across 27 workloads.
- **Safe Package Updates** — Upstream `shop/` and `observability/` subpackages are never edited, so `kpt pkg update` performs a clean 3‑way merge.

---

## Architecture

The package hierarchy is rooted at `app/` and is composed of five siblings:

- **`shop/`** — the e‑commerce microservices (frontend, cart, checkout, payment, product catalog, image provider, ad, recommendation, LLM, load generator, telemetry sidecars, etc.).
- **`observability/`** — the OpenTelemetry Collector, Prometheus, Grafana, Jaeger, and OpenSearch deployments.
- **`branding/`** — a customization layer that rewires service images, the postgresql init script, and feature‑flag product IDs to switch store identity.
- **`regional/`** — a customization layer that derives locale, currency, tax rate, and translated product catalog data from a single `region` field.
- **`profiles/`** — a customization layer that scales replicas, memory, CPU requests, and observability enablement from a single `profile` field.

Subpackages are rendered **before** the root pipeline runs, so the branding, regional, and profiles mutators at the root see the fully rendered `shop/` resources as their input.

```
app/                              (ROOT PACKAGE)
├── shop/                         (subpackage — microservices)
├── observability/                (subpackage — telemetry stack)
├── branding/                     (customization layer — see Branding)
├── regional/                     (customization layer — see Regional)
└── profiles/                     (customization layer — see Deployment Profiles)
```

---

## Repository Structure

```
.
├── app/                          Root kpt package (deploy this)
│   ├── Kptfile                   Root pipeline: branding + regional + profiles + validators
│   ├── shop/                     E‑commerce subpackage
│   │   ├── Kptfile               Namespace + telemetry env wiring
│   │   └── ...                   21 microservices (frontend, cart, …)
│   ├── observability/            Telemetry subpackage
│   │   ├── Kptfile               Namespace + telemetry env wiring
│   │   └── otel-collector/       prometheus/  grafana/  jaeger/  opensearch/
│   ├── branding/                 Store branding customization layer
│   │   ├── branding-config.yaml  Single source of truth (storeType)
│   │   ├── setup-branding.yaml   Starlark: builds value-store + init SQL
│   │   ├── replace-postgresql-init.yaml   ApplyReplacements: SQL swap
│   │   ├── branding-image-provider.yaml   ApplyReplacements: image swap
│   │   ├── validator-branding.yaml        Starlark: storeType validator
│   │   ├── astronomy/            Upstream SQL + product ID source
│   │   └── florist/              Florist SQL + product ID source
│   ├── regional/                 Regional deployment customization layer
│   │   ├── region-config.yaml    Single source of truth (region)
│   │   ├── setup-region.yaml     Starlark: derives locale, currency, tax
│   │   ├── replace-postgresql-region.yaml  ApplyReplacements: SQL swap
│   │   ├── validator-region.yaml           Starlark: region validator
│   │   └── locales/              Per-brand, per-locale translated SQL
│   │       ├── astronomy/        5 locales (en-US, hi-IN, cs-CZ, zh-CN, ja-JP)
│   │       └── florist/          5 locales (en-US, hi-IN, cs-CZ, zh-CN, ja-JP)
│   └── profiles/                 Deployment profiles customization layer
│       ├── profile-config.yaml   Single source of truth (profile)
│       ├── setup-profile.yaml    Starlark: scales replicas, memory, CPU
│       └── validator-profile.yaml         Starlark: profile validator
├── opentelemetry-demo.yaml       Flat rendered output used for reference
└── GSOC 26 KPT Project Architecture.md   Background notes from the proposal
```

---

## Getting Started

### Prerequisites

- A working Kubernetes cluster (kind, minikube, or any conformant cluster).
- Docker as container engine
- [`kubectl`](https://kubernetes.io/docs/tasks/tools/) — for cluster interaction.
- [`kpt`](https://kpt.dev/installation/kpt-cli) — for fetching, rendering, and applying the package.
- Create a namespace called `otel-demo`

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
kpt live apply . --reconcile-timeout=2m --output=table
```

> Tip: you can render only one subpackage (e.g. `kpt fn render shop/`) if you want to iterate without the root pipeline.

---

## Customization using KRM Functions

Every customization in this repository is driven by **Configuration as Data**: a local‑config ConfigMap holds the desired values, and a pipeline of KRM functions reads that data and rewrites the rendered resources accordingly.

The pipeline at the root `app/Kptfile` runs in this order:

1. **`setup-branding`** (Starlark) — reads `branding-config` and the per‑store data folder, then materializes a `value-store` ConfigMap (images + product ID) and an `active-postgresql-init` ConfigMap (the right SQL).
2. **`replace-postgresql-init`** (ApplyReplacements) — copies `value-store` and `active-postgresql-init` data into the corresponding resources inside `shop/`.
3. **`branding-image-provider`** (ApplyReplacements) — propagates the image fields from `value-store` into the relevant Deployments inside `shop/`.
4. **`setup-region`** (Starlark) — reads `region-config`, derives locale / currency / tax from the region matrix, materializes a `regional-value-store` ConfigMap and an `active-region-postgresql-init` ConfigMap with the translated product SQL, and injects environment variables (`NEXT_PUBLIC_LOCALE`, `DEFAULT_CURRENCY`, `TAX_RATE`, `TAX_LABEL`) into the relevant Deployments.
5. **`replace-postgresql-region`** (ApplyReplacements) — copies the translated `init.sql` from `active-region-postgresql-init` into the `postgresql-init` ConfigMap.
6. **`setup-profile`** (Starlark) — reads `profile-config`, looks up the profile matrix (`small` / `medium` / `large`), and mutates `spec.replicas`, `resources.limits.memory`, and `resources.requests.cpu` across all Deployments, StatefulSets, and DaemonSets in both `shop/` and `observability/`.
7. **`validator-branding`** (Starlark validator) — fails the render with a clear error if `storeType` is not one of the supported values.
8. **`validator-region`** (Starlark validator) — fails the render with a clear error if `region` is not one of the supported values.
9. **`validator-profile`** (Starlark validator) — fails the render with a clear error if `profile` is not one of the supported values.

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

The product ID used by flagd (`FLR001` for Florist, the upstream ID for Astronomy) is also rewritten during render so that the right feature flags light up for each store. The search/replace is scoped to the package so it never touches the per‑store source data under `app/branding/`.

**What does NOT change when switching stores:**

The generic e‑commerce workflow stays identical — `cart`, `checkout`, `payment`, `shipping`, `currency`, `quote`, `email`, `accounting`, `fraud-detection`, plus all of `kafka`, `postgresql`, and `valkey-cart`. Only the brand‑specific resources (images, product ID, catalog SQL) are mutated.

**Adding a new store:**

1. Create `app/branding/<your-store>/` and drop in `<your-store>-postgresql-init.yaml` with the matching `data["init.sql"]`.
2. Add an entry for `<your-store>` in `app/branding/setup-branding.yaml` (images, product ID, init configmap name).
3. Extend the validator's `valid_types` list in `app/branding/validator-branding.yaml`.

No changes to `app/shop/` are required.


### Regional

#### Deploy for Any Region: One Config Drives Language, Currency, Tax, and Catalog

The regional layer transforms the store for a target market — Hindi product names for India, Czech for the Czech Republic, Chinese for China, Japanese for Japan — by changing a single field in one ConfigMap. Like branding, no file inside `shop/` is modified.

**The source of truth** is `app/regional/region-config.yaml`:

```yaml
data:
  region: us           # change to "india", "czech-republic", "china", or "japan"
```

**How the pipeline works:**

| Step | Function | What it does |
| --- | --- | --- |
| 1 | `setup-region` (Starlark) | Reads `region`, looks up the derivation matrix (see below) to compute `locale`, `currency`, `tax_rate`, and `tax_label`. Resolves the correct translated PostgreSQL init data from `locales/<store>/<store>-<locale>-postgresql-init.yaml`. Injects `NEXT_PUBLIC_LOCALE`, `DEFAULT_CURRENCY`, `TAX_RATE`, and `TAX_LABEL` as environment variables into the relevant Deployments. |
| 2 | `replace-postgresql-region` (ApplyReplacements) | Copies `active-region-postgresql-init.data["init.sql"]` into the `postgresql-init` ConfigMap that ships with `shop/`. |
| 3 | `validator-region` (Starlark) | Verifies `region ∈ {us, india, czech-republic, china, japan}` and aborts the render otherwise. |

**Region derivation matrix — one input, four outputs:**

| `region` | Derived Locale | Default Currency | Tax Rate | Tax Label |
| --- | --- | --- | --- | --- |
| `us` | `en-US` | `USD` | 8% | Sales Tax |
| `india` | `hi-IN` | `INR` | 18% | GST |
| `czech-republic` | `cs-CZ` | `CZK` | 21% | VAT |
| `china` | `zh-CN` | `CNY` | 13% | VAT |
| `japan` | `ja-JP` | `JPY` | 10% | Consumption Tax |

A user changes **one field** and the Starlark engine automatically derives four values, which cascade across environment‑variable injections in four services (`frontend`, `ad`, `llm`, `email`) and a translated product catalog in PostgreSQL.

**Services mutated by the regional layer:**

| Service | What changes | Mechanism |
| --- | --- | --- |
| **frontend** | `NEXT_PUBLIC_LOCALE`, `DEFAULT_CURRENCY`, `TAX_RATE`, `TAX_LABEL` env vars | Starlark `set_env_value` |
| **ad** | `NEXT_PUBLIC_LOCALE` env var | Starlark `set_env_value` |
| **llm** | `NEXT_PUBLIC_LOCALE` env var | Starlark `set_env_value` |
| **email** | `NEXT_PUBLIC_LOCALE` env var | Starlark `set_env_value` |
| **postgresql-init** | `init.sql` replaced with translated product names, descriptions, and reviews | ApplyReplacements |

The remaining 16 services (product-catalog, recommendation, currency, checkout, payment, shipping, quote, cart, accounting, fraud-detection, image-provider, load-generator, flagd, kafka, postgresql, frontend-proxy) are region‑agnostic and require no changes.

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
   kpt live apply . --reconcile-timeout=2m --output=table
   ```

**Branding × Regional independence:**

Branding and regional deployment are **fully independent** customization layers. Each combination works cleanly:

| Scenario | Result |
| --- | --- |
| Branding only (`florist` + `us`) | Florist store with default US English content. |
| Regional only (`astronomy` + `india`) | Astronomy store deployed for India — Hindi product names, INR default, 18% GST. |
| Both (`florist` + `japan`) | Florist store deployed for Japan — Japanese product names, JPY default, 10% Consumption Tax. |

The Starlark script resolves a **2D matrix** of `(storeType × locale)` to select the correct translated SQL, so branding and regional compose naturally. When branding is absent, it defaults to `astronomy`.

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

**Profiles × Branding × Regional independence:**

All three customization layers are **fully independent** — they mutate non‑overlapping fields:

| Layer | Fields mutated |
| --- | --- |
| Branding | `containers.[].image`, `data["init.sql"]` |
| Regional | `containers.[].env`, `data["init.sql"]` |
| Profiles | `spec.replicas`, `containers.[].resources` |

Every combination works cleanly:

| Scenario | Result |
| --- | --- |
| `small` + `florist` + `india` | Florist store for India, scaled down for local dev. |
| `medium` + `astronomy` + `us` | Astronomy store for the US, balanced for staging. |
| `large` + `florist` + `japan` | Florist store for Japan, scaled up for production. |

---

## How It Works

The package follows a simple, declarative rendering pipeline. Everything between the source of truth and the running cluster is a function over YAML data.

```
branding-config  ─┐
region-config    ─┤
profile-config   ─┼─►  Kptfile pipeline
telemetry-config ─┤     ├─ set-namespace
                  │     ├─ apply-telemetry          (Starlark)
                  │     ├─ setup-branding            (Starlark)
                  │     ├─ replace-postgresql-init    (apply-replacements)
                  │     ├─ branding-image-provider    (apply-replacements)
                  │     ├─ setup-region              (Starlark)
                  │     ├─ replace-postgresql-region   (apply-replacements)
                  │     ├─ setup-profile             (Starlark)
                  │     ├─ validator-branding         (Starlark)
                  │     ├─ validator-region           (Starlark)
                  │     └─ validator-profile          (Starlark)
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

Because the upstream `shop/` and `observability/` subpackages are never edited by hand, you can pull in upstream changes with a single command:

```bash
kpt pkg update
```

`kpt pkg update` performs a **3‑way merge** between:

1. **BASE** — the version of the package you originally fetched.
2. **LOCAL** — your customized working tree (with `branding/`, `regional/`, `profiles/`, `telemetry-config`, etc.).
3. **UPSTREAM** — the newly published upstream version.

Customizations in `branding/`, `regional/`, and `profiles/` are preserved because they live in separate files that don't collide with upstream `shop/` manifests. The `upstream` and `upstreamLock` sections of `Kptfile` track which version you're on.

The default merge strategy is `resource-merge` (structural, associative‑list aware). For niche cases, kpt also supports `fast-forward` and `force-delete-replace`, but `resource-merge` is the right choice for this package.

---

## Roadmap

- [x] Package Composition (`shop/` + `observability/`)
- [x] Branding (Astronomy → Florist via `app/branding/`)
- [x] Telemetry parameterization (`telemetry-config.yaml` + `apply-telemetry`)
- [x] Namespace parameterization (`set-namespace`)
- [x] Regional Deployment — Language, Currency, Tax (via `app/regional/`)
- [x] Deployment Profiles — Small / Medium / Large (via `app/profiles/`)
- [ ] Chaos Engineering — Fault injection (via `app/chaos/`)
- [ ] Safe upstream updates (`kpt pkg update` with 3‑way merge)
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

For larger changes (new customization layers, new stores), please open an issue first to discuss the design before submitting code.

---

