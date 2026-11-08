#!/usr/bin/env bash
# Instala o SERVIDOR DE VÍDEO do Realys numa VPS Ubuntu 22.04/24.04 (ex.: Hetzner CX22/CAX11, Europa,
# 20 TB de tráfego por mês incluídos). Ver LEIA-ME.md nesta pasta.
#
#   - MediaMTX: recebe a live do streamer (WebRTC/WHIP) e entrega para quem assiste (WebRTC/WHEP e HLS).
#               Antes de deixar transmitir ou assistir, pergunta ao servidor do Realys se o passe vale.
#   - coturn:   retransmissor (TURN) para as chamadas de vídeo quando a rede não deixa ligar direto.
#   - Caddy:    cadeado (HTTPS) automático no domínio do vídeo.
#
# Como usar (logado na VPS como root):
#   curl -fsSL https://raw.githubusercontent.com/evandrohdq-maker/realys-app/main/server/deploy/video/setup-video.sh -o setup-video.sh
#   bash setup-video.sh video.seudominio.com.br https://api.seudominio.com.br
#
# O domínio do vídeo precisa apontar para o IP desta VPS (registro "A" no DNS).
# Pode ser a mesma VPS do servidor do app (fase de testes) ou uma só para vídeo.
set -euo pipefail

VIDEO_DOMAIN="${1:?Informe o domínio do vídeo. Ex.: bash setup-video.sh video.realys.com.br https://api.realys.com.br}"
API_URL="${2:?Informe o endereço do servidor do app. Ex.: https://api.realys.com.br}"
API_URL="${API_URL%/}"
CONF_DIR="/etc/realys-video"
SECRETS="$CONF_DIR/segredos.env"

echo "==> Atualizando o sistema"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
apt-get install -y curl ufw coturn debian-keyring debian-archive-keyring apt-transport-https gnupg tar

PUBLIC_IP="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
echo "IP público: $PUBLIC_IP"

mkdir -p "$CONF_DIR"
if [ ! -f "$SECRETS" ]; then
  echo "VIDEO_SECRET=$(openssl rand -hex 24)" > "$SECRETS"
  echo "TURN_SECRET=$(openssl rand -hex 24)" >> "$SECRETS"
  chmod 600 "$SECRETS"
fi
# shellcheck disable=SC1090
. "$SECRETS"

echo "==> Instalando o MediaMTX (servidor de vídeo, código aberto)"
ARCH="$(dpkg --print-architecture)"   # amd64 (CX/CPX) ou arm64 (CAX)
case "$ARCH" in amd64) MTX_ARCH="linux_amd64" ;; arm64) MTX_ARCH="linux_arm64" ;; *) echo "Arquitetura $ARCH não suportada"; exit 1 ;; esac
URL="$(curl -fsS https://api.github.com/repos/bluenviron/mediamtx/releases/latest | grep -o "https://[^\"]*mediamtx_v[^\"]*_${MTX_ARCH}\.tar\.gz" | head -n1)"
[ -n "$URL" ] || { echo "Não achei o download do MediaMTX"; exit 1; }
curl -fsSL "$URL" -o /tmp/mediamtx.tar.gz
tar -xzf /tmp/mediamtx.tar.gz -C /usr/local/bin mediamtx
chmod +x /usr/local/bin/mediamtx
id mediamtx >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin mediamtx

echo "==> Configurando o MediaMTX"
sed -e "s#__API_URL__#${API_URL}#g" \
    -e "s#__VIDEO_SECRET__#${VIDEO_SECRET}#g" \
    -e "s#__PUBLIC_IP__#${PUBLIC_IP}#g" \
    "$(dirname "$0")/mediamtx.yml" > "$CONF_DIR/mediamtx.yml" 2>/dev/null || \
  curl -fsSL https://raw.githubusercontent.com/evandrohdq-maker/realys-app/main/server/deploy/video/mediamtx.yml | \
  sed -e "s#__API_URL__#${API_URL}#g" -e "s#__VIDEO_SECRET__#${VIDEO_SECRET}#g" -e "s#__PUBLIC_IP__#${PUBLIC_IP}#g" > "$CONF_DIR/mediamtx.yml"
chown -R mediamtx:mediamtx "$CONF_DIR"
chmod 640 "$CONF_DIR/mediamtx.yml"

cat > /etc/systemd/system/mediamtx.service <<EOF
[Unit]
Description=Realys - servidor de video (MediaMTX)
After=network-online.target
Wants=network-online.target

[Service]
User=mediamtx
ExecStart=/usr/local/bin/mediamtx $CONF_DIR/mediamtx.yml
Restart=always
RestartSec=3
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

echo "==> Configurando o coturn (TURN das chamadas)"
cat > /etc/turnserver.conf <<EOF
listening-port=3478
fingerprint
use-auth-secret
static-auth-secret=${TURN_SECRET}
realm=${VIDEO_DOMAIN}
external-ip=${PUBLIC_IP}
min-port=49160
max-port=49200
total-quota=300
no-cli
no-multicast-peers
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
EOF
sed -i 's/^#\?TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn 2>/dev/null || true

echo "==> Instalando o Caddy (cadeado HTTPS)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
# Acrescenta o site do vídeo sem apagar o do app (pode ser a mesma VPS).
if ! grep -q "^${VIDEO_DOMAIN} {" /etc/caddy/Caddyfile 2>/dev/null; then
  cat >> /etc/caddy/Caddyfile <<EOF

# Vídeo do Realys (MediaMTX): /hls/... para HLS; o resto é WebRTC (WHIP para transmitir, WHEP para assistir).
${VIDEO_DOMAIN} {
	handle_path /hls/* {
		reverse_proxy 127.0.0.1:8888
	}
	handle {
		reverse_proxy 127.0.0.1:8889
	}
}
EOF
fi

echo "==> Liberando as portas"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8189/udp      # vídeo WebRTC
ufw allow 8189/tcp
ufw allow 3478/udp      # TURN
ufw allow 3478/tcp
ufw allow 49160:49200/udp
ufw --force enable

systemctl daemon-reload
systemctl enable --now mediamtx
systemctl enable --now coturn
systemctl restart coturn
systemctl reload caddy || systemctl restart caddy

cat <<EOF

=====================================================================
 Servidor de vídeo do Realys instalado.

 Agora, no SERVIDOR DO APP, abra /opt/realys/server/.env e cole:

   VIDEO_URL=https://${VIDEO_DOMAIN}
   VIDEO_SECRET=${VIDEO_SECRET}
   VIDEO_QUALITY=720p
   TURN_URL=turn:${VIDEO_DOMAIN}:3478?transport=udp,turn:${VIDEO_DOMAIN}:3478?transport=tcp
   TURN_SECRET=${TURN_SECRET}

 Depois reinicie o app:  systemctl restart realys
 (Os segredos ficam guardados em ${SECRETS}.)
=====================================================================
EOF
