#!/usr/bin/env bash
# Gera a chave de criptografia da biometria e grava no .env do servidor (sem sobrescrever se já existir).
# A chave NÃO pode ir para o backup nem para o GitHub. Guarde uma cópia em cofre de senhas.
set -euo pipefail
ENV_FILE="${1:-/opt/realys/server/.env}"
touch "$ENV_FILE"
if grep -q '^BIOMETRIA_KEYS=' "$ENV_FILE"; then
  echo "BIOMETRIA_KEYS já existe em $ENV_FILE. Nada foi alterado."
  exit 0
fi
KEY=$(openssl rand -hex 32)
echo "BIOMETRIA_KEYS=1:$KEY" >> "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "Chave criada em $ENV_FILE (permissão 600)."
echo "Guarde uma cópia da linha BIOMETRIA_KEYS em lugar seguro: sem ela, os cadastros biométricos ficam ilegíveis."
