import { Spinner } from "@/components/ui/spinner";

// Splash branded mientras se restaura la sesión (guards). Fondo oscuro igual
// al del login, logo FR centrado y spinner sutil. Sin textos.
export function SessionSplash() {
  return (
    <main
      className="flex h-dvh min-h-screen w-full flex-col items-center justify-center gap-6 bg-white lg:bg-canvas"
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="relative animate-pulse-glow">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[28px] bg-primary opacity-40 blur-xl"
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-tr from-primary-dark to-primary text-[28px] font-extrabold tracking-wider text-white shadow-xl">
          FR
        </div>
      </div>
      <Spinner className="h-9 w-9 text-primary" strokeWidth={4} />
    </main>
  );
}
