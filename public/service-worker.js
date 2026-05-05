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

  // Dev / loopback: do not intercept — Next.js navigations / RSC break when handled here,
  // and invalid respondWith surfaces as FetchEvent errors in the console.
  const loopbackHost =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '[::1]' ||
    url.hostname === '::1'
  if (loopbackHost) {
    return
  }

  if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/admin/form-config')) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request, { cache: 'no-store' })
        } catch {
          const fromCache =
            (await caches.match(event.request)) ?? (await caches.match('/offline.html'))
          return (
            fromCache ??
            new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
          )
        }
      })()
    )
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(async () => {
          const cached = await caches.match(event.request)
          if (cached) return cached
          return new Response('', { status: 503, statusText: 'Unavailable' })
        })
    )
  }
})
