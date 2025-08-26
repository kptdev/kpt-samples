#!/bin/bash
# Point to the internal API server hostname
APISERVER=https://kubernetes.default.svc
# Path to ServiceAccount token
SERVICEACCOUNT=/var/run/secrets/kubernetes.io/serviceaccount
# Read this Pod's namespace
NAMESPACE=$(cat ${SERVICEACCOUNT}/namespace)
# Read the ServiceAccount bearer token
TOKEN=$(cat ${SERVICEACCOUNT}/token)
# Reference the internal certificate authority (CA)
CACERT=${SERVICEACCOUNT}/ca.crt

secret=$(cat <<EOF
---
apiVersion: v1
kind: Secret
metadata:
  name: ${SECRET_NAME}
  namespace: ${NAMESPACE}
type: Opaque
data:
  mariadb-root-password: "dE5JbEpVMlpUUQ=="
  mariadb-password: "bk9WRjJaOWVuaw=="
EOF
)

echo ${secret}
curl --cacert ${CACERT} --header "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/yaml" -d "${secret}" -X POST ${APISERVER}/api/v1/namespaces/${NAMESPACE}/secrets

