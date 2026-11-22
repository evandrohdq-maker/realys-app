#!/usr/bin/env bash
# Cria uma conta de teste (sem CPF, marcada como "Teste") para testar o app antes do lançamento.
# Rode na VPS como root:  bash /opt/realys/server/deploy/conta-teste.sh
# A senha é digitada por você e não aparece na tela.
set -euo pipefail
cd /opt/realys/server
read -rp "Nome da conta (ex.: Teste Um): " NOME
read -rp "Usuário, sem * (ex.: teste1): " USUARIO
read -rsp "Senha (mínimo 8, não aparece): " SENHA; echo
read -rsp "Repita a senha: " SENHA2; echo
if [ "$SENHA" != "$SENHA2" ]; then echo "❌ As senhas não batem."; exit 1; fi
if id realys >/dev/null 2>&1; then
  printf '%s' "$SENHA" | runuser -u realys -- node --disable-warning=ExperimentalWarning src/criarContaTeste.js "$NOME" "$USUARIO"
else
  printf '%s' "$SENHA" | node --disable-warning=ExperimentalWarning src/criarContaTeste.js "$NOME" "$USUARIO"
fi
unset SENHA SENHA2
