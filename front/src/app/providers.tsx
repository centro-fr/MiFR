import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { router } from "@/app/router";
import { AuthProvider } from "@/features/auth/hooks/auth-provider";
import { useThemeStore } from "@/stores/theme-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

export function Providers() {
  const tema = useThemeStore((estado) => estado.tema);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <ToastContainer
          position="top-right"
          theme={tema === "oscuro" ? "dark" : "light"}
          closeButton
          autoClose={4000}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
