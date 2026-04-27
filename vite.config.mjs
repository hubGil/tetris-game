import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

function createServiceWorker(base) {
  return {
    name: 'tetris-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const normalizedBase = base.endsWith('/') ? base : `${base}/`;
      const precacheFiles = [
        normalizedBase,
        `${normalizedBase}manifest.webmanifest`,
        `${normalizedBase}icons/icon-192.svg`,
        `${normalizedBase}icons/icon-512.svg`,
        `${normalizedBase}icons/icon-maskable.svg`,
      ];

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'asset' || chunk.type === 'chunk') {
          precacheFiles.push(`${normalizedBase}${fileName}`);
        }
      }

      const uniqueFiles = [...new Set(precacheFiles)];
      const source = `
const CACHE_NAME = 'tetris-cache-v1';
const PRECACHE_URLS = ${JSON.stringify(uniqueFiles, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('${normalizedBase}')),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return networkResponse;
      });
    }),
  );
});
`.trim();

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source,
      });
    },
  };
}

export default defineConfig(() => {
  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'tetris';
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const base = isGitHubActions ? `/${repository}/` : '/';

  return {
    base,
    resolve: {
      alias: {
        '@': resolve(rootDir, 'src'),
      },
    },
    plugins: [createServiceWorker(base)],
    test: {
      environment: 'node',
    },
  };
});
