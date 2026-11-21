// Teste rápido do site gerado: abre no navegador (Chromium), guarda os erros do console e fotos da tela.
// Uso (no workflow): node tools/site/smoke.mjs dist /realys-app saida/
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const [dist, base, out] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ttf': 'font/ttf', '.wasm': 'application/wasm' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith(base)) p = p.slice(base.length);
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
const page = await browser.newPage({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 1 });
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure() && r.failure().errorText}`));
await page.goto(`http://localhost:4173${base}/`, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => logs.push('[goto] ' + e.message));
await page.waitForTimeout(6000);
await page.screenshot({ path: join(out, '1-entrada.png') });
const text = await page.evaluate(() => document.body.innerText.slice(0, 3000));
await writeFile(join(out, 'texto.txt'), text);
// Wide (computador)
await page.setViewportSize({ width: 1280, height: 800 });
await page.waitForTimeout(1500);
await page.screenshot({ path: join(out, '2-computador.png') });
await writeFile(join(out, 'console.txt'), logs.join('\n'));
console.log(logs.slice(0, 80).join('\n'));
console.log('--- texto da tela ---\n' + text.slice(0, 800));
await browser.close();
server.close();
