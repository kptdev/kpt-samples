# **GSOC 26 KPT Project Architecture**

## **1\. What are the pain points of other tools?**

| kpt Feature | Helm Pain Point Addressed |
| ----- | ----- |
| WYSIWYG plain YAML packages | Loss of "What You See Is What You Get" visibility |
| Configuration-as-Data (KRM-native) | Fragile text-based templating |
| KRM Functions (apply-replacements, starlark, validators) | Excessive template complexity |
| kpt fn render declarative pipelines | Difficult debugging and opaque rendering flows |
| Upstream package tracking (upstream, upstreamLock) | High-friction upgrade processes |
| kpt pkg update 3-way merge | Loss of local customizations during updates |
| Package composition / subpackages | Poor architectural composability |

## **2\. How is the architecture of otel-demo?**

[Demo Architecture | OpenTelemetry](https://opentelemetry.io/docs/demo/architecture/) 

### **Overview**

The OpenTelemetry Demo is a mock e-commerce webstore built using a microservices architecture. Its true purpose isn't to sell products, but to act as a highly complex, active system that generates rich telemetry data (traces, metrics, and logs). It uses a wide variety of programming languages and communication protocols to demonstrate how OpenTelemetry can monitor diverse environments.

---

## **3\. Applying the features of kpt**

### **Project Description**:
In this project, the contributor will take a complete e-commerce application such as Astronomy shop (otel demo) and package it as a kpt package. The contributor will then show how the example can be customized using the kpt toolchain in a number of ways such as:

Change from online boutique to online florist or online car accessory site
Language and currency localization
Sales Tax/VAT localization
Deployment configuration (Small/medium/large)
Description: Use an example e-commerce application and create the related kpt package with the description how to deploy the application. Show the power of kpt by customizing the application in the above mentioned ways. The project should be well documented and should include a demo of the application running on a local cluster.

### **F1 : Package composability**

```
app/                               (ROOT PACKAGE)
│
├── Kptfile
│
├── shop/                          (INDEPENDENT SUBPACKAGE)
│   ├── Kptfile
│   │
│   ├── frontend/
│   ├── frontend-proxy/
│   ├── cart/
│   ├── checkout/
│   ├── currency/
│   ├── payment/
│   ├── shipping/
│   ├── quote/
│   ├── recommendation/
│   ├── email/
│   ├── accounting/
│   ├── fraud-detection/
│   ├── product-catalog/
│   ├── product-reviews/
│   ├── image-provider/
│   ├── ad/
│   ├── load-generator/
│   ├── kafka/
│   ├── postgresql/
│   ├── llm/
│   └── flagd/
│
├── observability/                 (INDEPENDENT SUBPACKAGE)
│   ├── Kptfile
│   ├── otel-collector/
│   ├── prometheus/
│   ├── grafana/
│   ├── jaeger/
│   └── opensearch/
│ 
```

#### **Code level considerations & recommendations** 

To ensure this directory structure works correctly without breaking, you need to configure the following items:

#### **A. Parameterize the Telemetry Endpoints**

In the current   
deployment\_frontend.yaml:  
yaml  
\- name: OTEL\_COLLECTOR\_NAME  
 value: otel-collector  
If shop/ is deployed without observability/, the OpenTelemetry SDKs in the shop services will fail to connect to otel-collector (generating connection errors, though typically non-blocking). 

* Recommendation: Define a package-level setter or parameter in the shop/Kptfile for the OTel Collector endpoint. This makes it easy for users deploying shop/ standalone to turn telemetry off or point it to their own collector.

#### **B. Self-Contained Service Accounts and RBAC**

In the flat manifest setup, resources share a single ServiceAccount. For instance, in   
reorganize.ps1, the shared ServiceAccount is placed in base.

* Recommendation: If packages are pulled independently, each package must be self-contained:  
  * shop/ needs its own ServiceAccount resource defined inside its package.  
  * observability/ needs its own ServiceAccount, ClusterRole, and ClusterRoleBindings (for Prometheus and Otel-Collector to query the K8s API) defined within the observability/ directory.

#### **C. Namespace Configuration**

Avoid hardcoding namespaces within any resource manifests inside shop/ or observability/.

* Recommendation: Let the parent package's pipeline (or the GitOps tool rendering the manifests) apply namespaces dynamically using the set-namespace KRM function.

### 

### **F2 : Upstream \+ Update strategy**

### **Upstream Tracking & Updates**

Our package has a two-level upstream model:

* OpenTelemetry Helm Chart  
  * Our kpt Package  
    * User Package

When a new OTel Demo release becomes available, maintainers:

1. Render the latest Helm chart version into static manifests.  
2. Refresh and validate the KRM package resources.  
3. Publish the updated version of the kpt package for consumer consumption.

### **User Perspective**

For users, our published kpt package becomes the upstream source.

* Our kpt Package  
  * kpt pkg get  
    * User Customizations

The user's `Kptfile` contains:

```
upstream: ...
upstreamLock: ...
```

which track our package version.

### **Updating**

When a new version of our package is published, users can run:

kpt pkg update

This uses the default **resource-merge** strategy.

The update process performs a **3-way merge** between:

1. **BASE** \= package version originally fetched  
2. **LOCAL** \= user's customized version  
3. **UPSTREAM** \= newly published package version

This allows:

* User Customizations → Preserved  
* Upstream Improvements → Applied

---

#### **Update Strategies**

* **resource-merge** (default)  
  * 3-way merge  
  * structural merge  
  * associative-list merge  
* **Fast-forward (only document this)**  
* **Force-delete-replace (only document this)**

### **F3 : KRM Functions**

Always prefer existing KRM functions first. Use Starlark only when the catalog functions become awkward. 

#### **1\. Change from astronomy shop to florist**

**What should change?**

At a high level:

* Store Name  
* Product Catalog  
* Product Images  
* Advertisements  
* Recommendations  
* Frontend Text/Banners

What should NOT change:

- Checkout, Payment, Shipping, Cart  
- Email, Accounting, Fraud Detection  
- Infrastructure: Kafka, PostgreSQL

The e-commerce workflow remains identical.

**Configuration Source**

Create:

```
kind: ConfigMap
metadata:
  name: branding-config
data:
  storeType: florist
```

Possible values: astronomy, florist, car-accessories

**KRM Functions**

**Preferred: `apply-replacements`**

Use when:

* storeType  
  * replace specific fields

Examples:

* Store title / Banner text  
* Logo / Catalog / Image URLs

This is the most kpt-native solution.

---

**Mutators**

Primary mutator:

* branding-config  
  * apply-replacements  
    * shop resources

**Validators**

Possible validator:

Ensure store type is valid.

Example:

* Accept: astronomy, florist, car-accessories  
* Reject: electronics, random-value

This can be a simple validation function.

Not mandatory, but nice to showcase.

#### **2.Language and currency localization**

What should change?

Language

- Options: en-US, en-IN, fr-FR, de-DE  
- Impacts: Locale, formatting, translations

---

Currency

- Options: USD, INR, EUR, GBP  
- Impacts: Displayed prices, Service config, Symbols

---

**Configuration Source**

```
kind: ConfigMap
metadata:
  name: localization-config
data:
  language: en-IN
  currency: INR
```

---

**Preferred KRM Function**

apply-replacements

This is exactly what it was designed for.

* localization-config  
  * apply-replacements  
    * Frontend / Currency service env vars

**Validator**

Validate:

* currency ∈ {USD, INR, EUR, GBP}  
* language ∈ {en-US, en-IN, fr-FR, de-DE}

Reject invalid values.

#### **3\. Sales tax/ VAT localization**

**Better idea**

Use:

```
kind: ConfigMap
data:
  region: india
```

Then:

* region  
  * Starlark  
    * taxRate

Example mapping:

* india \-\> GST 18%  
* eu    \-\> VAT 19%  
* us    \-\> Sales Tax 8%

This showcases:

* Configuration-as-Data  
* Custom KRM function  
* Mutations  
* Deterministic rendering

Use Starlark to derive **multiple fields**:

* region: india  
  * Starlark Mutation  
    * currency \= INR, tax \= 18, locale \= en-IN

Now one config drives multiple resources.

That's a much stronger kpt demo than fetching live tax rates.

In fact, you could merge **Localization \+ Tax Localization** into a single:

region-config

**Affected services:**

* Frontend, Checkout, Payment, Accounting

#### **4\. Deployment Configuration**

This is actually the **best candidate for Starlark** among all four requirements.

---

### **What should change?**

* Profile: small, medium, large  
* Should affect: Replicas, CPU requests, Memory requests, Observability components

### **Example Profiles**

* **Small**  
  * frontend replicas \= 1  
  * checkout replicas \= 1  
  * collector replicas \= 1  
  * grafana disabled  
  * jaeger disabled  
* **Medium**  
  * frontend replicas \= 2  
  * checkout replicas \= 2  
  * collector replicas \= 1  
  * grafana enabled  
  * jaeger enabled  
* **Large**  
  * frontend replicas \= 5  
  * checkout replicas \= 3  
  * collector replicas \= 3  
  * full observability stack

### **Configuration Source**

```
kind: ConfigMap
metadata:
  name: deployment-profile
data:
  profile: medium
```

### **Why not just apply-replacements?**

Because one value profile=medium affects:

* 20+ resources  
* Many different fields  
* Conditional enable/disable

This is business logic.

### **Recommended Mutator: StarlarkRun**

The Starlark transformation flow:

```
profile
  ↓
Starlark
  ↓
replicas, resources, component enablement
```

This is exactly the type of transformation Starlark is meant for.

### **Useful Validators**

Validate only the following profiles and reject any others (e.g., tiny, xlarge, random):

* small  
* medium  
* large

### **Nice Extra Showcase**

You can make the profile influence package composition, tying together Composability, Starlark, and Configuration-as-Data:

* **Small**: shop only, collector only  
* **Large**: shop, collector, grafana, jaeger, prometheus

#### **5\. Chaos Engineering (Fault Injection)**

**Goal**

Implement a **declarative chaos engineering layer** that allows users to seamlessly simulate complex failure scenarios across the OpenTelemetry Demo application. The chaos layer leverages the upstream `flagd` feature-flag configurations to inject faults (latency, errors, high CPU, memory leaks) without manually modifying any source code or upstream `shop/` manifests.

At the end of this phase, a user must be able to:

1. Edit a single `chaos-config.yaml` located in `app/chaos/`.
2. Set `data.scenario` to one of the supported values (e.g., `payment-outage`, `high-load`, `broken-catalog`, `memory-leak`, `off`).
3. Run `kpt fn render` at the `app/` level.
4. See the `flagd-config` ConfigMap dynamically rewritten to enable the specific faults for the selected scenario.

> **"Configuration as Data" Showcase:** This demonstrates **dynamic JSON mutation** within a YAML field. Instead of fragile string replacements, we use Kpt's embedded Starlark `json` library to safely decode the upstream `demo.flagd.json` string, mutate specific feature flag states based on the chosen scenario, and encode it back — preserving any new flags added by upstream in the future.

---

**Source Code Analysis: Current State of Faults**

The OpenTelemetry demo includes built-in failure scenarios controlled by **feature flags** (via the `flagd` service). These flags are defined in a JSON string inside the `flagd-config` ConfigMap (`app/shop/flagd/configmap_flagd-config.yaml`).

Currently, all flags default to `"off"`:

```json
"flags": {
  "paymentFailure": {
    "defaultVariant": "off",
    "variants": { "100%": 1, "off": 0 }
  },
  "paymentUnreachable": {
    "defaultVariant": "off",
    "variants": { "on": true, "off": false }
  },
  "loadGeneratorFloodHomepage": {
    "defaultVariant": "off",
    "variants": { "on": 100, "off": 0 }
  }
  // ... and 12 more flags for memory leaks, CPU spikes, cache failures, etc.
}
```

The downstream microservices (e.g., `payment`, `ad`, `product-catalog`) use OpenTelemetry SDKs to dynamically query `flagd` at runtime and simulate the corresponding failure if the flag is enabled.

---

**Scope Boundary**

*In Scope:*

* Create a **new `app/chaos/` sibling directory** (outside `shop/`, `observability/`, `branding/`, `regional/`, and `profiles/`).
* Create a `chaos-config.yaml` ConfigMap with a single `scenario` field.
* Use **Starlark (`StarlarkRun`)** to read `scenario`, parse the JSON payload inside the `flagd-config` ConfigMap, update the `defaultVariant` for the relevant flags, and re-serialize the JSON.
* Add a **validator** to ensure `scenario` is in the allowed set.
* Update `app/Kptfile` pipeline to invoke the chaos mutators.

*Out of Scope:*

* No custom code injection or new failure modes — we strictly rely on the upstream `flagd` capabilities.
* No changes to `app/shop/` or `app/observability/` upstream manifests.
* No interaction with `branding/`, `regional/`, or `profiles/` — chaos engineering is completely independent.

---

**Chaos Scenarios**

We group individual feature flags into high-level **Chaos Scenarios** that tell a compelling observability story.

**Scenario: `payment-outage`**

Simulates a complete outage of the payment provider.

* Flags changed: `paymentFailure` → `"100%"`, `paymentUnreachable` → `"on"`
* Affected services: `payment`, `checkout` (will timeout trying to call payment).
* Unaffected services: `frontend`, `cart`, `product-catalog` (users can still browse and add to cart, but cannot checkout).

**Scenario: `high-load`**

Simulates a viral traffic spike causing CPU and messaging queue bottlenecks.

* Flags changed: `loadGeneratorFloodHomepage` → `"on"`, `adHighCpu` → `"on"`, `kafkaQueueProblems` → `"on"`
* Affected services: `load-generator` (traffic spike), `frontend` (high request volume), `ad` (CPU throttling), `kafka` (queue lag), `accounting` (consumer lag).
* Unaffected services: `email`, `currency`.

**Scenario: `broken-catalog`**

Simulates a degraded backend cache and catalog failure.

* Flags changed: `productCatalogFailure` → `"on"`, `recommendationCacheFailure` → `"on"`
* Affected services: `product-catalog`, `recommendation`.
* Unaffected services: `cart`, `shipping`, `payment`.

**Scenario: `memory-leak`**

Simulates slow, creeping memory leaks requiring garbage collection intervention.

* Flags changed: `emailMemoryLeak` → `"100x"`, `adManualGc` → `"on"`
* Affected services: `email`, `ad`.
* Unaffected services: `frontend`, `checkout`, `payment`.

**Scenario: `off` (Default)**

Normal operations. All flags remain `"off"`.

---

**Why Starlark for JSON Mutation?**

| Approach | Fit | Reason |
| ----- | ----- | ----- |
| `apply-replacements` | ❌ Wrong tool | Works on YAML structural fields. The flag configuration is embedded as a raw JSON string (`data."demo.flagd.json"`). |
| `search-replace` | ❌ Fragile | String substitution across 15 different flags using regex is highly brittle. If upstream changes spacing or order, it breaks. |
| Starlark (`json` module) | ✅ Best fit | Kpt Starlark supports `json.decode` / `json.encode`. We safely decode the string into a dictionary, mutate the exact keys dynamically, and encode it back. |

---

**Directory Structure**

```
app/
├── Kptfile                              (UPDATED — chaos pipeline added)
├── shop/                                (UPSTREAM — untouched)
├── observability/                       (UPSTREAM — untouched)
├── branding/                            (Phase 3 — untouched)
├── regional/                            (Phase 4 — untouched)
├── profiles/                            (Phase 5 — untouched)
└── chaos/                               (NEW — chaos engineering layer)
    ├── chaos-config.yaml                (source of truth: scenario)
    ├── setup-chaos.yaml                 (StarlarkRun — JSON mutation)
    └── validator-chaos.yaml             (StarlarkRun — scenario enum check)
```

---

**File Specifications**

*`app/chaos/chaos-config.yaml`*

```
apiVersion: v1
kind: ConfigMap
metadata:
  name: chaos-config
  annotations:
    config.kubernetes.io/local-config: "true"
data:
  scenario: "off"
```

*`app/chaos/setup-chaos.yaml` (StarlarkRun)*

```
apiVersion: fn.kpt.dev/v1alpha1
kind: StarlarkRun
metadata:
  name: setup-chaos
  annotations:
    config.kubernetes.io/local-config: "true"
source: |-
  load("krmfn.star", "krmfn")
  load("json.star", "json")

  def setup_chaos(resources):
    scenario = "off"

    # Read scenario from config
    for r in resources:
      if krmfn.match_gvk(r, "v1", "ConfigMap") and krmfn.match_name(r, "chaos-config"):
        scenario = r.get("data", {}).get("scenario", "off")

    if scenario == "":
      fail("scenario cannot be empty in chaos-config")

    # Define the chaos mapping
    chaos_matrix = {
      "off": {},
      "payment-outage": {
        "paymentFailure": "100%",
        "paymentUnreachable": "on"
      },
      "high-load": {
        "loadGeneratorFloodHomepage": "on",
        "adHighCpu": "on",
        "kafkaQueueProblems": "on"
      },
      "broken-catalog": {
        "productCatalogFailure": "on",
        "recommendationCacheFailure": "on"
      },
      "memory-leak": {
        "emailMemoryLeak": "100x",
        "adManualGc": "on"
      }
    }

    if scenario not in chaos_matrix:
      fail("Unsupported chaos scenario: " + scenario)

    flags_to_enable = chaos_matrix[scenario]

    # Find the flagd-config ConfigMap and mutate the JSON
    for r in resources:
      if krmfn.match_gvk(r, "v1", "ConfigMap") and krmfn.match_name(r, "flagd-config"):
        raw_json = r.get("data", {}).get("demo.flagd.json", "")
        if raw_json == "":
          fail("demo.flagd.json not found in flagd-config")

        # Parse JSON
        parsed = json.decode(raw_json)

        # Reset all flags to "off" first to ensure idempotency
        for flag_name, flag_data in parsed.get("flags", {}).items():
          flag_data["defaultVariant"] = "off"

        # Apply the chosen scenario's flags
        for flag_name, variant in flags_to_enable.items():
          if flag_name in parsed["flags"]:
            parsed["flags"][flag_name]["defaultVariant"] = variant
          else:
            fail("Flag " + flag_name + " not found in upstream flagd-config")

        # Re-serialize JSON with indentation for readability
        r["data"]["demo.flagd.json"] = json.encode_indent(parsed)
        break

  setup_chaos(ctx.resource_list["items"])
```

*`app/chaos/validator-chaos.yaml` (StarlarkRun)*

```
apiVersion: fn.kpt.dev/v1alpha1
kind: StarlarkRun
metadata:
  name: validator-chaos
  annotations:
    config.kubernetes.io/local-config: "true"
source: |-
  def validate_chaos(ctx):
    for r in ctx.resource_list["items"]:
      if r.get("kind") == "ConfigMap" and r.get("metadata", {}).get("name") == "chaos-config":
        scenario = r.get("data", {}).get("scenario", "")
        valid_scenarios = ["off", "payment-outage", "high-load", "broken-catalog", "memory-leak"]
        if scenario not in valid_scenarios:
          fail("scenario '" + scenario + "' is invalid. Allowed values: " + str(valid_scenarios))
    return

  validate_chaos(ctx)
```

---

**Pipeline Integration: `app/Kptfile`**

Add the chaos steps to the mutator and validator lists. It operates exclusively on the `flagd-config` ConfigMap, so order relative to `branding`, `regional`, or `profiles` does not matter.

```
pipeline:
  mutators:
    # [ ... branding, regional, profiles mutators ... ]
    - image: ghcr.io/kptdev/krm-functions-catalog/starlark:v0.5.5
      configPath: chaos/setup-chaos.yaml
  validators:
    # [ ... existing validators ... ]
    - image: ghcr.io/kptdev/krm-functions-catalog/starlark:v0.5.5
      configPath: chaos/validator-chaos.yaml
```

---

**Testing Strategy**

1. **Idempotency Test:** Set `scenario: off`, run `kpt fn render .`, and ensure the `flagd-config` ConfigMap remains unchanged (all `defaultVariant: "off"`).
2. **Payment Outage Test:** Set `scenario: payment-outage`, run `kpt fn render .`. Verify `demo.flagd.json` now contains `"defaultVariant": "100%"` for `paymentFailure` and `"on"` for `paymentUnreachable`.
3. **High Load Test:** Set `scenario: high-load`, run `kpt fn render .`. Verify `loadGeneratorFloodHomepage`, `adHighCpu`, and `kafkaQueueProblems` are activated.
4. **Validation Test:** Set `scenario: invalid-scenario`, run render, and verify it fails with the expected error message.
5. **Upstream Resilience:** Verify that `kpt pkg update` still works cleanly because we are not replacing the entire ConfigMap file, only parsing and modifying specific keys within the JSON tree.

| What the user does | What Kpt does |
| ----- | ----- |
| Sets `scenario: payment-outage` | Starlark decodes the JSON, rewrites the `paymentFailure` and `paymentUnreachable` variants to `100%` and `on`, and encodes the JSON back into the ConfigMap. |

---

### **Summary Table**

| Requirement | Best Mutator |
| ----- | ----- |
| Branding | apply-replacements |
| Localization | apply-replacements |
| Tax Localization | Starlark (derive from region) |
| Deployment Profiles | Starlark (best fit) |
| Chaos Engineering (Fault Injection) | Starlark (JSON mutation via flagd) |

---

## **4\. Profile Influences Package Composition**

Currently, the composition is fixed (shop \+ observability). While profiles could decide inclusion (e.g., Small \= shop \+ collector), the requirement for deployment configuration usually refers to resources (replicas, CPU, memory). Therefore, it is recommended to keep composition constant and use Starlark to scale resources.

## **5\. Better Use Cases for OTel Demo**

The following use cases align more naturally with OTel architecture than branding changes:

* **Regional Deployment**: Mutates currency, language, tax, and timezone via Starlark and apply-replacements.  
* **Observability Level**: Options (basic, standard, advanced) mutate collector config and sampling rates.  
* **Feature Flag Environment**: Mutates behavior for recommendation services and ads.  
* **AI Features Profile**: Configures LLM deployment and review summarization endpoints.

## **6\. Final flow**

Composability  
      ↓  
Configuration as Data  
      ↓  
Mutators  
      ↓  
Validators  
      ↓  
kpt fn render  
      ↓  
kpt live apply                     
      ↓  
Running Application  
      ↓  
kpt pkg update  
      ↓  
3-way merge  
      ↓  
Updated Application

## **7\. Proposed Timeline**

**Phase 0 (May 28 \- Jun 5\)**

* Decide the architecture of the project

#### **Phase 1 (Jun 6- Jun 10\)**

* Create root package structure  
* Create `shop/` subpackage  
* Create `observability/` subpackage  
* Verify independent deployment

            Implement:

* package composition  
* namespace strategy  
* self-contained RBAC  
* parameterized collector endpoint


#### **Phase 2 (Jun 11- Jun 15\)**

* Setup render pipeline  
* Setup `kpt fn render`  
* Setup local cluster demo  
* Setup `kpt live apply`


**Phase 3 (Jun 16 – Jun 25\)** 

	Implement : 

* Pipeline for “Change from astronomy shop \-\> florist”  
* Demo, docs, cleanup 


**June 26 \-\> Midterm evaluation** 

**Phase 4 (Jun 27 \- Jul 8\)**

	Implement : 

* Pipeline for “Language and currency localization”  
* Demo, docs, cleanup

**Phase 5 (Jul 9  \- Jul 22\)**

	Implement : 

* Pipeline for “Sales tax/VAT localization”  
* Demo,docs,cleanup

**Phase 6 (Jul 23 \- Aug 5 )**  
	  
	Implement : 

* Pipeline for "Deployment configuration"  
* Demo,docs,cleanup

**Phase 7 (Aug 6 \- Aug 18\)**  
	  
	Implement : 

* Chaos Engineering (Fault Injection) — declarative chaos layer via Starlark JSON mutation of flagd feature flags  
* Scenario definitions: `payment-outage`, `high-load`, `broken-catalog`, `memory-leak`, `off`  
* Pipeline integration, validators, testing  
* Demo,docs,cleanup

**Phase 8 (Aug 19 \- Aug 25\)**  
	  
	Implement : 

* Update \+ upstream strategy  
* Demo,docs,cleanup

The timeline is tentative and can change with the evaluation schedule, adding some other features etc.

