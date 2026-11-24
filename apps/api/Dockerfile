# syntax=docker/dockerfile:1
# Multi-stage image for Cloud Run: builds the API for linux/amd64 and ships it
# together with the static litestream binary. Build from the repository root:
#   docker build -f apps/api/Dockerfile .

# --- Builder: compiles better-sqlite3 natively for linux/amd64 -----------------
FROM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /repo
COPY . .

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @mgmt/shared build \
  && pnpm --filter @mgmt/api build \
  && pnpm --filter @mgmt/api --prod deploy /out

# --- Runtime: minimal image with litestream + node server ----------------------
FROM node:22-bookworm-slim AS runtime

ARG LITESTREAM_VERSION=0.3.13
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-v${LITESTREAM_VERSION}-linux-amd64.tar.gz" \
      | tar -xz -C /usr/local/bin \
  && chmod +x /usr/local/bin/litestream \
  && addgroup --system app && adduser --system --ingroup app app \
  && mkdir -p /data && chown app:app /data

WORKDIR /app
COPY --from=build /out ./
COPY apps/api/litestream.yml /etc/litestream.yml
COPY apps/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production \
    DB_PATH=/data/mgmt.db \
    PORT=8080

USER app
EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
