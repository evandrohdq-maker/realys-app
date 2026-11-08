// Assinatura da voz do titular (a "digital da voz"), 100% dentro do celular.
// Esta parte é só matemática (sem React Native): lê o áudio WAV, tira as características do
// timbre e do tom da voz e compara com o cadastro. Dá para testar no computador.
//
// Como funciona:
//   1. O áudio é cortado em pedacinhos de 25 ms. Os pedacinhos com voz (não silêncio) viram 19
//      números que descrevem o timbre (MFCC: o "formato" da garganta e da boca de quem fala).
//   2. Também mede o tom da voz (frequência fundamental): grave, médio ou agudo.
//   3. A frase inteira vira uma assinatura: média e variação desses números + o tom.
//   4. No cadastro, as frases do titular viram o modelo da voz dele. Depois, cada "abrir Lotus"
//      é comparado com o modelo. Perto do modelo = titular; longe = outra pessoa (ou a própria Lotus).
//   5. A cada uso aceito com folga, ela aprende mais um pouco da voz do titular.
//
// Não guarda a gravação: só a assinatura (números), que não dá para transformar de volta em voz.

const NCEP = 19; // c1..c19
const NMEL = 26;

// ---------- WAV ----------
const u32 = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | ((b[o + 3] << 24) >>> 0);
const u16 = (b, o) => b[o] | (b[o + 1] << 8);

// Lê o cabeçalho (taxa de amostragem, canais, bits) e onde começa o som.
export function wavInfo(bytes) {
  if (!bytes || bytes.length < 44) return null;
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'RIFF') {
    // Sem cabeçalho: o Android grava PCM 16 bits, 16 kHz, mono.
    return { rate: 16000, channels: 1, bits: 16, dataStart: 0 };
  }
  let o = 12;
  let fmt = null;
  while (o + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
    const size = u32(bytes, o + 4);
    if (id === 'fmt ') fmt = { channels: u16(bytes, o + 10), rate: u32(bytes, o + 12), bits: u16(bytes, o + 22) };
    // O tamanho do "data" pode vir zerado enquanto a gravação está aberta: vale até o fim do arquivo.
    if (id === 'data') return { ...(fmt || { channels: 1, rate: 16000, bits: 16 }), dataStart: o + 8 };
    o += 8 + size + (size & 1);
  }
  return null;
}

// Som em números de -1 a 1 (mono). from/to em segundos (opcionais).
export function wavSamples(bytes, info, fromSec = 0, toSec = Infinity) {
  info = info || wavInfo(bytes);
  if (!info || info.bits !== 16) return null;
  const frame = 2 * Math.max(1, info.channels);
  const total = Math.floor((bytes.length - info.dataStart) / frame);
  const a = Math.max(0, Math.floor(fromSec * info.rate));
  const z = Math.min(total, Number.isFinite(toSec) ? Math.floor(toSec * info.rate) : total);
  if (z - a < info.rate * 0.3) return null; // menos de 0,3 s não dá para saber quem fala
  const out = new Float32Array(z - a);
  for (let i = a; i < z; i++) {
    const p = info.dataStart + i * frame;
    let v = bytes[p] | (bytes[p + 1] << 8);
    if (v & 0x8000) v -= 0x10000;
    out[i - a] = v / 32768;
  }
  return { rate: info.rate, samples: out };
}

// ---------- FFT ----------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

const mel = (f) => 2595 * Math.log10(1 + f / 700);
const imel = (m) => 700 * (Math.pow(10, m / 2595) - 1);

const banks = {};
function melBank(rate, nfft) {
  const key = rate + ':' + nfft;
  if (banks[key]) return banks[key];
  const lo = mel(100), hi = mel(Math.min(7600, rate / 2 - 100));
  const pts = [];
  for (let i = 0; i < NMEL + 2; i++) pts.push(Math.floor(((nfft + 1) * imel(lo + ((hi - lo) * i) / (NMEL + 1))) / rate));
  const fb = [];
  for (let m = 1; m <= NMEL; m++) {
    const w = new Float32Array(nfft / 2 + 1);
    for (let k = pts[m - 1]; k < pts[m]; k++) w[k] = (k - pts[m - 1]) / Math.max(1, pts[m] - pts[m - 1]);
    for (let k = pts[m]; k < pts[m + 1]; k++) w[k] = (pts[m + 1] - k) / Math.max(1, pts[m + 1] - pts[m]);
    fb.push(w);
  }
  return (banks[key] = fb);
}

// Tom da voz de um pedacinho (autocorrelação), em Hz. 0 = sem tom claro.
function pitchOf(x, rate) {
  const minLag = Math.floor(rate / 400), maxLag = Math.floor(rate / 70);
  let e0 = 0;
  for (let i = 0; i < x.length; i++) e0 += x[i] * x[i];
  if (e0 <= 0) return 0;
  let best = 0, bestLag = 0;
  for (let lag = minLag; lag <= maxLag && lag < x.length - 1; lag++) {
    let s = 0, e1 = 0, e2 = 0;
    for (let i = 0; i + lag < x.length; i++) {
      s += x[i] * x[i + lag];
      e1 += x[i] * x[i];
      e2 += x[i + lag] * x[i + lag];
    }
    const r = s / Math.sqrt(e1 * e2 + 1e-12);
    if (r > best) {
      best = r;
      bestLag = lag;
    }
  }
  return best > 0.45 && bestLag ? rate / bestLag : 0;
}

const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

// Corta o áudio em pedacinhos de 25 ms e calcula o timbre (MFCC) e o volume de cada um.
function analyze({ rate, samples }) {
  const win = Math.round(rate * 0.025), hop = Math.round(rate * 0.01);
  let nfft = 1;
  while (nfft < win) nfft <<= 1;
  const fb = melBank(rate, nfft);
  const ham = new Float32Array(win);
  for (let i = 0; i < win; i++) ham[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (win - 1));
  const frames = [];
  const re = new Float32Array(nfft), im = new Float32Array(nfft);
  for (let s = 0; s + win <= samples.length; s += hop) {
    let e = 0;
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < win; i++) {
      const v = (samples[s + i] - (i || s ? 0.97 * samples[s + i - 1] : 0)) * ham[i];
      re[i] = v;
      e += v * v;
    }
    fft(re, im);
    const logm = new Float32Array(NMEL);
    for (let m = 0; m < NMEL; m++) {
      let acc = 0;
      const w = fb[m];
      for (let k = 0; k <= nfft / 2; k++) if (w[k]) acc += w[k] * (re[k] * re[k] + im[k] * im[k]);
      logm[m] = Math.log(acc + 1e-10);
    }
    const c = new Float32Array(NCEP);
    for (let n = 1; n <= NCEP; n++) {
      let acc = 0;
      for (let m = 0; m < NMEL; m++) acc += logm[m] * Math.cos((Math.PI * n * (m + 0.5)) / NMEL);
      c[n - 1] = acc * Math.sqrt(2 / NMEL);
    }
    frames.push({ s, e: 10 * Math.log10(e / win + 1e-12), c });
  }
  if (frames.length < 20) return null;
  return { rate, samples, frames };
}

// Assinatura da voz de um trecho de áudio. null se não tem voz suficiente.
export function voiceVector(audio, pre) {
  const an = pre || analyze(audio);
  if (!an) return null;
  const { rate, samples, frames } = an;
  // Só os pedacinhos com voz: acima do ruído de fundo e perto do volume da fala.
  const es = frames.map((f) => f.e);
  const peak = Math.max(...es);
  const floor = [...es].sort((a, b) => a - b)[Math.floor(es.length * 0.05)];
  let gate = Math.max(floor + 6, peak - 30);
  // Fala sem pausa nenhuma (o ruído de fundo nem aparece): vale tudo que está perto do volume da fala.
  if (frames.filter((f) => f.e >= gate).length < 15) gate = peak - 25;
  const voiced = frames.filter((f) => f.e >= gate);
  if (voiced.length < 15) return null;
  an.gate = gate;
  // Timbre: média e variação de cada número, e de como ele muda (delta).
  const mean = new Array(NCEP).fill(0), sq = new Array(NCEP).fill(0), dsq = new Array(NCEP).fill(0);
  voiced.forEach((f) => f.c.forEach((v, k) => ((mean[k] += v), (sq[k] += v * v))));
  for (let k = 0; k < NCEP; k++) mean[k] /= voiced.length;
  const sd = sq.map((v, k) => Math.sqrt(Math.max(0, v / voiced.length - mean[k] * mean[k])));
  let nd = 0;
  for (let i = 2; i < frames.length - 2; i++) {
    if (frames[i].e < gate) continue;
    nd++;
    for (let k = 0; k < NCEP; k++) {
      const d = (2 * (frames[i + 2].c[k] - frames[i - 2].c[k]) + (frames[i + 1].c[k] - frames[i - 1].c[k])) / 10;
      dsq[k] += d * d;
    }
  }
  const dsd = dsq.map((v) => Math.sqrt(v / Math.max(1, nd)));
  // Tom: mediana dos pedacinhos com tom claro (até 120 pedacinhos, para ser rápido).
  const step = Math.max(1, Math.floor(voiced.length / 120));
  const f0 = [];
  const pw = Math.round(rate * 0.04);
  for (let i = 0; i < voiced.length; i += step) {
    const s = voiced[i].s;
    if (s + pw > samples.length) continue;
    const p = pitchOf(samples.subarray(s, s + pw), rate);
    if (p) f0.push(Math.log(p));
  }
  const lf0 = f0.length >= 5 ? median(f0) : 0;
  return { v: [...mean, ...sd, ...dsd].map((x) => Math.round(x * 1000) / 1000), f0: Math.round(lf0 * 1000) / 1000, n: voiced.length };
}

// ---------- Modelo da voz e comparação ----------
const DIMS = NCEP * 3;
// Limite de tom: mais que ~30% de diferença no tom médio não é a mesma pessoa (ex.: voz grave x aguda).
const F0_MAX = Math.log(1.3);

// Monta o modelo com as assinaturas do titular (cadastro + o que ela aprendeu com o uso).
export function buildModel(vectors) {
  const list = (vectors || []).filter((x) => x && x.v && x.v.length === DIMS);
  if (list.length < 3) return null;
  const mu = new Array(DIMS).fill(0);
  list.forEach((x) => x.v.forEach((v, k) => (mu[k] += v / list.length)));
  const sd = new Array(DIMS).fill(0);
  list.forEach((x) => x.v.forEach((v, k) => (sd[k] += ((v - mu[k]) ** 2) / list.length)));
  for (let k = 0; k < DIMS; k++) sd[k] = Math.sqrt(sd[k]);
  // Com poucas frases a variação medida é pequena demais: põe um piso para não rejeitar o titular à toa.
  const typical = median(sd.filter((x) => x > 0)) || 0.5;
  const scale = sd.map((x, k) => Math.max(x, 0.6 * typical, 0.25 + 0.05 * Math.abs(mu[k])));
  const f0s = list.map((x) => x.f0).filter(Boolean);
  const model = { mu, scale, f0: f0s.length ? median(f0s) : 0, count: list.length };
  // Distância das próprias frases do titular (deixando cada uma de fora): é a "folga" normal dele.
  const loo = list.map((x, i) => {
    const others = list.filter((_, j) => j !== i);
    const m = { ...model, mu: mu.map((v, k) => (v * list.length - x.v[k]) / others.length) };
    return distance(m, x);
  });
  model.limit = Math.min(3, Math.max(1.1, 1.5 * Math.max(...loo)));
  return model;
}

export function distance(model, x) {
  let acc = 0;
  for (let k = 0; k < DIMS; k++) acc += ((x.v[k] - model.mu[k]) / model.scale[k]) ** 2;
  return Math.sqrt(acc / DIMS);
}

// É o titular? { ok, d, limit, reason }
export function compare(model, x) {
  if (!model || !x) return { ok: null, reason: 'sem dados' };
  if (model.f0 && x.f0 && Math.abs(x.f0 - model.f0) > F0_MAX) return { ok: false, d: 99, limit: model.limit, reason: 'tom de voz diferente' };
  const d = distance(model, x);
  return { ok: d <= model.limit, d: Math.round(d * 100) / 100, limit: model.limit, reason: d <= model.limit ? 'voz do titular' : 'timbre diferente' };
}

// Aprende com o uso: só guarda uma frase nova se ela foi aceita com folga (bem parecida com o
// titular), para nunca "aprender" a voz de outra pessoa. Mantém as do cadastro e as 24 mais novas.
export function learnFrom(store, x, result) {
  if (!store || !x || !result || !result.ok || result.d > 0.75 * result.limit) return null;
  const learned = [...(store.learned || []), x].slice(-24);
  return { ...store, learned, updatedAt: Date.now() };
}

// ---------- "abrir Lotus" do jeito do titular (comparação da frase exata) ----------
// No cadastro o titular fala "abrir Lotus" 3 vezes. Cada vez vira uma sequência de timbres
// (um por pedacinho de 10 ms). Na hora do "abrir Lotus", o app procura dentro do que ouviu o trecho
// mais parecido com essas gravações (DTW: alinha as duas falas, mesmo que uma seja mais rápida).
// Mesma frase + mesmo jeito de falar + mesmo timbre = titular. É bem mais preciso que só o timbre.

const SEQ_DIMS = 13; // c1..c13 bastam para a frase

// Sequência do trecho com voz (do primeiro ao último pedacinho com voz).
export function phraseSeq(audio) {
  const an = analyze(audio);
  if (!an) return null;
  const vv = voiceVector(null, an);
  if (!vv) return null;
  const fr = an.frames;
  let a = fr.findIndex((f) => f.e >= an.gate);
  let z = fr.length - 1;
  while (z > a && fr[z].e < an.gate) z--;
  if (z - a < 15) return null;
  return fr.slice(a, z + 1).map((f) => Array.from(f.c.subarray(0, SEQ_DIMS), (x) => Math.round(x * 100) / 100));
}

// Todos os pedacinhos (para procurar a frase dentro de uma gravação maior).
export function allSeq(audio) {
  const an = analyze(audio);
  return an ? an.frames.map((f) => Array.from(f.c.subarray(0, SEQ_DIMS))) : null;
}

const fdist = (x, y) => {
  let acc = 0;
  for (let k = 0; k < SEQ_DIMS; k++) acc += (x[k] - y[k]) ** 2;
  return Math.sqrt(acc);
};

// Custo médio do melhor alinhamento de `tpl` dentro de `seq` (o trecho pode estar em qualquer lugar).
export function dtwFind(tpl, seq, anywhere = true) {
  const n = tpl.length, m = seq.length;
  if (!n || !m) return Infinity;
  let prevC = new Float64Array(m), prevL = new Float64Array(m);
  let curC = new Float64Array(m), curL = new Float64Array(m);
  for (let j = 0; j < m; j++) {
    const c = fdist(tpl[0], seq[j]);
    if (anywhere || j === 0) {
      prevC[j] = c;
      prevL[j] = 1;
    } else {
      prevC[j] = prevC[j - 1] + c;
      prevL[j] = prevL[j - 1] + 1;
    }
  }
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const c = fdist(tpl[i], seq[j]);
      // passos: fica no mesmo pedacinho da gravação, anda junto, ou anda só na gravação
      let bc = prevC[j], bl = prevL[j];
      if (j > 0) {
        if (prevC[j - 1] / prevL[j - 1] < bc / bl) (bc = prevC[j - 1]), (bl = prevL[j - 1]);
        if (curC[j - 1] / curL[j - 1] < bc / bl) (bc = curC[j - 1]), (bl = curL[j - 1]);
      }
      curC[j] = bc + c;
      curL[j] = bl + 1;
    }
    [prevC, curC] = [curC, prevC];
    [prevL, curL] = [curL, prevL];
  }
  let best = Infinity;
  for (let j = anywhere ? 0 : m - 1; j < m; j++) {
    // o trecho achado não pode ser muito mais curto nem muito mais longo que a frase do cadastro
    if (prevL[j] < n * 1.0 || prevL[j] > n * 2.6) continue;
    best = Math.min(best, prevC[j] / prevL[j]);
  }
  return best;
}

// Modelo do "abrir Lotus": as 3 gravações e a folga normal entre elas.
export function buildWake(seqs) {
  const list = (seqs || []).filter((x) => x && x.length >= 15);
  if (list.length < 2) return null;
  let worst = 0;
  for (let i = 0; i < list.length; i++)
    for (let j = 0; j < list.length; j++) if (i !== j) worst = Math.max(worst, dtwFind(list[i], list[j], false));
  return { tpls: list, limit: Math.max(1.3 * worst, worst + 0.8) };
}

// O "abrir Lotus" que o microfone ouviu (dentro de `seq`) é do titular?
export function compareWake(wake, seq) {
  if (!wake || !seq) return { ok: null, reason: 'sem dados' };
  const d = Math.min(...wake.tpls.map((t) => dtwFind(t, seq, true)));
  return { ok: d <= wake.limit, d: Math.round(d * 100) / 100, limit: Math.round(wake.limit * 100) / 100, reason: d <= wake.limit ? 'voz do titular' : 'jeito de falar diferente' };
}
