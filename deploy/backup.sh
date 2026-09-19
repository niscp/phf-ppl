#!/bin/sh
set -eu
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker compose exec -T postgres pg_dump -U phf_auction -d phf_auction -Fc > "backups/phf-auction-${stamp}.dump"
find backups -type f -name 'phf-auction-*.dump' -mtime +14 -delete

