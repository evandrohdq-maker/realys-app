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

# Editor de vídeo e conversão de WAV/vídeo: precisa do ffmpeg e da letra dos textos (instala UMA vez).
if ! command -v ffmpeg >/dev/null 2>&1; then
  log "instalando ffmpeg (editor de vídeo e conversão de WAV)"
  DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg fonts-dejavu-core >> "$LOG" 2>&1 || log "ffmpeg não instalou"
fi
# Envio de música de estúdio (WAV até 150 MB): a porta de entrada (Caddy) aceita até 200 MB.
if [ -f /etc/caddy/Caddyfile ] && grep -q 'max_size 64MB' /etc/caddy/Caddyfile; then
  sed -i 's/max_size 64MB/max_size 200MB/' /etc/caddy/Caddyfile && systemctl reload caddy && log "limite de envio do Caddy: 200 MB"
fi

# IA própria do Realyz (atendente e parecer de fake news): instala UMA vez, sozinha, em segundo plano,
# se ainda não estiver ligada no .env e a máquina tiver memória e disco. Sem isso, a "IA leve" segue valendo.
ENVF="$REPO/server/.env"
if [ -f "$ENVF" ] && ! grep -q '^IA_URL=' "$ENVF" && [ ! -f /var/lib/realys/ia-tentada ]; then
  MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
  DISCO_GB=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
  MODELO=""
  [ "$MEM_MB" -ge 7000 ] && MODELO="qwen2.5:3b"
  [ -z "$MODELO" ] && [ "$MEM_MB" -ge 3500 ] && MODELO="qwen2.5:1.5b"
  if [ -n "$MODELO" ] && [ "${DISCO_GB:-0}" -ge 8 ]; then
    mkdir -p /var/lib/realys && touch /var/lib/realys/ia-tentada
    log "instalando a IA do Realyz ($MODELO, memória ${MEM_MB} MB) em segundo plano"
    setsid nohup bash -c "
      if bash '$REPO/server/deploy/ia.sh' '$MODELO' >> /var/log/realys-ia.log 2>&1; then
        printf '\nIA_URL=http://127.0.0.1:11434\nIA_MODEL=$MODELO\n' >> '$ENVF'
        systemctl restart realys
        echo \"\$(date '+%Y-%m-%d %H:%M:%S') IA do Realyz ligada ($MODELO)\" >> '$LOG'
      else
        echo \"\$(date '+%Y-%m-%d %H:%M:%S') a IA não instalou (veja /var/log/realys-ia.log)\" >> '$LOG'
      fi" >/dev/null 2>&1 < /dev/null &
  else
    mkdir -p /var/lib/realys && touch /var/lib/realys/ia-tentada
    log "IA do Realyz não instalada: memória ${MEM_MB} MB ou disco ${DISCO_GB} GB insuficiente (segue a IA leve)"
  fi
fi

git -C "$REPO" fetch -q origin main || { log "sem acesso ao GitHub"; exit 0; }
ATUAL=$(git -C "$REPO" rev-parse HEAD)
NOVA=$(git -C "$REPO" rev-parse origin/main)
[ "$ATUAL" = "$NOVA" ] && exit 0

# Testa a versão nova numa cópia separada (não mexe no que está no ar).
TESTE=$(mktemp -d /tmp/realys-teste-XXXX)
trap 'git -C "$REPO" worktree remove --force "$TESTE" >/dev/null 2>&1; rm -rf "$TESTE"' EXIT
git -C "$REPO" worktree add -q --detach "$TESTE" "$NOVA" || { log "não deu para preparar o teste de $NOVA"; exit 1; }
# Testes com prioridade baixa (nice/ionice): o servidor no ar continua respondendo rápido para os usuários.
if ! (cd "$TESTE/server" && timeout 900 nice -n 19 ionice -c3 npm test --silent > /tmp/realys-teste.log 2>&1); then
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
