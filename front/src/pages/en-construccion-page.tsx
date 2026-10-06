import { useNavigate } from "react-router-dom";
import { ArrowLeft, Construction, LayoutDashboard } from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";

interface EnConstruccionPageProps {
  /** Nombre de la sección pendiente (ej: "Alumnos"). Se muestra como contexto. */
  seccion?: string;
}

export function EnConstruccionPage({ seccion }: EnConstruccionPageProps) {
  const navigate = useNavigate();

  function volverAtras() {
    void navigate(-1);
  }

  function irAlDashboard() {
    void navigate("/app/dashboard", { replace: true });
  }

  return (
    <OwnerLayout>
      <section
        aria-labelledby="en-construccion-titulo"
        className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm sm:px-10 dark:border-white/10 dark:bg-surface-low"
      >
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary-dark dark:bg-primary/20 dark:text-pink-300"
        >
          <Construction className="h-8 w-8" />
        </span>

        <div className="flex flex-col gap-2">
          <h1
            id="en-construccion-titulo"
            className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white"
          >
            Esta sección está en construcción
          </h1>
          <p className="text-sm text-slate-500 sm:text-base dark:text-slate-400">
            {seccion ? (
              <>
                La sección <strong className="font-bold text-slate-700 dark:text-slate-200">{seccion}</strong> todavía no
                está habilitada. Estamos trabajando para habilitarla pronto.
              </>
            ) : (
              "Estamos trabajando para habilitarla pronto."
            )}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={irAlDashboard}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <LayoutDashboard aria-hidden="true" className="h-5 w-5" />
            Volver al Dashboard
          </button>
          <button
            type="button"
            onClick={volverAtras}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
            Volver atrás
          </button>
        </div>
      </section>
    </OwnerLayout>
  );
}
