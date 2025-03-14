// This is a minimal service worker that handles basic caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('tastly-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/images/tastly-banner.jpg'
      ]).catch(error => {
        console.error('Failed to cache resources:', error);
        // Continue even if caching fails
        return [];
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Return a fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return null;
      });
    })
  );
}); 