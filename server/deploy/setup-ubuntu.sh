#!/usr/bin/env bash
# Instala o servidor do Realys numa VPS Ubuntu 22.04 ou 24.04 (ex.: Hostinger KVM 2), do zero.
#
# Como usar (logado na VPS como root):
#   curl -fsSL https://raw.githubusercontent.com/evandrohdq-maker/realys-app/main/server/deploy/setup-ubuntu.sh -o setup.sh
#   bash setup.sh api.seudominio.com.br
#
# O domínio (ex.: api.realys.com.br) precisa apontar para o IP da VPS (registro "A" no DNS).
# Sem domínio, rode só "bash setup.sh" e o servidor fica em http://IP-DA-VPS (sem cadeado; só para teste).
set -euo pipefail

DOMAIN="${1:-}"
REPO="https://github.com/evandrohdq-maker/realys-app.git"
APP_DIR="/opt/realys"

echo "==> Atualizando o sistema"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
apt-get install -y curl git ufw sqlite3 debian-keyring debian-archive-keyring apt-transport-https gnupg

echo "==> Instalando o Node.js 22"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> Instalando o Caddy (HTTPS automático, com cadeado)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> Baixando o Realys"
id realys >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/realys --shell /usr/sbin/nologin realys
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO" "$APP_DIR"
fi

cd "$APP_DIR/server"
if [ ! -f .env ]; then
  echo "==> Criando a configuração (.env)"
  ADMIN_PASS="$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 14)1a"
  sed -e "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" \
      -e "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${ADMIN_PASS}/" .env.example > .env
  chmod 600 .env
  echo "$ADMIN_PASS" > /root/realys-admin-senha.txt
  chmod 600 /root/realys-admin-senha.txt
fi
mkdir -p data
chown -R realys:realys "$APP_DIR/server"

echo "==> Ligando o serviço (liga sozinho quando a VPS reinicia)"
cp deploy/realys.service /etc/systemd/system/realys.service
systemctl daemon-reload
systemctl enable --now realys
systemctl restart realys

echo "==> Configurando o endereço"
if [ -n "$DOMAIN" ]; then
  sed "s/SEU_DOMINIO/${DOMAIN}/" deploy/Caddyfile > /etc/caddy/Caddyfile
else
  sed "s/SEU_DOMINIO/:80/" deploy/Caddyfile > /etc/caddy/Caddyfile
fi
systemctl reload caddy || systemctl restart caddy

echo "==> Firewall: só SSH, HTTP e HTTPS abertos"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Backup diário do banco (03:30, guarda 14 dias)"
cp deploy/backup.sh /usr/local/bin/realys-backup
chmod +x /usr/local/bin/realys-backup
echo "30 3 * * * root /usr/local/bin/realys-backup" > /etc/cron.d/realys-backup

sleep 2
if curl -fsS http://127.0.0.1:8080/health >/dev/null; then
  echo ""
  echo "✅ Realys no ar!"
  [ -n "$DOMAIN" ] && echo "   Endereço do servidor: https://${DOMAIN}" || echo "   Endereço do servidor: http://$(curl -fsS https://api.ipify.org 2>/dev/null || echo IP-DA-VPS)"
  echo "   Usuário administrador: admin"
  echo "   Senha do administrador: $(cat /root/realys-admin-senha.txt)  (guardada em /root/realys-admin-senha.txt)"
  echo "   Ver o que está acontecendo:  journalctl -u realys -f"
else
  echo "⚠️  O serviço não respondeu. Veja o erro com:  journalctl -u realys -n 50"
fi
