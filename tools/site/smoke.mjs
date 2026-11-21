// Teste do site gerado: abre no Chromium, guarda os erros do console e fotos das telas
// (página de abertura, entrada e as áreas do app no computador e no celular).
// Uso (no workflow): node smoke.mjs dist <base> saida/
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const [dist, base, out] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.ttf': 'font/ttf' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (base && p.startsWith(base)) p = p.slice(base.length);
  try {
    const body = await readFile(join(dist, p === '/' || !extname(p) ? 'index.html' : p));
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || (extname(p) ? 'application/octet-stream' : 'text/html') });
    res.end(body);
  } catch (e) {
    res.writeHead(404);
    res.end('404');
  }
}).listen(4173);

const logs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => m.type() !== 'log' && logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`));
const shot = (n) => page.screenshot({ path: join(out, n + '.png') }).catch((e) => logs.push('[shot] ' + e.message));
const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    logs.push(`[${name}] ${e.message.split('\n')[0]}`);
  }
};

await page.goto(`http://localhost:4173${base || ''}/`, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => logs.push('[goto] ' + e.message));
await page.waitForTimeout(3500);
await shot('01-abertura');
await step('rolar abertura', async () => {
  for (const [i, y] of [900, 1800, 2700, 3600].entries()) {
    await page.evaluate((yy) => document.querySelector('.rz') && document.querySelector('.rz').scrollTo(0, yy), y);
    await page.waitForTimeout(500);
    await shot(`0${2 + i}-abertura-${y}`);
  }
});
await step('abertura celular', async () => {
  await page.setViewportSize({ width: 412, height: 860 });
  await page.evaluate(() => document.querySelector('.rz') && document.querySelector('.rz').scrollTo(0, 0));
  await page.waitForTimeout(800);
  await shot('06-abertura-celular');
  await page.setViewportSize({ width: 1440, height: 900 });
});
await step('entrar', async () => {
  await page.getByRole('button', { name: 'Entrar' }).first().click();
  await page.waitForTimeout(1500);
  await shot('07-entrar');
  await page.getByPlaceholder('Digite seu usuário, CPF ou CNPJ').fill('visitante');
  await page.getByPlaceholder('Sua senha').fill('senha1234');
  await page.getByText('Entrar com biometria').click();
  await page.waitForTimeout(6000);
  await shot('08-depois-de-entrar');
});
let n = 9;
// Janelas no computador: abrem só na área do meio, com o menu lateral à vista (carteira, Explorar).
for (const [nome, rotulo] of [['carteira', 'Abrir a carteira'], ['explorar', 'Explorar o Realyz: todas as áreas']]) {
  try {
    await page.getByLabel(rotulo).first().click({ timeout: 5000 });
    await page.waitForTimeout(1200);
    await shot(`janela-${nome}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  } catch (e) {
    logs.push(`[janela ${nome}] ` + e.message);
  }
}
for (const aba of ['Shop', 'Food', 'Serviços', 'Negócios', 'Pedidos']) {
  await step('aba ' + aba, async () => {
    await page.getByText(aba, { exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(2500);
    await shot(`${String(n++).padStart(2, '0')}-${aba}`);
  });
}
await step('celular dentro', async () => {
  await page.setViewportSize({ width: 412, height: 860 });
  await page.waitForTimeout(1500);
  await shot(`${n++}-celular`);
});
await writeFile(join(out, 'console.txt'), logs.join('\n'));
await writeFile(join(out, 'texto.txt'), await page.evaluate(() => document.body.innerText.slice(0, 3000)).catch(() => ''));
console.log(logs.filter((l) => !/useNativeDriver|status of 401/.test(l)).slice(0, 60).join('\n'));
await browser.close();
server.close();
