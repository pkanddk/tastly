// This is the service worker with the combined offline experience (Offline page + Offline copy of pages)

const CACHE = "tastly-offline-v1";
const OFFLINE_URL = "/offline";

// Install stage sets up the offline page in the cache and opens a new cache
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll([
        OFFLINE_URL,
        "/",
        "/icon-192.png",
        "/icon-512.png",
        "/apple-icon.png",
        "/images/banner.jpg"
      ]);
    })
  );
});

// If any fetch fails, it will look for the request in the cache and serve it from there first
self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // If request was successful, add result to cache
        event.waitUntil(updateCache(event.request, response.clone()));
        return response;
      })
      .catch(function(error) {
        // Check to see if you have it in the cache
        // Return response
        // If not in the cache, then return the offline page
        return fromCache(event.request).catch(function() {
          return caches.match(OFFLINE_URL);
        });
      })
  );
});

function fromCache(request) {
  // Check to see if you have it in the cache
  // Return response
  // If not in the cache, then return
  return caches.open(CACHE).then(function(cache) {
    return cache.match(request).then(function(matching) {
      if (!matching || matching.status === 404) {
        return Promise.reject("no-match");
      }
      return matching;
    });
  });
}

function updateCache(request, response) {
  return caches.open(CACHE).then(function(cache) {
    return cache.put(request, response);
  });
} 