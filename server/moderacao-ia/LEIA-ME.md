# Moderação de imagens (nudez) — instalação no servidor

Roda na mesma VPS do app. Nenhuma foto sai do servidor. CPU basta (cerca de 0,1 a 0,3 s por foto).

```bash
# 1. Ambiente Python e o modelo (uma vez; precisa de internet)
sudo apt-get install -y python3-venv ffmpeg
python3 -m venv /opt/realys/moderacao-venv
/opt/realys/moderacao-venv/bin/pip install "optimum[exporters]" onnxruntime pillow numpy
cd /opt/realys/server/moderacao-ia
/opt/realys/moderacao-venv/bin/python3 exportar_modelo.py   # mostra as linhas para o .env

# 2. Configuração: cole as linhas mostradas em /opt/realys/server/moderacao-ia/.env

# 3. Serviço
sudo cp realys-moderacao.service /etc/systemd/system/
sudo systemctl enable --now realys-moderacao
curl -s http://127.0.0.1:8092/health

# 4. No .env do servidor do app
MODERACAO_URL=http://127.0.0.1:8092
sudo systemctl restart realys
```

## Antes de abrir para o público

1. Testar com umas 20 fotos de praia, academia e roupas justas: devem dar "liberar" ou "revisar".
2. Ajustar `MODERACAO_REVISAR` (padrão 0,5) e `MODERACAO_BLOQUEAR` (padrão 0,85) se precisar.
3. Conferir a licença do modelo na página dele (padrão: Falconsai/nsfw_image_detection, Apache-2.0).

## Como funciona

| Onde | O que acontece |
| --- | --- |
| Foto ou vídeo público (post, story, perfil, Date, loja) | bloquear: recusada na hora · revisar: escondida até a equipe liberar · liberar: publicada |
| Live no ar | 2 quadros a cada 20 s; nudez com certeza = live encerrada e criador avisado |
| Conversa privada (`?uso=privado`) | não passa pela regra: fica só entre as duas pessoas |
| Falha do serviço | foto pública vai para revisão humana, nunca é liberada sozinha |

Fila de revisão do administrador: `GET /admin/moderacao`, liberar ou remover em `POST /admin/moderacao/:id/liberar|remover`.
