/**
 * BH Agro - PWA Vite plugin (কোনো বাড়তি প্যাকেজ লাগে না)
 *  - প্রতিটি সাইটের জন্য আলাদা manifest.webmanifest বানায় (SR / Admin)
 *  - অফলাইন-সক্ষম sw.js বানায় (বিল্ডের ফাইল তালিকা + CDN স্ক্রিপ্ট প্রি-ক্যাশ করে)
 *  - index.html-এ title, manifest, theme-color, apple আইকন বসায়
 */
import type { Plugin } from 'vite';

type Site = 'sr' | 'admin';

const SITE_META: Record<Site, {
  title: string; name: string; shortName: string; theme: string; description: string;
  shortcuts: { name: string; url: string }[];
}> = {
  sr: {
    title: 'Bioherbs Agrovet - SR Portal',
    name: 'Bioherbs Agrovet SR',
    shortName: 'Bioherbs SR',
    theme: '#059669',
    description: 'Bioherbs Agrovet SR order booking',
    shortcuts: [
      { name: 'Order Booking', url: './#order_booking' },
      { name: 'Products', url: './#products' },
      { name: "Today's Orders", url: './#my_orders' }
    ]
  },
  admin: {
    title: 'Bioherbs Agrovet - Admin Panel',
    name: 'Bioherbs Agrovet Admin',
    shortName: 'Bioherbs Admin',
    theme: '#6d28d9',
    description: 'Bioherbs Agrovet admin panel',
    shortcuts: [
      { name: 'Dashboard', url: './#dashboard' },
      { name: 'Orders', url: './#orders_management' },
      { name: 'Stock', url: './#stock_manage' }
    ]
  }
};

/** index.html-এ ব্যবহৃত বাইরের (CDN) স্ক্রিপ্ট/স্টাইল URL থেকে প্রি-ক্যাশ তালিকা */
export function extractCdnUrls(html: string): string[] {
  const urls = new Set<string>();
  const scriptRe = /<script[^>]+src="(https?:\/\/[^"]+)"/gi;
  const linkRe = /<link[^>]+rel="stylesheet"[^>]*href="(https?:\/\/[^"]+)"|<link[^>]+href="(https?:\/\/[^"]+)"[^>]*rel="stylesheet"/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html))) urls.add(m[1]);
  while ((m = linkRe.exec(html))) urls.add((m[1] || m[2]) as string);
  return Array.from(urls);
}

export function buildManifest(site: Site) {
  const meta = SITE_META[site];
  const icons = `./icons/${site}`;
  return {
    id: `./?app=${site}`,
    name: meta.name,
    short_name: meta.shortName,
    description: meta.description,
    start_url: './',
    scope: './',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],
    background_color: '#ffffff',
    theme_color: meta.theme,
    lang: 'bn',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      { src: `${icons}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${icons}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${icons}/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: meta.shortcuts.map(s => ({
      name: s.name,
      url: s.url,
      icons: [{ src: `${icons}/icon-192.png`, sizes: '192x192', type: 'image/png' }]
    }))
  };
}

export function buildServiceWorker(version: string, precache: string[], cdn: string[]): string {
  return `/* BH Agro service worker - auto generated */
const VERSION = ${JSON.stringify(version)};
const STATIC_CACHE = 'bhagro-static-' + VERSION;
const RUNTIME_CACHE = 'bhagro-runtime-v1';
const PRECACHE = ${JSON.stringify(precache)};
const CDN = ${JSON.stringify(cdn)};
const NAV_TIMEOUT_MS = 3500;

// এই হোস্টগুলোর রিকোয়েস্ট সার্ভিস ওয়ার্কার ছোঁয় না (Firebase রিয়েলটাইম ডাটা ইত্যাদি)
const BYPASS = /(firebaseio\\.com|firebasedatabase\\.app|identitytoolkit|securetoken|firebaseinstallations)/i;
// এই হোস্টগুলো ক্যাশ করা হয় (অফলাইনে অ্যাপ চালানোর জন্য)
const RUNTIME_HOSTS = /(cdn\\.tailwindcss\\.com|unpkg\\.com|cdn\\.jsdelivr\\.net|cdnjs\\.cloudflare\\.com|www\\.gstatic\\.com|fonts\\.googleapis\\.com|fonts\\.gstatic\\.com)/i;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const staticCache = await caches.open(STATIC_CACHE);
    await Promise.all(PRECACHE.map((u) => staticCache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    const runtime = await caches.open(RUNTIME_CACHE);
    await Promise.all(CDN.map((u) => runtime.add(new Request(u, { mode: 'no-cors' })).catch(() => {})));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('bhagro-static-') && k !== STATIC_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const net = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NAV_TIMEOUT_MS))
    ]);
    if (net && net.ok) cache.put('./index.html', net.clone());
    return net;
  } catch (e) {
    const cached = (await cache.match('./index.html')) || (await cache.match('./')) || (await caches.match('./index.html'));
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, res.clone());
  }
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(request);
  const update = fetch(request).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  if (hit) { update.catch(() => {}); return hit; }
  const res = await update;
  return res || new Response('', { status: 504, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (BYPASS.test(url.hostname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request).catch(() => caches.match(request)));
    return;
  }
  if (RUNTIME_HOSTS.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
`;
}

export function pwaPlugin(site: Site): Plugin {
  const meta = SITE_META[site];
  let cdnUrls: string[] = [];

  return {
    name: 'bhagro-pwa',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        cdnUrls = extractCdnUrls(html);
        let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${meta.title}</title>`);
        const tags = [
          site === 'admin' ? '<meta name="robots" content="noindex, nofollow" />' : '',
          `<meta name="theme-color" content="${meta.theme}" />`,
          '<meta name="mobile-web-app-capable" content="yes" />',
          '<meta name="apple-mobile-web-app-capable" content="yes" />',
          '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
          `<meta name="apple-mobile-web-app-title" content="${meta.shortName}" />`,
          '<link rel="manifest" href="./manifest.webmanifest" />',
          `<link rel="icon" type="image/png" href="./icons/${site}/favicon-64.png" />`,
          `<link rel="apple-touch-icon" href="./icons/${site}/apple-touch-icon.png" />`
        ].filter(Boolean).join('\n  ');
        out = out.replace('<head>', `<head>\n  ${tags}`);
        return out;
      }
    },
    generateBundle(_options: unknown, bundle: Record<string, unknown>) {
      const files = Object.keys(bundle).map((f) => `./${f}`);
      const precache = [
        './',
        './index.html',
        './manifest.webmanifest',
        `./icons/${site}/icon-192.png`,
        `./icons/${site}/icon-512.png`,
        `./icons/${site}/apple-touch-icon.png`,
        `./icons/${site}/favicon-64.png`,
        './bioherbs_logo.jpg',
        ...files.filter((f) => f !== './index.html')
      ];
      const version = Date.now().toString(36);
      (this as any).emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: JSON.stringify(buildManifest(site), null, 2)
      });
      (this as any).emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: buildServiceWorker(version, precache, cdnUrls)
      });
    }
  };
}
