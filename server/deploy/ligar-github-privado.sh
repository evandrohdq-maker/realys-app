#!/usr/bin/env bash
# Liga o servidor ao repositório PRIVADO do GitHub e passa a servir o site e o APK daqui.
# Rode UMA vez, como root:  bash /opt/realys/server/deploy/ligar-github-privado.sh
#
# Antes, crie no GitHub um token só de leitura (Settings › Developer settings › Fine-grained tokens):
#   Repository access: Only select repositories → realys-app
#   Permissions › Repository: Contents = Read-only (Metadata = Read-only vem junto)
# O script pede o token (ele não aparece na tela), guarda no .env e configura o resto.
set -euo pipefail
ENVF=/opt/realys/server/.env
REPO=/opt/realys

read -r -s -p "Cole o token do GitHub (github_pat_...) e aperte Enter: " TOKEN; echo
[ -n "$TOKEN" ] || { echo "Token vazio."; exit 1; }

# 1) Token no .env (troca o antigo, se tiver) e no git do servidor (para o update e a atualização automática).
sed -i '/^GITHUB_TOKEN=/d' "$ENVF"
echo "GITHUB_TOKEN=$TOKEN" >> "$ENVF"
git -C "$REPO" config credential.helper store
umask 077
echo "https://x-access-token:${TOKEN}@github.com" > /root/.git-credentials
git -C "$REPO" fetch -q origin main && echo "✅ servidor lê o repositório privado"

# 2) Site no Caddy: realyz.com.br e www servidos daqui (o APK continua em api.realyz.com.br/baixar).
mkdir -p /opt/realys/www/site
if ! grep -q "# realyz-site" /etc/caddy/Caddyfile; then
  cat >> /etc/caddy/Caddyfile <<'CADDY'

# realyz-site: o site do Realyz (o mesmo app, no navegador), publicado por deploy/publicar-site.sh
realyz.com.br, www.realyz.com.br {
	encode gzip
	root * /opt/realys/www/site
	try_files {path} /index.html
	file_server
}
CADDY
  systemctl reload caddy && echo "✅ Caddy servindo realyz.com.br"
fi

# 3) Traz o APK e o site agora (depois, a atualização automática repete a cada 5 minutos).
bash "$REPO/server/deploy/publicar-site.sh"
ls /opt/realys/www/site/index.html >/dev/null 2>&1 && echo "✅ site no servidor" || echo "⏳ site ainda não publicado (sai no próximo envio para a main)"
ls /opt/realys/server/data/baixar/realyz.apk >/dev/null 2>&1 && echo "✅ APK no servidor" || echo "⏳ APK ainda não publicado (sai no próximo APK)"
echo
echo "Falta só o DNS: no Registro.br, troque as entradas A de realyz.com.br (185.199.x.x do GitHub)"
echo "por uma só: A  realyz.com.br  →  $(curl -fsS -4 https://ifconfig.me 2>/dev/null || echo 'IP deste servidor')"
echo "e crie: CNAME  www  →  realyz.com.br"
history -c 2>/dev/null || true
