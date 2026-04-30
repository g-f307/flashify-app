#!/bin/sh
set -e

python -m app.run_migrations
exec "$@"
