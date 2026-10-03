import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

async function enableMocks() {
  if ((import.meta.env.VITE_USE_MOCKS ?? "true") === "false") return;
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
