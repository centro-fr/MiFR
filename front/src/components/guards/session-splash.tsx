import { LogoFr } from "@/components/marca/logo-fr";

// Shell estático mientras se hidrata el chunk inicial o se restaura la sesión.
// Mantiene exactamente las dimensiones y colores de OwnerLayout (sidebar 17.5rem bg-sidebar,
// header h-14 y contenedor main fluido) sin renderizar un skeleton propio, evitando que se
// vean dos skeletons consecutivos antes del skeleton real de cada página.
export function SessionSplash() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando sesión"
      className="flex min-h-dvh w-full bg-bg-light text-foreground dark:bg-canvas"
    >
      <aside className="hidden md:flex w-[17.5rem] shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-3.5">
          <LogoFr className="size-8" />
          <span className="truncate text-base font-black tracking-tight text-white">MiFR</span>
        </div>
        <div className="border-t border-sidebar-border p-3 h-[61px]" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-bg-light px-4 sm:px-6 lg:px-8 dark:bg-canvas" />
        <main className="flex w-full min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8" />
      </div>
    </div>
  );
}
