#!/usr/bin/env bash
# Cópia de segurança do banco e das mídias do Realys. Guarda os últimos 14 dias em /var/backups/realys.
set -euo pipefail
DATA=/opt/realys/server/data
DEST=/var/backups/realys
STAMP=$(date +%Y-%m-%d)
mkdir -p "$DEST"
sqlite3 "$DATA/realys.db" ".backup '$DEST/realys-$STAMP.db'"
tar -czf "$DEST/media-$STAMP.tar.gz" -C "$DATA" media 2>/dev/null || true
find "$DEST" -type f -mtime +14 -delete
