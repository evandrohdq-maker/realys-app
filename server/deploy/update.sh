#!/usr/bin/env bash
# Atualiza o servidor com a última versão do GitHub (rode na VPS como root):  bash /opt/realys/server/deploy/update.sh
set -euo pipefail
/usr/local/bin/realys-backup || true
git -C /opt/realys pull --ff-only
# Editor de vídeo e conversão de WAV/vídeo: ffmpeg e a letra dos textos (só na primeira vez).
command -v ffmpeg >/dev/null 2>&1 || DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg fonts-dejavu-core || true
# WAV até 150 MB: a porta de entrada (Caddy) aceita até 200 MB.
if [ -f /etc/caddy/Caddyfile ] && grep -q 'max_size 64MB' /etc/caddy/Caddyfile; then sed -i 's/max_size 64MB/max_size 200MB/' /etc/caddy/Caddyfile && systemctl reload caddy; fi
chown -R realys:realys /opt/realys/server
systemctl restart realys
bash /opt/realys/server/deploy/publicar-site.sh || true
sleep 2
curl -fsS http://127.0.0.1:8080/health && echo " ✅ atualizado"
