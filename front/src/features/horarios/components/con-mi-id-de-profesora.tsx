import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Card } from "@/components/ui/card";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
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
    return <TablaSkeleton ariaLabel="Cargando tus alumnos" filas={4} />;
  }

  if (miPerfil.isError) {
    return (
      <EstadoErrorCarga
        mensaje={mensajeDeErrorApi(miPerfil.error, "No se pudo cargar tu perfil de profesora.")}
        onReintentar={() => void miPerfil.refetch()}
      />
    );
  }

  if (miPerfil.idProfesora === null) {
    return (
      <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-700">
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">No tenés alumnos a cargo</h1>
      </Card>
    );
  }

  return children(miPerfil.idProfesora);
}
