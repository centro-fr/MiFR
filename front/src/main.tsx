import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { registrarServiceWorker } from "./pwa/registrar-service-worker.ts";
import { initTema } from "./stores/theme-store.ts";

initTema();
registrarServiceWorker();

// Los mocks se activan solo a pedido: sin la variable, el front usa la API real.
async function enableMocks() {
  if (import.meta.env.VITE_USE_MOCKS !== "true") return;
  if (import.meta.env.PROD) return;
  try {
    const { worker } = await import("./mocks/browser.ts");
    await worker.start({
      onUnhandledRequest: "bypass",
      serviceWorker: {
        url: "/mockServiceWorker.js",
      },
    });
    console.log("%c[MSW] Mock Service Worker activo", "color: #10b981; font-weight: bold;");
  } catch (err) {
    console.error("[MSW] Error al inicializar Mock Service Worker:", err);
  }
}

void enableMocks().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});