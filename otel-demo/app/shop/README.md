# shop

## Description

sample description

## Usage

### Fetch the package

`kpt pkg get REPO_URI[.git]/PKG_PATH[@VERSION] shop`
Details: https://kpt.dev/reference/cli/pkg/get/

### View package content

`kpt pkg tree shop`
Details: https://kpt.dev/reference/cli/pkg/tree/

### Apply the package

```
kpt live init shop
kpt live apply shop --reconcile-timeout=2m --output=table
```

Details: https://kpt.dev/reference/cli/live/

### Telemetry parameters

The shop package keeps telemetry wiring in [telemetry-config.yaml](telemetry-config.yaml), which is local config and is not applied to the cluster.

Update `otel-collector-name`, `otel-exporter-otlp-endpoint-http`, `otel-exporter-otlp-endpoint-grpc`, and `flagd-otel-collector-uri` there to point the package at a different telemetry stack.
