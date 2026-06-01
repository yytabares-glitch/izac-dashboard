// IZAC Météo — service worker
const CACHE = 'izac-meteo-v2';
const SHELL = ['./', './index.html', './IZAC_Admin.html', './manifest.json', './manifest-admin.json', './icon-192.png', './icon-512.png', './icon-admin-192.png', './icon-admin-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); })); }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Appels externes (météo Open-Meteo, polices, Leaflet, Supabase) : toujours le réseau, jamais de cache
  if (url.origin !== self.location.origin) return;
  // Même origine : réseau d'abord (dernière version), cache en secours si hors-ligne
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
