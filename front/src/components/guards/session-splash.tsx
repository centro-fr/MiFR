import { Loader2 } from "lucide-react";

// Splash mientras se restaura la sesión (guards). Sin pantalla en blanco.
export function SessionSplash() {
  return (
    <main
      className="flex h-dvh min-h-screen w-full flex-col items-center justify-center gap-6 bg-bg-light text-slate-900 dark:bg-canvas dark:text-slate-100"
      role="status"
      aria-live="polite"
      aria-label="Cargando sesión"
    >
      <div className="relative animate-pulse-glow">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[28px] bg-primary opacity-40 blur-xl"
        />
        <div
          aria-hidden="true"
          className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-tr from-primary-dark to-primary text-[28px] font-extrabold tracking-wider text-white shadow-xl"
        >
          FR
        </div>
      </div>
      <Loader2 aria-hidden="true" className="h-9 w-9 animate-spin text-primary" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cargando sesión…</p>
    </main>
  );
}
