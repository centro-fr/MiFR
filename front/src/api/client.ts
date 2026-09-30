import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mifr:unauthorized"));
    }
    return Promise.reject(error);
  },
);
