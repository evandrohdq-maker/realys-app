#!/usr/bin/env bash
# Liga a atualização automática (rode uma vez, como root):
#   bash /opt/realys/server/deploy/instalar-auto-update.sh
set -euo pipefail
install -m 755 /opt/realys/server/deploy/auto-update.sh /usr/local/bin/realys-auto-update
cat > /etc/systemd/system/realys-auto-update.service <<'UNIT'
[Unit]
Description=Realyz: atualiza o servidor quando há versão nova aprovada nos testes
After=network-online.target

[Service]
Type=oneshot
ExecStartPre=/usr/bin/install -m 755 /opt/realys/server/deploy/auto-update.sh /usr/local/bin/realys-auto-update
ExecStart=/usr/local/bin/realys-auto-update
UNIT
cat > /etc/systemd/system/realys-auto-update.timer <<'UNIT'
[Unit]
Description=Realyz: confere versão nova a cada 5 minutos

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
RandomizedDelaySec=30

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now realys-auto-update.timer
echo "✅ Atualização automática ligada. Registro: tail /var/log/realys-auto-update.log"
