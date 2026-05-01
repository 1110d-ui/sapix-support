// SAPIX PWA Service Worker
// 起動時にサーバーの最新版を確認し、更新があれば即時適用

const CACHE_NAME = 'sapix-cdn-v1'; // CDN用キャッシュ（バージョン固定）
const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js',
];

// インストール時：CDNライブラリをキャッシュ（オフライン対応）
self.addEventListener('install', e => {
  self.skipWaiting(); // 即座にアクティブ化
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(CDN_URLS.map(url =>
        fetch(url).then(r => r.ok ? cache.put(url, r) : null).catch(() => null)
      ))
    )
  );
});

// アクティブ化時：全クライアントを即座に制御
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// フェッチ処理
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Supabase APIはキャッシュしない（常にネットワーク）
  if (url.includes('supabase.co')) return;

  // CDNライブラリ：キャッシュ優先（オフライン対応）
  if (url.includes('cdnjs.cloudflare.com') || url.includes('fonts.googleapis.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // index.html（アプリ本体）：常にネットワーク優先
  // → Netlifyに新版をアップロードすれば即座に反映される
  if (url.includes('/') && !url.includes('.')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match('/'))
    );
    return;
  }
});
