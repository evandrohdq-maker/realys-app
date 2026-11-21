#!/usr/bin/env bash
# Instala a IA própria do Realyz (modelo aberto, gratuito) na VPS. Rode como root:
#   bash /opt/realys/server/deploy/ia.sh [modelo]      (padrão: qwen2.5:3b)
set -euo pipefail
MODELO="${1:-qwen2.5:3b}"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
# Só o próprio servidor acessa a IA (não fica aberta na internet).
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/realyz.conf <<CONF
[Service]
Environment="OLLAMA_HOST=127.0.0.1:11434"
Environment="OLLAMA_KEEP_ALIVE=24h"
CONF
systemctl daemon-reload
systemctl enable --now ollama
systemctl restart ollama
sleep 3
ollama pull "$MODELO"
echo
echo "Pronto. Coloque no /opt/realys/server/.env:"
echo "  IA_URL=http://127.0.0.1:11434"
echo "  IA_MODEL=$MODELO"
echo "e rode: systemctl restart realys"
