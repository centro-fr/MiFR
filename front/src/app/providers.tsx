import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { router } from "@/app/router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/hooks/auth-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Sin DOM: solo contexto de Radix para los tooltips (sidebar colapsado). */}
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
        </TooltipProvider>
        <Toaster position="top-right" duration={4000} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
