// 離線快取：有訊號時先抓網路最新版（3 秒內沒回應就用快取），沒訊號時用快取
const CACHE = 'nenggao-timer-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const cached = c.match(e.request, { ignoreSearch: true });
    // 只有 2xx 才算拿到新版；寫入快取放進 waitUntil，避免 SW 被中止時漏寫
    const net = fetch(e.request, { cache: 'no-store' })
      .then(r => { if (r && r.ok) { e.waitUntil(c.put(e.request, r.clone())); return r; } return null; })
      .catch(() => null);
    const timeout = new Promise(res => setTimeout(() => res(null), 3000));
    const fresh = await Promise.race([net, timeout]);
    return fresh || (await cached) || (await net) || Response.error();
  }));
});
