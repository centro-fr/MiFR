import axios from "axios";
import { clearSessionToken, getSessionToken } from "@/features/auth/api/session-token";

// Ruta relativa: el navegador solo habla con el Servidor Web, que reenvía /api al back
// (Vite en desarrollo, Netlify en producción). Así no hay CORS ni URL del back en el bundle.
export const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// El JWT vive en memoria + sessionStorage versionado (nunca en localStorage
// persistente) y viaja como Bearer, como exige el back (requiereSesion).
// TODO(back): migrar a cookie httpOnly + refresh para eliminar XSS persistente.
apiClient.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error?.config?.url ?? "");
    const esRutaLogin = url.includes("/auth/google") || url.includes("/auth/desarrollo");
    const teniaToken = Boolean(error?.config?.headers?.Authorization);
    if (
      error?.response?.status === 401 &&
      !esRutaLogin &&
      (teniaToken || getSessionToken() === null) &&
      typeof window !== "undefined"
    ) {
      if (teniaToken) {
        clearSessionToken();
        window.dispatchEvent(new CustomEvent("mifr:unauthorized"));
      }
    }
    return Promise.reject(error);
  },
);
