# Copyright The OpenTelemetry Authors
# SPDX-License-Identifier: Apache-2.0

FROM docker.io/library/node:24.16.0-slim@sha256:242549cd46785b480c832479a730f4f2a20865d61ea2e404fdb2a5c3d3b73ecf AS builder

WORKDIR /app

COPY ./frontend-src/frontend/package.json package.json
COPY ./frontend-src/frontend/package-lock.json package-lock.json

RUN npm ci

COPY ./frontend-src/frontend/components/ components/
COPY ./frontend-src/frontend/gateways/ gateways/
COPY ./frontend-src/frontend/pages/ pages/
COPY ./frontend-src/frontend/protos/ protos/
COPY ./frontend-src/frontend/providers/ providers/
COPY ./frontend-src/frontend/services/ services/
COPY ./frontend-src/frontend/styles/ styles/
COPY ./frontend-src/frontend/types/ types/

COPY ./frontend-src/frontend/utils/enums/ utils/enums/
COPY ./frontend-src/frontend/utils/telemetry/ utils/telemetry/
COPY ./frontend-src/frontend/utils/imageLoader.js utils/imageLoader.js
COPY ./frontend-src/frontend/utils/Request.ts utils/Request.ts

COPY ./frontend-src/frontend/next.config.js next.config.js
COPY ./frontend-src/frontend/tsconfig.json tsconfig.json

RUN npm run build

# -----------------------------------------------------------------------------

FROM docker.io/library/node:24.16.0-slim@sha256:242549cd46785b480c832479a730f4f2a20865d61ea2e404fdb2a5c3d3b73ecf AS deps

WORKDIR /app

COPY ./frontend-src/frontend/package.json package.json
COPY ./frontend-src/frontend/package-lock.json package-lock.json

RUN npm ci --omit=dev

# -----------------------------------------------------------------------------

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:4c11c00f9d72bbe5d42fbcab421229b3c046d949f4e0a8e2d50e88a9b319a9e2

WORKDIR /app

COPY --from=builder /app/.next/standalone/ ./
COPY --from=builder /app/.next/static/ .next/static/

COPY --from=deps /app/node_modules/ node_modules/

COPY ./frontend-src/frontend/public/ public/

COPY ./frontend-src/frontend/utils/telemetry/Instrumentation.js Instrumentation.js

EXPOSE ${FRONTEND_PORT}

CMD ["--require=./Instrumentation.js", "server.js"]
