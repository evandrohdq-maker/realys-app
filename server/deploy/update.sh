#!/usr/bin/env bash
# Atualiza o servidor com a última versão do GitHub (rode na VPS como root):  bash /opt/realys/server/deploy/update.sh
set -euo pipefail
/usr/local/bin/realys-backup || true
git -C /opt/realys pull --ff-only
chown -R realys:realys /opt/realys/server
systemctl restart realys
sleep 2
curl -fsS http://127.0.0.1:8080/health && echo " ✅ atualizado"
