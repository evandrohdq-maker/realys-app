#!/usr/bin/env bash
# Traz do GitHub para o servidor o APK mais novo e o site (roda sozinho junto com a atualização
# automática, a cada 5 minutos, e pode rodar na mão:  bash /opt/realys/server/deploy/publicar-site.sh).
#
#  - APK: release mais nova (demo-N) → /opt/realys/server/data/baixar/realyz.apk + versao.json
#    (o app busca em https://api.realyz.com.br/app/versao e baixa em /baixar/realyz.apk)
#  - Site: release "site" (realyz-site.tar.gz) → /opt/realys/www/site (o Caddy serve realyz.com.br)
#
# Repositório privado: precisa de GITHUB_TOKEN no .env (token só de leitura, ver ligar-github-privado.sh).
# Repositório público: funciona sem token.
set -uo pipefail
REPO_GH="evandrohdq-maker/realys-app"
ENVF=/opt/realys/server/.env
BAIXAR=/opt/realys/server/data/baixar
WWW=/opt/realys/www
LOG=/var/log/realys-publicar.log
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

TOKEN=$(grep -E '^GITHUB_TOKEN=' "$ENVF" 2>/dev/null | tail -1 | cut -d= -f2-)
AUTH=()
[ -n "$TOKEN" ] && AUTH=(-H "Authorization: Bearer $TOKEN")
api() { curl -fsS "${AUTH[@]}" -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$REPO_GH$1"; }
baixa() { curl -fsSL "${AUTH[@]}" -H 'Accept: application/octet-stream' -o "$2" "https://api.github.com/repos/$REPO_GH/releases/assets/$1"; }
# Lê um campo de um JSON (node já está no servidor; sem instalar nada).
campo() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const r=($1)(j);process.stdout.write(r==null?'':String(r))}catch(e){}})"; }

mkdir -p "$BAIXAR" "$WWW"

# ── APK ──
REL=$(api /releases/latest) || { log "sem acesso às releases (token?)"; REL=''; }
if [ -n "$REL" ]; then
  TAG=$(echo "$REL" | campo 'j=>j.tag_name')
  BUILD=$(echo "$TAG" | grep -oE '[0-9]+$' || true)
  ASSET=$(echo "$REL" | campo "j=>(j.assets||[]).find(a=>/\\.apk\$/i.test(a.name))?.id")
  ATUAL=$(cat "$BAIXAR/.asset" 2>/dev/null || true)
  if [ -n "$ASSET" ] && [ "$ASSET" != "$ATUAL" ]; then
    if baixa "$ASSET" "$BAIXAR/realyz.apk.novo"; then
      mv -f "$BAIXAR/realyz.apk.novo" "$BAIXAR/realyz.apk"
      NOTAS=$(echo "$REL" | campo 'j=>(j.body||"").slice(0,500)')
      node -e "require('fs').writeFileSync('$BAIXAR/versao.json', JSON.stringify({build:Number(process.argv[1])||0,name:process.argv[2],notes:process.argv[3]}))" "$BUILD" "$TAG" "$NOTAS"
      echo "$ASSET" > "$BAIXAR/.asset"
      chown -R realys:realys "$BAIXAR" 2>/dev/null || true
      log "APK $TAG publicado no servidor"
    else
      rm -f "$BAIXAR/realyz.apk.novo"; log "falha ao baixar o APK $TAG"
    fi
  fi
fi

# ── Site ──
SITE=$(api /releases/tags/site 2>/dev/null) || SITE=''
if [ -n "$SITE" ]; then
  ASSET=$(echo "$SITE" | campo "j=>(j.assets||[]).find(a=>a.name==='realyz-site.tar.gz')?.id")
  UPD=$(echo "$SITE" | campo "j=>(j.assets||[]).find(a=>a.name==='realyz-site.tar.gz')?.updated_at")
  ATUAL=$(cat "$WWW/.site" 2>/dev/null || true)
  if [ -n "$ASSET" ] && [ "$ASSET:$UPD" != "$ATUAL" ]; then
    TMP=$(mktemp -d /tmp/realyz-site-XXXX)
    if baixa "$ASSET" "$TMP/site.tar.gz" && mkdir -p "$TMP/site" && tar -xzf "$TMP/site.tar.gz" -C "$TMP/site"; then
      rm -rf "$WWW/site.velho"; [ -d "$WWW/site" ] && mv "$WWW/site" "$WWW/site.velho"
      mv "$TMP/site" "$WWW/site" && echo "$ASSET:$UPD" > "$WWW/.site" && log "site novo publicado"
      chmod -R a+rX "$WWW"
    else
      log "falha ao baixar o site"
    fi
    rm -rf "$TMP"
  fi
fi
exit 0
