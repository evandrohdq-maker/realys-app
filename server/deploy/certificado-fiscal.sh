#!/usr/bin/env bash
# Converte o certificado digital A1 (.pfx ou .p12) da empresa para os arquivos PEM que o Realys usa
# para assinar e enviar as notas fiscais.
#   uso:  bash deploy/certificado-fiscal.sh /caminho/certificado.pfx
# Pede a senha do certificado. Os arquivos ficam em data/fiscal/, só o usuário do Realys consegue ler.
set -euo pipefail
PFX="${1:?Informe o arquivo do certificado: bash deploy/certificado-fiscal.sh certificado.pfx}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/data/fiscal"
mkdir -p "$DEST"
chmod 700 "$DEST"
read -rsp "Senha do certificado: " SENHA
echo
openssl pkcs12 -in "$PFX" -clcerts -nokeys -passin "pass:$SENHA" -legacy -out "$DEST/certificado.pem" 2>/dev/null \
  || openssl pkcs12 -in "$PFX" -clcerts -nokeys -passin "pass:$SENHA" -out "$DEST/certificado.pem"
openssl pkcs12 -in "$PFX" -nocerts -nodes -passin "pass:$SENHA" -legacy -out "$DEST/chave.pem" 2>/dev/null \
  || openssl pkcs12 -in "$PFX" -nocerts -nodes -passin "pass:$SENHA" -out "$DEST/chave.pem"
chmod 600 "$DEST/certificado.pem" "$DEST/chave.pem"
echo "Pronto. Certificado válido até:"
openssl x509 -in "$DEST/certificado.pem" -noout -enddate
echo "Confira no .env: FISCAL_CERT_PEM=data/fiscal/certificado.pem e FISCAL_KEY_PEM=data/fiscal/chave.pem"
