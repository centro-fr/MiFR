// Service worker de MiFR. Hace dos cosas: muestra los avisos push de cuota y, al tocarlos, abre el
// sistema. No guarda pantallas ni datos: la app instalada necesita conexión, como la web (decidido el
// 13/11/2026). Es un archivo de public/ para que se sirva tal cual en /sw.js, con alcance en todo el sitio.

const AVISO_GENERICO = {
  titulo: "MiFR",
  cuerpo: "Tenés un aviso nuevo.",
  url: "/app/notificaciones",
  etiqueta: "mifr",
};

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// El back manda { titulo, cuerpo, url, etiqueta } (AvisoPush). Si llega otra cosa, se avisa igual.
function leerAviso(event) {
  try {
    const datos = event.data ? event.data.json() : null;
    if (datos && typeof datos.titulo === "string" && typeof datos.cuerpo === "string") {
      return { ...AVISO_GENERICO, ...datos };
    }
  } catch {
    // Un contenido que no es JSON muestra el aviso genérico.
  }
  return AVISO_GENERICO;
}

self.addEventListener("push", (event) => {
  const aviso = leerAviso(event);
  event.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      icon: "/iconos/icono-192.png",
      lang: "es-AR",
      // Un aviso nuevo de la misma cuota reemplaza al anterior en lugar de apilarse.
      tag: aviso.etiqueta,
      data: { url: aviso.url },
    }),
  );
});

// Solo rutas del propio sitio: un aviso no puede abrir otra página.
function destinoDelAviso(url) {
  try {
    const destino = new URL(url, self.location.origin);
    if (destino.origin === self.location.origin) return destino.href;
  } catch {
    // Una URL inválida lleva a las notificaciones.
  }
  return new URL(AVISO_GENERICO.url, self.location.origin).href;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = destinoDelAviso(event.notification.data && event.notification.data.url);
  event.waitUntil(
    (async () => {
      // Si MiFR ya está abierto, se usa esa ventana en lugar de abrir otra.
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const abierta = ventanas.find((ventana) => new URL(ventana.url).origin === self.location.origin);
      if (abierta) {
        await abierta.focus();
        if ("navigate" in abierta) return abierta.navigate(destino);
        return undefined;
      }
      return self.clients.openWindow(destino);
    })(),
  );
});
