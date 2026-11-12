// Até novembro de 2026 o app ficava neste endereço (/Leve/) e tinha um service worker aqui.
// Agora o app está em /Leve/app/ e esta é a landing. Este arquivo substitui o service worker antigo:
// apaga o cache dele, se desliga e recarrega as abas, que passam a ver a landing.
// Os dados do app (IndexedDB) não são tocados: eles pertencem ao site inteiro e o app em /app/ os encontra.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => /^leve-v\d+$/.test(k)).map(k => caches.delete(k)));
    await self.registration.unregister();
    const tabs = await self.clients.matchAll({ type: 'window' });
    tabs.forEach(t => t.navigate(t.url).catch(() => {}));
  })());
});
