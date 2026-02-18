const PRECACHE = 'ascomp-precache-v2'
const RUNTIME = 'ascomp-runtime-v2'
const PRECACHE_URLS = ['/offline.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => Promise.resolve())
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== PRECACHE && cacheName !== RUNTIME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/admin/form-config')) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => response)
        .catch(() => caches.match(event.request).then((match) => match || caches.match('/offline.html')))
    )
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(event.request))
    )
  }
})
