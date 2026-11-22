// Profissões do Realyz (conhecimento interno): como cada uma trabalha, o que faz, como cobra, onde
// atende, o que a lei exige e a ocupação no MEI. O cliente não escolhe de uma lista: ele digita o que
// faz e o app/servidor entendem por aqui. A Lotus e o site também consultam.
// Os dados vêm de server/src/data/profissoes.json (gerado por tools/gerar-profissoes.mjs) e ficam
// gravados na tabela profissoes a cada vez que o servidor sobe.
import { readFileSync } from 'node:fs';
import { fail, now } from '../http.js';

const DADOS = JSON.parse(readFileSync(new URL('../data/profissoes.json', import.meta.url), 'utf8'));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export default function profissoesRoutes(r, { db }) {
  // Grava (ou atualiza) todas no banco.
  const up = db.prepare(
    `INSERT INTO profissoes (key, nome, classe, como, funcoes, cobra, atende, exige, mei_cnae, mei_ocupacao, pode_mei, palavras, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET nome=excluded.nome, classe=excluded.classe, como=excluded.como, funcoes=excluded.funcoes, cobra=excluded.cobra,
       atende=excluded.atende, exige=excluded.exige, mei_cnae=excluded.mei_cnae, mei_ocupacao=excluded.mei_ocupacao, pode_mei=excluded.pode_mei,
       palavras=excluded.palavras, updated_at=excluded.updated_at`
  );
  const t = now();
  db.exec('BEGIN');
  try {
    for (const p of DADOS) {
      const pode = p.mei === false ? 0 : p.mei ? 1 : null;
      up.run(p.key, p.nome, p.classe, p.como, JSON.stringify(p.funcoes), JSON.stringify(p.cobra), p.atende, p.exige, p.mei ? p.mei.cnae : null, p.mei ? p.mei.ocupacao : null, pode, JSON.stringify(p.palavras || []), t);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const view = (x) => ({
    key: x.key, nome: x.nome, classe: x.classe, como: x.como, funcoes: JSON.parse(x.funcoes), cobra: JSON.parse(x.cobra), atende: x.atende, exige: x.exige,
    mei: x.pode_mei === 0 ? false : x.mei_cnae ? { cnae: x.mei_cnae, ocupacao: x.mei_ocupacao } : null,
  });

  // Busca pelo que a pessoa digitou (até 4): nome, palavras e o que faz.
  r.get('/profissoes', ({ query }) => {
    const q = norm(query.q);
    const all = db.prepare('SELECT * FROM profissoes ORDER BY nome').all();
    if (!q) return all.map(view);
    const pont = (x) => {
      const nome = norm(x.nome);
      if (nome === q) return 100;
      if (nome.startsWith(q)) return 80;
      if (nome.split(/\s+/).some((w) => w.startsWith(q))) return 65;
      if (JSON.parse(x.palavras).some((w) => norm(w).startsWith(q))) return 45;
      if (JSON.parse(x.funcoes).some((w) => norm(w).includes(q))) return 30;
      return 0;
    };
    return all.map((x) => [pont(x), x]).filter(([n]) => n).sort((a, b) => b[0] - a[0]).slice(0, Math.min(Number(query.n) || 4, 20)).map(([, x]) => view(x));
  }, { auth: false });
  r.get('/profissoes/:key', ({ params }) => {
    const x = db.prepare('SELECT * FROM profissoes WHERE key = ?').get(String(params.key));
    if (!x) fail(404, 'Profissão não encontrada.');
    return view(x);
  }, { auth: false });
}
