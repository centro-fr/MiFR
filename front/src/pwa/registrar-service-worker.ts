// El service worker (public/sw.js) recibe los avisos push de cuota. Solo en el build publicado: en
// desarrollo con mocks, MSW usa su propio service worker con el mismo alcance y se pisarían.
export function registrarServiceWorker(entorno: { PROD: boolean } = import.meta.env): void {
  if (!entorno.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        // Sin service worker el sistema anda igual; solo no llegan los avisos al celular.
        console.warn("No se pudo registrar el service worker de los avisos", error);
      });
    },
    { once: true },
  );
}
