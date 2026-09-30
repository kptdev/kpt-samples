# Copyright The OpenTelemetry Authors
# SPDX-License-Identifier: Apache-2.0


FROM docker.io/library/python:3.14.5-alpine3.22@sha256:6b91e66ab2a880ce9ca5a1b91c70f45963ff71ff68268df056336e1a657d5efd AS build-venv

RUN apk update && \
    apk add gcc g++ linux-headers

COPY ./requirements.txt requirements.txt

RUN python -m venv venv && \
    venv/bin/pip install --no-cache-dir --require-hashes -r requirements.txt

FROM docker.io/library/python:3.14.5-alpine3.22@sha256:6b91e66ab2a880ce9ca5a1b91c70f45963ff71ff68268df056336e1a657d5efd

COPY --from=build-venv /venv/ /venv/

WORKDIR /app

COPY ./app.py app.py
# Copy all per-locale product review JSONs flat into /app/.
# The LLM's summary_file_for_locale() looks for <base>-<LOCALE>.json next to
# product-review-summaries.json, so all locale variants must sit at /app/.
COPY ./product-review-summaries/*.json ./

ENV LLM_PORT=8000
EXPOSE ${LLM_PORT}
ENTRYPOINT [ "/venv/bin/python", "app.py" ]
