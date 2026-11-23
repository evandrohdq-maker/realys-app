#!/usr/bin/env bash
# Recomeçar do zero: apaga todas as contas menos admin, analista e contas de teste.
# Rodar como root:  bash /opt/realys/server/deploy/limpar-contas.sh
# Faz backup antes (dá para voltar) e só apaga depois de você digitar APAGAR.
set -euo pipefail
cd /opt/realys/server
echo "==> Contas no servidor agora:"
sudo -u realys node --disable-warning=ExperimentalWarning deploy/limpar-contas.mjs data/realys.db
echo
read -r -p "Para apagar as contas da lista \"Saem\", digite APAGAR e aperte Enter: " OK
[ "$OK" = "APAGAR" ] || { echo "Nada foi apagado."; exit 0; }
/usr/local/bin/realys-backup && echo "✅ backup feito antes de apagar"
systemctl stop realys
sudo -u realys node --disable-warning=ExperimentalWarning deploy/limpar-contas.mjs data/realys.db --apagar
systemctl start realys
sleep 2
curl -fsS http://127.0.0.1:8080/health && echo " ✅ servidor de volta"
