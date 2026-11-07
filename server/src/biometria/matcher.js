// Ligação com o serviço de reconhecimento facial (um processo Python separado, na GPU ou na CPU).
// O servidor Node não carrega modelo nenhum: só pergunta ao serviço e guarda o resultado.
// Sem BIOMETRIA_SERVICE_URL, o matcher fica "desligado" e todo cadastro vai para revisão humana.
//
// Contrato do serviço (JSON):
//   POST /embed     { image: base64 }                  -> { embedding: number[512] | null, faces: n }
//   POST /liveness  { image: base64 }                  -> { live: boolean, score: number }
//   GET  /health                                       -> { ok: true, model: "...", device: "cuda|cpu" }

export function makeMatcher(cfg) {
  const url = (cfg.biometricServiceUrl || '').replace(/\/$/, '');
  const timeoutMs = cfg.biometricTimeoutMs || 15000;

  async function call(path, body) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url + path, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`serviço biométrico respondeu ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  return {
    ready: !!url,
    async embed(buf) {
      const r = await call('/embed', { image: buf.toString('base64') });
      return r.embedding ? Float32Array.from(r.embedding) : null;
    },
    async liveness(buf) {
      return call('/liveness', { image: buf.toString('base64') });
    },
    async health() {
      return url ? call('/health') : { ok: false, reason: 'não configurado' };
    },
  };
}

// Semelhança entre dois rostos (cosseno). 1 = mesma pessoa; perto de 0 = pessoas diferentes.
export function similarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
