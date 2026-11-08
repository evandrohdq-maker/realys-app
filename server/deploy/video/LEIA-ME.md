# Servidor de vídeo do Realys (lives e chamadas)

## O que é

| Parte | Para quê | Custo |
|---|---|---|
| **MediaMTX** (código aberto) | O streamer manda **um** vídeo; o servidor entrega para quem assiste. Só usuário Realys logado assiste (passe assinado pelo servidor do app). | Grátis |
| **coturn** (código aberto) | Chamadas de vídeo 1 para 1 vão **direto entre os celulares**; o coturn só entra quando a rede não deixa ligar direto. | Grátis |
| **VPS Hetzner (Europa)** | Onde os dois rodam. **20 TB de tráfego por mês incluídos**; passou disso, € 1 por TB. | ~€ 4 a € 10 por mês |

Em qualidade padrão, 1 pessoa assistindo 1 hora gasta ~0,45 GB: os 20 TB dão para ~44 mil horas assistidas
por mês. Cada VPS pequena aguenta algumas centenas de pessoas assistindo ao mesmo tempo; com mais gente,
coloca-se outra VPS ou uma rede de entrega (CDN) na frente do HLS.

## Como contratar e instalar (passo a passo)

1. **Contratar a VPS**: em hetzner.com/cloud, crie um servidor **CX22** (ou CAX11, ARM) com **Ubuntu 24.04**,
   localização **Alemanha ou Finlândia** (os 20 TB incluídos valem na Europa; nos EUA é só 1 TB).
2. **Domínio**: crie o registro "A" `video.seudominio.com.br` apontando para o IP da VPS.
3. **Instalar** (como root, na VPS):
   ```bash
   curl -fsSL https://raw.githubusercontent.com/evandrohdq-maker/realys-app/main/server/deploy/video/setup-video.sh -o setup-video.sh
   bash setup-video.sh video.seudominio.com.br https://api.seudominio.com.br
   ```
4. **Ligar no servidor do app**: o instalador mostra 5 linhas (`VIDEO_URL`, `VIDEO_SECRET`, `VIDEO_QUALITY`,
   `TURN_URL`, `TURN_SECRET`). Cole no `/opt/realys/server/.env` do servidor do app e rode
   `systemctl restart realys`.
5. Pronto: o app passa a transmitir e assistir lives de verdade e a fazer chamadas de vídeo. Enquanto isso
   não for feito, as lives continuam no modo demonstração.

> Fase de testes: dá para instalar o vídeo **na mesma VPS do app** (os dois sites convivem no Caddy).

## Para economizar

- Lives em **720p ou 480p** (`VIDEO_QUALITY`), sem conversão de vídeo: quase não usa processador.
- Lives **não são gravadas** (não ocupam espaço). Reprise, quando existir, terá prazo para sumir.
- Quando a live ficar grande: rede de entrega (CDN) com ponto em São Paulo na frente do `/hls/`.
