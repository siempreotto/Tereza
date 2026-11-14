// Service worker de Tereza: abre la app sin red con la última versión de Hoy guardada en este dispositivo.
// Estáticos: caché primero. Navegación a Hoy: red primero y, sin red, la última copia.
// Al llegar a /entrar (sesión cerrada) se borra la copia de páginas.
const ESTATICOS = "tereza-estaticos-v1";
const PAGINAS = "tereza-paginas-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![ESTATICOS, PAGINAS].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || /^\/icon/.test(url.pathname)) {
    e.respondWith(caches.open(ESTATICOS).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  if (req.mode !== "navigate") return;
  if (url.pathname === "/entrar") { e.waitUntil(caches.delete(PAGINAS)); return; }
  if (url.pathname !== "/") return;
  e.respondWith(
    fetch(req)
      .then((r) => { if (r.ok && !r.redirected) caches.open(PAGINAS).then((c) => c.put("/", r.clone())); return r; })
      .catch(async () => (await caches.match("/", { cacheName: PAGINAS })) || new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Tereza</title><p style='font:16px system-ui;padding:24px'>Sin conexión. Abre Tereza otra vez cuando vuelva la red.</p>", { headers: { "content-type": "text/html; charset=utf-8" } })),
  );
});
