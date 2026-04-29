const CACHE_NAME = 'apicolony-v1'
const STATIC_CACHE = 'apicolony-static-v1'

// Önbelleğe alınacak statik dosyalar
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
]

// Install
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate - eski cache'leri temizle
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== STATIC_CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch - network first, cache fallback
self.addEventListener('fetch', (e) => {
  // Supabase API isteklerini cache'leme
  if (e.request.url.includes('supabase.co') || e.request.url.includes('anthropic.com')) {
    return
  }

  // Navigasyon istekleri - index.html döndür (SPA)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match('/index.html')
      )
    )
    return
  }

  // Statik dosyalar - cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(response => {
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        }
        return response
      }).catch(() => caches.match('/index.html'))
    })
  )
})

// Push notifications (ileride)
self.addEventListener('push', (e) => {
  const data = e.data?.json() || {}
  self.registration.showNotification(data.title || 'ApiColony', {
    body: data.body || 'Yeni bildirim',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  })
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'))
})
