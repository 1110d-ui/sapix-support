const VERSION = '20260429-002';
const CACHE = 'sapix-' + VERSION;
const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Serif+JP:wght@700&display=swap',
  '/'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // CDNファイルをキャッシュ（失敗しても続行）
      return Promise.allSettled(CDN_URLS.map(url => 
        fetch(url).then(r => r.ok ? cache.put(url, r) : null).catch(() => null)
      ));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Supabase APIはキャッシュしない
  if (url.includes('supabase.co')) return;
  if (!url.startsWith('http')) return;
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      // キャッシュがあればまずそれを返す（オフライン対応）
      const networkFetch = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached); // ネットワークエラー時はキャッシュにフォールバック
      
      return cached || networkFetch;
    })
  );
});
