// Service Worker — 脳波ブースター Pro
// v2: プリキャッシュするCDN URLを index.html の実際の読み込みURLと一致させ、
//     1件でも失敗するとインストール全体が失敗する問題を解消した
const CACHE_NAME = 'gamma-wave-booster-v2';

// 自サイトのファイル（欠けるとアプリが起動しないので必須扱い）
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png'
];

// 外部CDN（index.html の <script>/<link> と同じURLにすること。
// ネットワーク事情で失敗しうるので、取得できたものだけキャッシュする）
const CDN_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@100;400;700&display=swap',
    'https://unpkg.com/react@18.2.0/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone@7.23.10/babel.min.js'
];

// インストール時にコアアセットをキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                console.log('[SW] Caching core assets');
                // 自サイトのファイルは全て必須
                await cache.addAll(CORE_ASSETS);
                // CDNは1件ずつ。失敗しても他を巻き込まない（オフライン初回起動の保険）
                await Promise.all(CDN_ASSETS.map((url) =>
                    cache.add(url).catch((e) => console.warn('[SW] skip cache:', url, e))
                ));
            })
            .then(() => self.skipWaiting())
    );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// ネットワーク優先、失敗時にキャッシュにフォールバック
self.addEventListener('fetch', (event) => {
    // POST等は無視
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 成功したレスポンスをキャッシュに保存
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    }).catch(() => { });
                }
                return response;
            })
            .catch(() => {
                // オフライン時はキャッシュから返す
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // HTMLリクエストならindex.htmlにフォールバック
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
