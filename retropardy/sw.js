/* Kill-switch service worker. The game moved to
   https://mattyruff.github.io/jeopardy-retro/ — this build replaces the old
   cache-first worker (which would otherwise keep serving the cached game here
   forever), wipes its caches, and hands control back to the network so
   returning players reach the redirect page. */
self.addEventListener("install", function (e) {
  self.skipWaiting();
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (clients) { clients.forEach(function (c) { c.navigate(c.url); }); })
  );
});
