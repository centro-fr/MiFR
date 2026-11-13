import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { EstadoErrorCarga, TablaSkeleton } from "@/components/ui/estados-pantalla";
import { RegistroAsistencia } from "@/features/asistencia/components/registro-asistencia";
import { SemanaDeClases } from "@/features/asistencia/components/semana-de-clases";
import { TomaDeAsistencia } from "@/features/asistencia/components/toma-de-asistencia";
import {
  useAsistenciaDeClase,
  useCerrarAsistencia,
  useMarcarAsistencia,
  useMarcarTodosPresentes,
} from "@/features/asistencia/hooks/use-asistencia";
import { ConMiIdDeProfesora } from "@/features/horarios/components/con-mi-id-de-profesora";
import { TableroMisClases } from "@/features/horarios/components/tablero-mis-clases";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { useIsMobile } from "@/hooks/use-mobile";

const MIS_CLASES = "/app/hoy";

function AsistenciaDeLaClase({ idClase, esMobile }: { idClase: string; esMobile: boolean }) {
  const { hasRole } = usePermissions();
  const consulta = useAsistenciaDeClase(idClase);
  const marcar = useMarcarAsistencia();
  const marcarTodos = useMarcarTodosPresentes();
  const cerrar = useCerrarAsistencia();

  async function ejecutar(accion: () => Promise<void>, exito: string, falla: string, relanzar = false) {
    try {
      await accion();
      toast.success(exito);
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, falla));
      if (relanzar) throw error;
    }
  }

  if (consulta.isPending) return <TablaSkeleton ariaLabel="Cargando la lista de inscriptos" filas={6} />;
  if (!consulta.data) {
    return (
      <EstadoErrorCarga
        mensaje={mensajeDeErrorApi(consulta.error, "No se pudo cargar la asistencia.")}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }

  // Mismas acciones; en el celular con el diseño mobile y en escritorio con la tabla.
  const Vista = esMobile ? TomaDeAsistencia : RegistroAsistencia;
  return (
    <Vista
      datos={consulta.data}
      volver={MIS_CLASES}
      propietaria={hasRole("PROPIETARIA")}
      guardando={marcar.isPending || marcarTodos.isPending || cerrar.isPending}
      error={consulta.isError ? mensajeDeErrorApi(consulta.error, "No se pudo actualizar la asistencia.") : null}
      alMarcar={(idAlumno, asistio) =>
        ejecutar(() => marcar.mutateAsync({ idClase, idAlumno, asistio }), "Asistencia guardada.", "No se pudo guardar la asistencia.")
      }
      alMarcarTodos={() =>
        ejecutar(
          () => marcarTodos.mutateAsync(idClase),
          "Los inscriptos quedaron marcados como presentes.",
          "No se pudo marcar a todos como presentes.",
        )
      }
      alCerrar={() =>
        ejecutar(
          () => cerrar.mutateAsync(idClase),
          "Asistencia cerrada. Los inscriptos sin marcar quedaron ausentes.",
          "No se pudo cerrar la asistencia.",
          true,
        )
      }
      reintentar={() => void consulta.refetch()}
    />
  );
}

/**
 * US-20 y US-04: "Mis clases" (/app/hoy) y la toma de asistencia de una clase (/app/hoy/:id). En el
 * celular, con el diseño mobile (la semana con las clases reales de hoy); en escritorio, el cronograma
 * semanal (tablero por hora y día) y la tabla de asistencia.
 */
export function ClasesDeHoyPage() {
  const { id } = useParams();
  const esMobile = useIsMobile();
  if (!esMobile) {
    return (
      <OwnerLayout submiga={id ? "Asistencia" : undefined}>
        {id ? (
          <AsistenciaDeLaClase idClase={id} esMobile={false} />
        ) : (
          <ConMiIdDeProfesora>{(idProfesora) => <TableroMisClases idProfesora={idProfesora} />}</ConMiIdDeProfesora>
        )}
      </OwnerLayout>
    );
  }
  return (
    <OwnerLayout tituloMovil={id ? "Asistencia" : undefined} volverA={id ? MIS_CLASES : undefined}>
      <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-4">
        {id ? (
          <AsistenciaDeLaClase idClase={id} esMobile />
        ) : (
          <ConMiIdDeProfesora>{(idProfesora) => <SemanaDeClases idProfesora={idProfesora} />}</ConMiIdDeProfesora>
        )}
      </div>
    </OwnerLayout>
  );
}
