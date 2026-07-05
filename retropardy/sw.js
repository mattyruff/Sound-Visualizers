/* RETROPARDY! service worker — precache everything, serve cache-first.
   Makes the installed app fully offline once it has loaded once. */
var CACHE = "retropardy-v3";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/game.js",
  "./js/data/movies.js",
  "./js/data/tv.js",
  "./js/data/music.js",
  "./js/data/games.js",
  "./js/data/sports.js",
  "./js/data/world.js",
  "./js/data/food.js",
  "./js/data/cars.js",
  "./js/data/tech.js",
  "./js/data/fads.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      });
    })
  );
});
