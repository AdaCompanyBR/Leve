// Service worker do Leve: o app abre e funciona sem internet.
// Ao publicar mudanças, aumente VERSION: é o que renova o que fica guardado para usar sem internet.
const VERSION = 'leve-app-v15';
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
  // cache: 'reload' busca do servidor, sem reaproveitar a memória do navegador (que pode ter a versão antiga).
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
  // Arquivos do app: com internet, sempre a versão mais nova (e ela fica guardada);
  // sem internet, ou se a rede demorar mais de 4 segundos, a versão guardada.
  event.respondWith(caches.open(VERSION).then(async cache => {
    const hit = () => cache.match(event.request, { ignoreSearch: true });
    const net = fetch(event.request, { cache: 'no-cache' }).then(res => { if (res.ok) cache.put(event.request, res.clone()); return res; });
    net.catch(() => {}); // a falha é tratada abaixo
    const slow = new Promise(resolve => setTimeout(resolve, 4000)).then(hit);
    try {
      const first = await Promise.race([net, slow]);
      return first ?? await net;
    } catch {
      return (await hit()) ?? Response.error();
    }
  }));
});
