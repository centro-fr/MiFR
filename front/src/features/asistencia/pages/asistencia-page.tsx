import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { ClasesDelDia } from "@/features/asistencia/components/clases-del-dia";
import { RegistroAsistencia } from "@/features/asistencia/components/registro-asistencia";
import {
  fechaActualArgentina,
  useAsistenciaDeClase,
  useCerrarAsistencia,
  useClasesAsistencia,
  useMarcarAsistencia,
  useMarcarTodosPresentes,
} from "@/features/asistencia/hooks/use-asistencia";
import { useAuth } from "@/features/auth/hooks/use-auth";

interface VistaProps {
  propietaria: boolean;
}

function fechaConsultaDe(valor: string | null, hoy: string): string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor > hoy) return hoy;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor ? valor : hoy;
}

function VistaAsistencia({ propietaria }: VistaProps) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const fechaHoy = fechaActualArgentina();
  const fechaSeleccionada = propietaria ? fechaConsultaDe(searchParams.get("fecha"), fechaHoy) : fechaHoy;
  const rutaBase = propietaria ? "/app/asistencia" : "/app/hoy";
  const volver = propietaria ? `${rutaBase}?fecha=${encodeURIComponent(fechaSeleccionada)}` : rutaBase;
  const consultaClases = useClasesAsistencia(propietaria ? fechaSeleccionada : undefined, id === undefined);
  const consultaAsistencia = useAsistenciaDeClase(id);
  const marcar = useMarcarAsistencia();
  const marcarTodos = useMarcarTodosPresentes();
  const cerrar = useCerrarAsistencia();

  const informarError = (error: unknown, mensaje: string) => {
    const detalle = mensajeDeErrorApi(error, mensaje);
    toast.error(detalle);
  };

  async function marcarAlumno(idAlumno: number, asistio: boolean) {
    if (!id) return;
    try {
      await marcar.mutateAsync({ idClase: id, idAlumno, asistio });
      toast.success("Asistencia guardada.");
    } catch (error) {
      informarError(error, "No se pudo guardar la asistencia.");
    }
  }

  async function marcarInscriptosPresentes() {
    if (!id) return;
    try {
      await marcarTodos.mutateAsync(id);
      toast.success("Los inscriptos quedaron marcados como presentes.");
    } catch (error) {
      informarError(error, "No se pudo marcar a todos como presentes.");
    }
  }

  async function cerrarVentana() {
    if (!id) return;
    try {
      await cerrar.mutateAsync(id);
      toast.success("Asistencia cerrada. Los inscriptos sin marcar quedaron ausentes.");
    } catch (error) {
      informarError(error, "No se pudo cerrar la asistencia.");
      throw error;
    }
  }

  function cambiarFecha(fecha: string) {
    if (!fecha) return;
    setSearchParams({ fecha });
  }

  return (
    <OwnerLayout>
      {id ? (
        consultaAsistencia.isPending ? (
          <div role="status" className="mx-auto flex min-h-64 w-full max-w-7xl items-center justify-center">
            <span className="text-sm font-semibold text-muted-foreground">Cargando la lista de inscriptos…</span>
          </div>
        ) : consultaAsistencia.isError && !consultaAsistencia.data ? (
          <section className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4">
            <p role="alert" className="text-sm font-semibold text-destructive">
              {mensajeDeErrorApi(consultaAsistencia.error, "No se pudo cargar la asistencia.")}
            </p>
            <button
              type="button"
              onClick={() => void consultaAsistencia.refetch()}
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold hover:bg-muted"
            >
              Reintentar
            </button>
          </section>
        ) : consultaAsistencia.data ? (
          <RegistroAsistencia
            datos={consultaAsistencia.data}
            volver={volver}
            propietaria={Boolean(user?.roles.includes("PROPIETARIA"))}
            guardando={marcar.isPending || marcarTodos.isPending || cerrar.isPending}
            error={
              consultaAsistencia.isError
                ? mensajeDeErrorApi(consultaAsistencia.error, "No se pudo actualizar la asistencia.")
                : null
            }
            alMarcar={marcarAlumno}
            alMarcarTodos={marcarInscriptosPresentes}
            alCerrar={cerrarVentana}
            reintentar={() => void consultaAsistencia.refetch()}
          />
        ) : null
      ) : (
        <ClasesDelDia
          clases={consultaClases.data ?? []}
          baseRuta={rutaBase}
          fecha={fechaSeleccionada}
          error={
            consultaClases.isError
              ? mensajeDeErrorApi(consultaClases.error, "No se pudieron cargar las clases.")
              : null
          }
          cargando={consultaClases.isPending}
          propietaria={propietaria}
          onFechaChange={propietaria ? cambiarFecha : undefined}
          onReintentar={() => void consultaClases.refetch()}
        />
      )}
    </OwnerLayout>
  );
}

export function AsistenciaPage() {
  return <VistaAsistencia propietaria />;
}

export function ClasesDeHoyPage() {
  return <VistaAsistencia propietaria={false} />;
}
