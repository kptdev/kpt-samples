# Copyright The OpenTelemetry Authors
# SPDX-License-Identifier: Apache-2.0


FROM docker.io/library/ruby:3.4.8-alpine3.22@sha256:4e852a14c88d2f30c401eba8b573ed382905719040e3b3079e1dfd2369cba2ff AS builder

COPY ./Gemfile Gemfile
COPY ./Gemfile.lock Gemfile.lock

RUN apk update && \
    apk add make gcc musl-dev gcompat && \
    bundle install

FROM docker.io/library/ruby:3.4.8-alpine3.22@sha256:4e852a14c88d2f30c401eba8b573ed382905719040e3b3079e1dfd2369cba2ff

COPY --from=builder /usr/local/bundle/ /usr/local/bundle/

WORKDIR /email_server

COPY ./views/ views/
COPY ./locales/ locales/

COPY ./.ruby-version .ruby-version
COPY ./Gemfile Gemfile
COPY ./Gemfile.lock Gemfile.lock
COPY ./email_server.rb email_server.rb

EXPOSE ${EMAIL_PORT}
ENTRYPOINT ["bundle", "exec", "ruby", "email_server.rb"]
