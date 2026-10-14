import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { ClasesDelDia } from "@/features/asistencia/components/clases-del-dia";
import { RegistroAsistencia } from "@/features/asistencia/components/registro-asistencia";
import { fechaActualArgentina } from "@/utils/fecha";
import {
  useAsistenciaDeClase,
  useCerrarAsistencia,
  useClasesAsistencia,
  useMarcarAsistencia,
  useMarcarTodosPresentes,
} from "@/features/asistencia/hooks/use-asistencia";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { listarProfesoras } from "@/features/horarios/api/horarios-api";
import { PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";

interface VistaProps {
  propietaria: boolean;
}

function fechaConsultaDe(valor: string | null, hoy: string): string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor > hoy) return hoy;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor ? valor : hoy;
}

// Quién dicta cada clase, por id: la clase solo trae el id de la profesora. Es la misma consulta
// (y la misma caché) que usan Horarios y el filtro de Alumnos.
function useNombresDeProfesoras(habilitada: boolean): ReadonlyMap<number, string> {
  const { data } = useQuery({ queryKey: PROFESORAS_QUERY_KEY, queryFn: listarProfesoras, staleTime: 5 * 60_000, enabled: habilitada });
  return useMemo(() => new Map((data ?? []).map((p) => [Number(p.id), `${p.nombre} ${p.apellido}`])), [data]);
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
  const profesoras = useNombresDeProfesoras(propietaria && id === undefined);

  // Consulta de profesoras para asociar a la usuaria multi-rol con su id_profesora
  const { data: listaProfesoras } = useQuery({
    queryKey: PROFESORAS_QUERY_KEY,
    queryFn: listarProfesoras,
    staleTime: 5 * 60_000,
    enabled: !propietaria && id === undefined,
  });

  const idProfesoraActual = useMemo(() => {
    if (!user || !listaProfesoras || listaProfesoras.length === 0) return null;
    const prof = listaProfesoras.find(
      (p) =>
        p.nombre.trim().toLowerCase() === user.nombre.trim().toLowerCase() &&
        p.apellido.trim().toLowerCase() === user.apellido.trim().toLowerCase(),
    );
    return prof ? Number(prof.id) : null;
  }, [user, listaProfesoras]);

  const clasesFiltradas = useMemo(() => {
    const todas = consultaClases.data ?? [];
    if (propietaria) return todas;
    // En el menú de profesora ("Hoy"), la usuaria (incluso si es Propietaria)
    // solo debe visualizar sus propias clases asignadas para tomar asistencia.
    if (idProfesoraActual !== null) {
      return todas.filter((c) => c.id_prof_dictante === idProfesoraActual);
    }
    return todas;
  }, [consultaClases.data, propietaria, idProfesoraActual]);

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
      <div className="space-y-6 min-w-0">
        {id ? (
          consultaAsistencia.isPending ? (
            <div
              role="status"
              className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
              Cargando la lista de inscriptos…
            </div>
          ) : consultaAsistencia.isError && !consultaAsistencia.data ? (
            <div className="flex flex-col items-start gap-4">
              <p role="alert" className="text-sm font-semibold text-destructive">
                {mensajeDeErrorApi(consultaAsistencia.error, "No se pudo cargar la asistencia.")}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void consultaAsistencia.refetch()}
                className="min-h-[44px] rounded-xl px-4 text-sm font-bold"
              >
                Reintentar
              </Button>
            </div>
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
            clases={clasesFiltradas}
            baseRuta={rutaBase}
            fecha={fechaSeleccionada}
            error={
              consultaClases.isError
                ? mensajeDeErrorApi(consultaClases.error, "No se pudieron cargar las clases.")
                : null
            }
            cargando={consultaClases.isPending}
            propietaria={propietaria}
            profesoras={profesoras}
            onFechaChange={propietaria ? cambiarFecha : undefined}
            onReintentar={() => void consultaClases.refetch()}
          />
        )}
      </div>
    </OwnerLayout>
  );
}

export function AsistenciaPage() {
  return <VistaAsistencia propietaria />;
}

export function ClasesDeHoyPage() {
  return <VistaAsistencia propietaria={false} />;
}
