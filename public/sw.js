/* FocusClock service worker — background push + PWA installability. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// A pass-through fetch handler so the app qualifies as an installable PWA.
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  let data = { title: 'FocusClock', body: '' }
  try {
    data = event.data ? event.data.json() : data
  } catch (e) {
    data = { title: 'FocusClock', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'FocusClock', {
      body: data.body || '',
      tag: data.tag || 'focusclock',
      renotify: true,
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
      return undefined
    })
  )
})
