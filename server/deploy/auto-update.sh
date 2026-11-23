#!/usr/bin/env bash
# Atualização automática do servidor (roda a cada 5 minutos pelo timer realys-auto-update).
# Só atualiza quando tem versão nova no GitHub E os testes do servidor passam nessa versão.
# Antes de trocar: backup do banco. Depois: confere se o servidor respondeu; se não, volta para a
# versão anterior sozinho. Tudo fica registrado em /var/log/realys-auto-update.log.
set -uo pipefail
REPO=/opt/realys
LOG=/var/log/realys-auto-update.log
exec 9>/run/realys-auto-update.lock
flock -n 9 || exit 0
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

# APK e site mais novos do GitHub para este servidor (não depende de ter versão nova do servidor).
bash "$REPO/server/deploy/publicar-site.sh" >/dev/null 2>&1 || true

git -C "$REPO" fetch -q origin main || { log "sem acesso ao GitHub"; exit 0; }
ATUAL=$(git -C "$REPO" rev-parse HEAD)
NOVA=$(git -C "$REPO" rev-parse origin/main)
[ "$ATUAL" = "$NOVA" ] && exit 0

# Testa a versão nova numa cópia separada (não mexe no que está no ar).
TESTE=$(mktemp -d /tmp/realys-teste-XXXX)
trap 'git -C "$REPO" worktree remove --force "$TESTE" >/dev/null 2>&1; rm -rf "$TESTE"' EXIT
git -C "$REPO" worktree add -q --detach "$TESTE" "$NOVA" || { log "não deu para preparar o teste de $NOVA"; exit 1; }
if ! (cd "$TESTE/server" && timeout 600 npm test --silent > /tmp/realys-teste.log 2>&1); then
  log "versão $(git -C "$REPO" log -1 --format='%h %s' "$NOVA") NÃO atualizada: testes falharam (veja /tmp/realys-teste.log)"
  exit 1
fi

/usr/local/bin/realys-backup >/dev/null 2>&1 || true
git -C "$REPO" merge -q --ff-only "$NOVA" || { log "não deu para avançar para $NOVA (mudança local no servidor?)"; exit 1; }
chown -R realys:realys "$REPO/server"
systemctl restart realys
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 3
  if curl -fsS http://127.0.0.1:8080/health >/dev/null 2>&1; then
    log "atualizado: $(git -C "$REPO" log -1 --format='%h %s')"
    exit 0
  fi
done

# Não subiu: volta para a versão que estava funcionando.
log "a versão $NOVA não respondeu; voltando para $ATUAL"
git -C "$REPO" reset -q --hard "$ATUAL"
chown -R realys:realys "$REPO/server"
systemctl restart realys
exit 1
