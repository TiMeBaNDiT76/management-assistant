#!/bin/sh
# Cloud Run entrypoint: restore the SQLite database from the GCS replica
# (if it exists), then run the Node.js server wrapped by litestream replication.
set -eu

DB_PATH="${DB_PATH:-/data/mgmt.db}"
LITESTREAM_CONFIG="${LITESTREAM_CONFIG:-/etc/litestream.yml}"

echo "[entrypoint] Restoring database from replica if available (${DB_PATH})..."
litestream restore -if-db-not-exists -if-replica-exists "$DB_PATH"

echo "[entrypoint] Starting litestream replication + node server..."
exec litestream replicate -exec "node dist/index.js" "$LITESTREAM_CONFIG"
