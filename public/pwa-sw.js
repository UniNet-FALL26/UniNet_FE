/* Cache only a public offline page. API responses, documents and user data stay on the network. */
const CACHE_PREFIX = 'uninet-pwa-offline-';
const CACHE_NAME = CACHE_PREFIX + 'v1';
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([OFFLINE_PAGE])));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin
    || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(request).catch(async () =>
    await caches.match(OFFLINE_PAGE) || new Response('UniNet hiện không có kết nối mạng.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
});
