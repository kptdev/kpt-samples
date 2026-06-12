## GSOC 26 KPT Project

This repository packages the OpenTelemetry demo as two independently pluggable Kpt subpackages:

- `app/shop` for the application workloads
- `app/observability` for the telemetry stack

Each package is self-contained. The package manifests are rendered with local KRM functions, and the telemetry-related values are supplied through package-local `telemetry-config.yaml` files. Those files are marked as local config, so they are used during render but are not applied to the cluster.

## How the pluggability works

### Shop package

Edit [app/shop/telemetry-config.yaml](app/shop/telemetry-config.yaml) to plug shop into a telemetry backend.

Relevant values include:

- `otel-collector-name`
- `otel-exporter-otlp-endpoint-http`
- `otel-exporter-otlp-endpoint-grpc`
- `flagd-otel-collector-uri`
- `grafana-host`
- `jaeger-host`

These values are consumed by [app/shop/apply-telemetry.yaml](app/shop/apply-telemetry.yaml), which injects them into the workload environment variables at render time.

### Observability package

Edit [app/observability/telemetry-config.yaml](app/observability/telemetry-config.yaml) to point observability at different backends or collector endpoints.

Relevant values include:

- `opensearch-endpoint`
- `prometheus-otlp-endpoint`
- `jaeger-otlp-endpoint`
- `collector-self-otlp-endpoint`
- `grafana-prometheus-url`
- `grafana-jaeger-url`
- `grafana-opensearch-url`
- `prometheus-addr`
- `otel-collector-host`
- `otel-collector-port-http`
- `jaeger-host`
- `jaeger-grpc-port`

These values are consumed by [app/observability/apply-telemetry.yaml](app/observability/apply-telemetry.yaml), which rewrites the collector, Jaeger, and Grafana config to match the target stack.

## What this enables

- Pull `shop` alone and point it at your own OpenTelemetry collector.
- Pull `observability` alone and wire it to a different OpenSearch, Prometheus, or Jaeger deployment.
- Keep the package manifests reusable without hardcoded cross-package endpoints.

## Usage

To customize a package, edit its `telemetry-config.yaml` file first, then render or apply that package with kpt.

Example:

```bash
kpt fn render app/shop
kpt fn render app/observability
```

If you want to deploy only one package, update only that package's local config and leave the other package untouched.
