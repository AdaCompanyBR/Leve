// Service worker do Leve: o app abre e funciona sem internet.
// Ao publicar mudanças, aumente VERSION para os aparelhos buscarem os arquivos novos.
const VERSION = 'leve-app-v11';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css', './data/taco.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './src/app.js', './src/db.js', './src/store.js', './src/config.js', './src/auth.js', './src/biometric.js', './src/sync.js',
  './src/lib/adaptive.js', './src/lib/budget.js', './src/lib/calc.js', './src/lib/dates.js', './src/lib/estimate.js', './src/lib/recipes.js', './src/lib/hydration.js',
  './src/lib/parser.js', './src/lib/portions.js', './src/lib/search.js', './src/lib/routine.js', './src/lib/syncrules.js', './src/lib/swaps.js', './src/lib/trend.js',
  './src/ui/account.js', './src/ui/dom.js', './src/ui/drink.js', './src/ui/estimate.js', './src/ui/food.js', './src/ui/liquids.js', './src/ui/log.js', './src/ui/onboarding.js',
  './src/ui/progress.js', './src/ui/ring.js', './src/ui/settings.js', './src/ui/state.js', './src/ui/routine.js', './src/ui/swaps.js', './src/ui/today.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  // Só mexe nos caches do app ("leve-app-*" e os antigos "leve-vN"); outros caches do site ficam.
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && /^leve-(app-)?v\d+$/.test(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin) {
    // Biblioteca do leitor de código de barras: guarda depois do primeiro uso. Open Food Facts vai direto à rede.
    if (url.hostname === 'cdn.jsdelivr.net') {
      event.respondWith(caches.match(event.request).then(hit => hit ?? fetch(event.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(event.request, copy)); }
        return res;
      })));
    }
    return;
  }
  // Arquivos do app: responde do cache e atualiza em segundo plano.
  event.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(event.request, { ignoreSearch: true });
    const fresh = fetch(event.request).then(res => { if (res.ok) cache.put(event.request, res.clone()); return res; }).catch(() => hit);
    return hit ?? fresh;
  }));
});
