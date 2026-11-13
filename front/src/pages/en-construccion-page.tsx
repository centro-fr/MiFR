import { useNavigate } from "react-router-dom";
import { ArrowLeft, House } from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { homePathForRoles } from "@/types/auth";

interface EnConstruccionPageProps {
  /** Nombre de la sección pendiente (ej: "Alumnos"). Se muestra como contexto. */
  seccion?: string;
}

export function EnConstruccionPage({ seccion }: EnConstruccionPageProps) {
  const navigate = useNavigate();
  const { roles } = usePermissions();

  function volverAtras() {
    void navigate(-1);
  }

  function irAlInicio() {
    void navigate(homePathForRoles(roles), { replace: true });
  }

  return (
    <OwnerLayout>
      <Card
        aria-labelledby="en-construccion-titulo"
        className="mx-auto w-full max-w-[640px] rounded-2xl border-border bg-white px-6 py-12 text-center shadow-sm sm:px-10 dark:bg-surface-low"
      >
        <CardContent className="flex flex-col items-center gap-5 p-0">
          <div className="flex flex-col gap-2">
            <h1
              id="en-construccion-titulo"
              className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white"
            >
              Esta sección está en construcción
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
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
            <Button
              type="button"
              onClick={irAlInicio}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&_svg]:size-5"
            >
              <House aria-hidden="true" className="h-5 w-5" />
              Volver al inicio
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={volverAtras}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10 [&_svg]:size-5"
            >
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              Volver atrás
            </Button>
          </div>
        </CardContent>
      </Card>
    </OwnerLayout>
  );
}
