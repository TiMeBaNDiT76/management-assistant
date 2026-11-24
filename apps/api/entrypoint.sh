#!/bin/sh
# Cloud Run entrypoint: render the litestream config from the environment,
# restore the SQLite database from the GCS replica (if it exists), then run
# the Node.js server wrapped by litestream replication.
#
# NOTE: litestream v0.5 does NOT expand environment variables inside its
# config file, so the config is rendered here at startup.
set -eu

DB_PATH="${DB_PATH:-/data/mgmt.db}"
LITESTREAM_BUCKET="${LITESTREAM_BUCKET:?LITESTREAM_BUCKET must be set}"
LITESTREAM_CONFIG="${LITESTREAM_CONFIG:-/tmp/litestream.yml}"

echo "[entrypoint] Rendering litestream config to ${LITESTREAM_CONFIG}..."
cat > "$LITESTREAM_CONFIG" <<EOF
dbs:
  - path: ${DB_PATH}
    replicas:
      - type: gs
        bucket: ${LITESTREAM_BUCKET}
        path: mgmt
EOF

echo "[entrypoint] Restoring database from replica if available (${DB_PATH})..."
litestream restore \
  -if-db-not-exists \
  -if-replica-exists \
  -config "$LITESTREAM_CONFIG" \
  "$DB_PATH"

echo "[entrypoint] Starting litestream replication + node server..."
exec litestream replicate \
  -config "$LITESTREAM_CONFIG" \
  -exec "node dist/index.js"
