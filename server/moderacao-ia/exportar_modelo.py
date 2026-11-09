# Baixa o classificador de nudez (código aberto, já treinado) e converte para ONNX.
# Rodar UMA vez no servidor, na instalação (precisa de internet):
#   python3 -m venv /opt/realys/moderacao-venv && . /opt/realys/moderacao-venv/bin/activate
#   pip install "optimum[exporters]" onnxruntime pillow numpy
#   python3 exportar_modelo.py            # gera modelo/model.onnx e mostra as variáveis do .env
#
# Modelo padrão: Falconsai/nsfw_image_detection (ViT, licença Apache-2.0, rótulos "normal" e "nsfw").
# Antes de usar em produção: conferir a licença na página do modelo e testar com fotos de praia
# (biquíni/sunga devem ficar em "liberar" ou "revisar", nunca em "bloquear"), ajustando os limites.
import json
import os
import subprocess
import sys

MODEL_ID = os.environ.get('MODERACAO_HF_MODEL', 'Falconsai/nsfw_image_detection')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modelo')

subprocess.run([sys.executable, '-m', 'optimum.exporters.onnx', '--model', MODEL_ID, '--task', 'image-classification', OUT], check=True)

cfg = json.load(open(os.path.join(OUT, 'config.json')))
labels = [cfg['id2label'][str(i)] for i in range(len(cfg['id2label']))]
pre = {}
for name in ('preprocessor_config.json',):
    p = os.path.join(OUT, name)
    if os.path.exists(p):
        pre = json.load(open(p))
size = pre.get('size', {}).get('height', 224) if isinstance(pre.get('size'), dict) else pre.get('size', 224)
mean = pre.get('image_mean', [0.5, 0.5, 0.5])
std = pre.get('image_std', [0.5, 0.5, 0.5])
nsfw = [l for l in labels if l.lower() in ('nsfw', 'porn', 'hentai', 'sexy', 'explicit')]

print('\nColoque no moderacao-ia/.env:')
print('MODERACAO_MODEL=%s' % os.path.join(OUT, 'model.onnx'))
print('MODERACAO_SIZE=%s' % size)
print('MODERACAO_MEAN=%s' % ','.join(str(x) for x in mean))
print('MODERACAO_STD=%s' % ','.join(str(x) for x in std))
print('MODERACAO_LABELS=%s' % ','.join(labels))
print('MODERACAO_NSFW=%s' % ','.join(nsfw or labels[1:]))
