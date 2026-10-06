# nginx-shop

A lightweight, buildless analog of the otel-demo shop. Stock `nginx` serves a
static storefront from a ConfigMap; a Starlark KRM function switches the store
(`astronomy` | `florist`) and language (`en-US` | `hi-IN` | `cs-CZ` | `zh-CN`).

Edit `storeType`/`locale` in `ui-config.yaml`, then `kpt fn render .`. The
`set-shop` function stamps those two values into the web root's `config.js`;
the browser reads it and renders the matching store/locale (headline, button,
currency, product names + images). `validate-shop` rejects invalid values and
`set-namespace` scopes everything to one namespace. No image build or pull
beyond stock nginx — storefront images load from GitHub at page load.

See [RUN.md](./RUN.md) to run the demo.
