import { Loader2 } from "lucide-react";
import { LogoFr } from "@/components/marca/logo-fr";

// Splash mientras se restaura la sesión (guards). Sin pantalla en blanco.
export function SessionSplash() {
  return (
    <main
      className="flex h-dvh min-h-screen w-full flex-col items-center justify-center gap-6 bg-bg-light text-foreground dark:bg-canvas"
      role="status"
      aria-live="polite"
      aria-label="Cargando sesión"
    >
      <div className="relative animate-pulse-glow">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[28px] bg-primary opacity-40 blur-xl"
        />
        <LogoFr className="relative size-20 drop-shadow-xl" />
      </div>
      <Loader2 aria-hidden="true" className="h-9 w-9 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">Cargando sesión…</p>
    </main>
  );
}
