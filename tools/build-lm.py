# Gera src/lm/vectors.js: o modelo de linguagem da Lotus, que roda dentro do APK.
# Fonte: vetores de palavras do modelo pt_core_news_md do spaCy (licença MIT/CC BY-SA),
#   https://github.com/explosion/spacy-models/releases/download/pt_core_news_md-3.8.0/pt_core_news_md-3.8.0-py3-none-any.whl
# Uso: baixe e descompacte o .whl e rode: python3 tools/build-lm.py <pasta vocab do modelo>
# O resultado: ~190 mil palavras em português, cada uma ligada a um dos 20 mil vetores de sentido,
# reduzidos para 128 números (PCA) e guardados em 1 byte cada (int8), para o app ficar leve.
import sys, re, json, base64, numpy as np
sys.path.insert(0, 'tools')
import spacy_vectors as sv
sv.V = sys.argv[1].rstrip('/') + '/'
k2r, strings, vec = sv.load()
words = {}
for s in strings:
    if not re.fullmatch(r"[a-zà-öø-ÿç]{2,20}", s):
        continue
    h = sv.mm64a(s.encode('utf8'))
    if h in k2r:
        words[s] = k2r[h]
DIM = 128
X = vec - vec.mean(axis=0)
U, S, Vt = np.linalg.svd(X, full_matrices=False)
P = X @ Vt[:DIM].T                      # 20000 x 128
P /= np.linalg.norm(P, axis=1, keepdims=True) + 1e-9
scale = np.abs(P).max(axis=0) / 127.0
Q = np.clip(np.round(P / scale), -127, 127).astype(np.int8)
names = sorted(words)
rows = np.array([words[w] for w in names], dtype=np.uint16)
b64 = lambda a: base64.b64encode(a.tobytes()).decode()
out = (
    '// Gerado por tools/build-lm.py. Não edite à mão.\n'
    '// Modelo de linguagem da Lotus: vetores de sentido de palavras em português (spaCy pt_core_news_md, MIT).\n'
    f'export const DIM = {DIM};\n'
    f'export const ROWS = {Q.shape[0]};\n'
    f'export const SCALE = {json.dumps([round(float(x), 7) for x in scale])};\n'
    f'export const WORDS = {json.dumps(chr(10).join(names), ensure_ascii=False)};\n'
    f'export const WORD_ROWS = "{b64(rows)}";\n'
    f'export const VECTORS = "{b64(Q)}";\n'
)
open('src/lm/vectors.js', 'w', encoding='utf8').write(out)
print(len(names), 'palavras', Q.shape, f'{len(out)/1e6:.1f} MB')
