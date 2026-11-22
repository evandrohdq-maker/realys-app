// Gera server/src/data/profissoes.json a partir do conhecimento das profissões do app
// (src/professionsKnowledge.js + catálogo src/professionsData.js). Rodar depois de mudar as profissões:
//   node tools/gerar-profissoes.mjs
import { writeFileSync, readFileSync, mkdtempSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
// Os arquivos do app são ES modules sem "type": copia para .mjs para o Node ler.
const tmp = mkdtempSync(join(tmpdir(), 'prof-'));
copyFileSync(join(raiz, 'src/professionsKnowledge.js'), join(tmp, 'k.mjs'));
copyFileSync(join(raiz, 'src/professionsData.js'), join(tmp, 'd.mjs'));
const { PROF_INFO, profInfo } = await import(pathToFileURL(join(tmp, 'k.mjs')));
const { PROF_CLASSES } = await import(pathToFileURL(join(tmp, 'd.mjs')));
// Nomes das profissões que já existiam (estão em src/data.js, sem nome no catálogo).
const dataSrc = readFileSync(join(raiz, 'src/data.js'), 'utf8');
const nomeBase = {};
for (const mm of dataSrc.matchAll(/\{ key: '([a-z]+)', label: '([^']+)'/g)) nomeBase[mm[1]] = mm[2];

const out = [];
const vistos = new Set();
for (const c of PROF_CLASSES) {
  for (const [key, label, , , words] of c.subs) {
    if (vistos.has(key) || !PROF_INFO[key]) continue;
    vistos.add(key);
    const i = profInfo(key);
    out.push({ key, nome: label || nomeBase[key] || key, classe: c.label, palavras: words || [], ...i });
  }
}
writeFileSync(join(raiz, 'server/src/data/profissoes.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`${out.length} profissões gravadas em server/src/data/profissoes.json`);
