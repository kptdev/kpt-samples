# base-db

## Description
sample description

## Usage

### Fetch the package
`kpt pkg get REPO_URI[.git]/PKG_PATH[@VERSION] base-db`
Details: https://kpt.dev/reference/cli/pkg/get/

### View package content
`kpt pkg tree base-db`
Details: https://kpt.dev/reference/cli/pkg/tree/

### Apply the package
```
kpt live init base-db
kpt live apply base-db --reconcile-timeout=2m --output=table
```
Details: https://kpt.dev/reference/cli/live/
