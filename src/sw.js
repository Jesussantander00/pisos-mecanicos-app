import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkOnly, NetworkFirst } from "workbox-strategies";

// Precarga los archivos de la app (JS, CSS, imágenes) — estos sí son seguros de guardar de forma
// agresiva, porque cada vez que cambian, Vite les pone un nombre nuevo (un "hash" en el nombre del
// archivo). El HTML principal NO se precarga aquí a propósito (ver más abajo por qué).
precacheAndRoute(self.__WB_MANIFEST);

// El HTML principal (index.html) SIEMPRE se pide primero a la red, con un límite corto de espera,
// y solo si no hay señal usa la última copia guardada. Esto es lo que evita el error de "pantalla
// en blanco" después de subir una actualización: así el HTML que carga el navegador siempre apunta
// a los archivos JS/CSS que SÍ existen en el servidor en este momento, nunca a una versión vieja
// que ya se borró al desplegar de nuevo.
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({ cacheName: "html-cache", networkTimeoutSeconds: 4 })
);

// Nunca cachear las llamadas a Supabase ni a las funciones /api — siempre deben ir a la red,
// para traer datos frescos y no mostrar información vieja guardada.
registerRoute(({ url }) => url.hostname.endsWith("supabase.co"), new NetworkOnly());
registerRoute(({ url }) => url.pathname.startsWith("/api/"), new NetworkOnly());

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/** Cuando llega una notificación push real (aunque la app esté cerrada), la muestra. */
self.addEventListener("push", (event) => {
  let data = { title: "Pisos Mecánicos", body: "Tienes una notificación nueva.", url: "/" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch { /* noop */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

/** Al tocar la notificación, abre (o enfoca) la app en la pantalla correspondiente. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => "focus" in c);
      if (existing) { existing.focus(); return existing.navigate(url); }
      return self.clients.openWindow(url);
    })
  );
});
