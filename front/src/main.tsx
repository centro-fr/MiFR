import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import App from "./App.tsx";
import { initTema } from "./stores/theme-store.ts";

initTema();

// Los mocks se activan solo a pedido: sin la variable, el front usa la API real.
async function enableMocks() {
  if (import.meta.env.VITE_USE_MOCKS !== "true") return;
  if (import.meta.env.PROD) return;
  const { worker } = await import("./mocks/browser.ts");
  await worker.start({ onUnhandledRequest: "bypass" });
}

void enableMocks().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});