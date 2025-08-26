# loadgenerator

## Description
sample description

## Usage

### Fetch the package
`kpt pkg get REPO_URI[.git]/PKG_PATH[@VERSION] loadgenerator`
Details: https://kpt.dev/reference/cli/pkg/get/

### View package content
`kpt pkg tree loadgenerator`
Details: https://kpt.dev/reference/cli/pkg/tree/

### Apply the package
```
kpt live init loadgenerator
kpt live apply loadgenerator --reconcile-timeout=2m --output=table
```
Details: https://kpt.dev/reference/cli/live/
