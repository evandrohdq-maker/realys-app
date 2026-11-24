// Realyz no navegador (computador): guarda o próprio app no disco do computador.
// - Arquivos do app com nome de versão (/_expo/static/..., /assets/..., fontes): baixa uma vez e
//   depois abre direto do computador, sem pedir de novo ao servidor.
// - A página inicial (index.html) sempre busca a mais nova primeiro (assim a atualização chega);
//   sem internet, abre a última guardada.
// - Pedidos ao servidor do Realyz (api.realyz.com.br) não passam por aqui.
const CACHE = 'realyz-app-v1';
const FIXO = /^\/(_expo\/static|assets)\/|\.(woff2?|ttf|otf)$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (FIXO.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then(
          (achou) =>
            achou ||
            fetch(req).then((res) => {
              if (res.ok) c.put(req, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put('/', copia));
          }
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error()))
    );
  }
});
