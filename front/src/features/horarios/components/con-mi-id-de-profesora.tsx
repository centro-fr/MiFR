import type { ReactNode } from "react";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMiIdDeProfesora } from "@/features/horarios/hooks/use-mi-id-de-profesora";

interface Props {
  children: (idProfesora: string) => ReactNode;
}

/**
 * Para la propietaria en su panel de Profesora: a ella el back le devuelve todos los alumnos, así que
 * cada pantalla la filtra por su propio id_profesora. Hasta tenerlo no se muestra ni se pide nada,
 * para que no aparezca un instante la lista completa.
 */
export function ConMiIdDeProfesora({ children }: Props) {
  const miPerfil = useMiIdDeProfesora();

  if (miPerfil.isPending) {
    return (
      <div
        role="status"
        className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
      >
        <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
        Cargando tus alumnos…
      </div>
    );
  }

  if (miPerfil.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-700">
        <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
        <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {mensajeDeErrorApi(miPerfil.error, "No se pudo cargar tu perfil de profesora.")}
        </p>
        <Button
          type="button"
          onClick={() => void miPerfil.refetch()}
          className="min-h-[40px] rounded-xl bg-primary text-white hover:bg-primary-dark"
        >
          Reintentar
        </Button>
      </Card>
    );
  }

  if (miPerfil.idProfesora === null) {
    return (
      <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-700">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
          <Users aria-hidden="true" className="size-7" />
        </span>
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">No tenés alumnos a cargo</h1>
      </Card>
    );
  }

  return children(miPerfil.idProfesora);
}
