// Gerador de QR Code (padrão ISO/IEC 18004, modo byte, correção de erro M), sem biblioteca.
// qrMatriz(texto) devolve uma matriz de true/false (true = quadradinho preto), sem a borda branca.
// Usado no link do titular (biometria pelo celular) e onde mais precisar de um QR de verdade.
// Baseado no algoritmo público do "QR Code generator library" de Project Nayuki (licença MIT).

const ECC_POR_BLOCO = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const BLOCOS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
const ECL_BITS = 0; // M

const bit = (x, i) => ((x >>> i) & 1) !== 0;

function modulosDeDados(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}
const codewordsDeDados = (ver) => Math.floor(modulosDeDados(ver) / 8) - ECC_POR_BLOCO[ver] * BLOCOS[ver];

// Reed-Solomon em GF(256), polinômio 0x11D.
function mult(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}
function divisor(grau) {
  const r = new Array(grau).fill(0);
  r[grau - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grau; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = mult(r[j], raiz);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    raiz = mult(raiz, 0x02);
  }
  return r;
}
function resto(dados, div) {
  const r = div.map(() => 0);
  for (const b of dados) {
    const f = b ^ r.shift();
    r.push(0);
    div.forEach((c, i) => (r[i] ^= mult(c, f)));
  }
  return r;
}

function utf8(s) {
  const out = [];
  const e = unescape(encodeURIComponent(s));
  for (let i = 0; i < e.length; i++) out.push(e.charCodeAt(i));
  return out;
}

export function qrMatriz(texto) {
  const bytes = utf8(String(texto));
  // Menor versão em que cabe.
  let ver = 1;
  for (; ver <= 40; ver++) {
    const bitsCont = ver <= 9 ? 8 : 16;
    if (4 + bitsCont + bytes.length * 8 <= codewordsDeDados(ver) * 8) break;
  }
  if (ver > 40) throw new Error('Texto grande demais para um QR Code.');
  const bitsCont = ver <= 9 ? 8 : 16;
  const bits = [];
  const add = (v, n) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  add(0b0100, 4);
  add(bytes.length, bitsCont);
  bytes.forEach((b) => add(b, 8));
  const cap = codewordsDeDados(ver) * 8;
  add(0, Math.min(4, cap - bits.length));
  add(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) add(pad, 8);
  const dados = [];
  for (let i = 0; i < bits.length; i += 8) dados.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // Blocos com correção de erro, intercalados.
  const nb = BLOCOS[ver], ecc = ECC_POR_BLOCO[ver];
  const brutos = Math.floor(modulosDeDados(ver) / 8);
  const curtos = nb - (brutos % nb);
  const tamCurto = Math.floor(brutos / nb);
  const div = divisor(ecc);
  const blocos = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const d = dados.slice(k, k + tamCurto - ecc + (i < curtos ? 0 : 1));
    k += d.length;
    const e = resto(d, div);
    if (i < curtos) d.push(0);
    blocos.push(d.concat(e));
  }
  const final = [];
  for (let i = 0; i < blocos[0].length; i++) blocos.forEach((b, j) => {
    if (i !== tamCurto - ecc || j >= curtos) final.push(b[i]);
  });

  // Desenho.
  const size = ver * 4 + 17;
  const m = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, v) => {
    m[y][x] = v;
    fn[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    const passo = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    const pos = [6];
    for (let p = size - 7; pos.length < n; p -= passo) pos.splice(1, 0, p);
    pos.forEach((y, i) => pos.forEach((x, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
  }
  const formato = (mask) => {
    const d = (ECL_BITS << 3) | mask;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(b, i));
    set(8, 7, bit(b, 6));
    set(8, 8, bit(b, 7));
    set(7, 8, bit(b, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(b, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(b, i));
    set(8, size - 8, true);
  };
  formato(0);
  if (ver >= 7) {
    let r = ver;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (ver << 12) | r;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3), c = Math.floor(i / 3);
      set(a, c, bit(b, i));
      set(c, a, bit(b, i));
    }
  }
  // Dados em zigue-zague.
  let i = 0;
  for (let dir = size - 1; dir >= 1; dir -= 2) {
    if (dir === 6) dir = 5;
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const x = dir - j;
      const sobe = ((dir + 1) & 2) === 0;
      const y = sobe ? size - 1 - v : v;
      if (!fn[y][x] && i < final.length * 8) {
        m[y][x] = bit(final[i >>> 3], 7 - (i & 7));
        i++;
      }
    }
  }
  // Máscara: escolhe a de menor penalidade (regras principais do padrão).
  const MASK = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const aplicar = (k) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASK[k](x, y)) m[y][x] = !m[y][x];
  };
  const penalidade = () => {
    let p = 0, pretos = 0;
    for (let y = 0; y < size; y++) {
      for (const linha of [true, false]) {
        let run = 1;
        for (let x = 1; x <= size; x++) {
          const a = linha ? m[y][x] : m[x] && m[x][y];
          const b = linha ? m[y][x - 1] : m[x - 1][y];
          if (x < size && a === b) run++;
          else {
            if (run >= 5) p += run - 2;
            run = 1;
          }
        }
      }
      for (let x = 0; x < size; x++) {
        if (m[y][x]) pretos++;
        if (y + 1 < size && x + 1 < size && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
      }
    }
    return p + Math.floor(Math.abs(pretos * 20 - size * size * 10) / (size * size)) * 10;
  };
  let melhor = 0, menor = Infinity;
  for (let k = 0; k < 8; k++) {
    aplicar(k);
    formato(k);
    const p = penalidade();
    if (p < menor) (menor = p), (melhor = k);
    aplicar(k);
  }
  aplicar(melhor);
  formato(melhor);
  return m;
}
