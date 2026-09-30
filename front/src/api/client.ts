import axios from "axios";
import { clearSessionToken, getSessionToken } from "@/features/auth/api/session-token";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// El JWT vive solo en memoria (nunca en localStorage) y viaja como Bearer,
// como exige el back (requiereSesion). RNF-02 del SDD de autenticación.
apiClient.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      clearSessionToken();
      window.dispatchEvent(new CustomEvent("mifr:unauthorized"));
    }
    return Promise.reject(error);
  },
);
