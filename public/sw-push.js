// Notificações do Realyz no site (Web Push). O servidor manda a mensagem criptografada; o navegador
// entrega aqui mesmo com a aba fechada. Se o Realyz estiver aberto e na frente, não mostra de novo.
self.addEventListener('push', (event) => {
  let m = {};
  try {
    m = event.data ? event.data.json() : {};
  } catch (e) {
    m = { title: 'Realyz', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.some((c) => c.focused && c.visibilityState === 'visible')) return undefined;
      return self.registration.showNotification(m.title || 'Realyz', {
        body: m.body || '',
        tag: m.tag || undefined,
        renotify: !!m.tag,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { type: m.type || '', id: (m.data && m.data.id) || '' },
        requireInteraction: m.type === 'call',
      });
    })
  );
});

// Tocar na notificação: abre (ou traz para frente) o Realyz e diz ao app o que abrir.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const c = list.find((x) => 'focus' in x);
      if (c) {
        c.postMessage({ rzPush: data });
        return c.focus();
      }
      return self.clients.openWindow('/?push=' + encodeURIComponent(data.type || ''));
    })
  );
});
