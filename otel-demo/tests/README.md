# Tests

Test suite for the `app/branding/` implementation (Phase 3 — Astronomy Shop → Florist).

## Layout

```
tests/
├── README.md                              this file
├── run-all.sh                             run every test in sequence
├── test-unit-validator.sh                 unit: validator accepts/rejects storeType
├── test-integration-01-astronomy.sh       integration: default render is idempotent
├── test-integration-02-florist.sh         integration: florist render applies branding
├── test-integration-03-invalid.sh         integration: invalid storeType fails the render
└── test-integration-04-branding-scope.sh  regression: branding/ folder is never mutated
```


## Prerequisites

- [`kpt`](https://kpt.dev/installation/kpt-cli) 
- `bash` 
- Run the suite from the repository root or from inside `tests/`. Each script
  auto‑locates `app/` by walking up from its own location.
- Run from a clean working tree (no uncommitted changes to `app/branding/`),
  or be willing to discard any changes the tests introduce.

## Running

Run every test:

```bash
bash tests/run-all.sh
```

Run a single test directly:

```bash
bash tests/test-unit-validator.sh
```

Each test exits `0` on pass and non‑zero on failure, and prints a `PASS:` /
`FAIL:` line for each assertion.

## What the tests check

| Script | Layer | Checks |
| --- | --- | --- |
| `test-unit-validator.sh` | unit | `validator-branding.yaml` Starlark accepts `astronomy` and `florist`, rejects everything else (e.g. `grocery`, empty string). |
| `test-integration-01-astronomy.sh` | integration | With the default `storeType: astronomy`, `kpt fn render app/` leaves every upstream image in `shop/` untouched (idempotent). |
| `test-integration-02-florist.sh` | integration | After switching `storeType` to `florist` and rendering, the florist images, product ID, and catalog SQL are propagated into the `shop/` resources. |
| `test-integration-03-invalid.sh` | integration | A `storeType` outside the allowed set causes `kpt fn render` to fail with a non‑zero exit code. |
| `test-integration-04-branding-scope.sh` | regression | Rendering with any `storeType` never mutates files under `app/branding/` (the source ConfigMaps that the search‑replace must skip). |

## Side effects

`test-integration-0[2-4]-*.sh` temporarily edit `app/branding/branding-config.yaml`
and run `kpt fn render app/`. They restore `storeType` to its original value and
re‑render before exiting (via a shell `trap`), so the working tree should be back
to its pre‑test state when the script exits successfully.

`kpt fn render` may also create or update `configmap_value-store.yaml` and
`configmap_active-postgresql-init.yaml` under `app/branding/`. These are normal
rendered outputs and are safe to delete with `git checkout -- app/branding/`.
