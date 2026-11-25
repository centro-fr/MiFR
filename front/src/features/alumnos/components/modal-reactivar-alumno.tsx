import { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mensajeDeErrorApi } from "@/api/errores";
import {
  CABECERA_MODAL,
  CONTENIDO_MODAL,
  CUERPO_MODAL,
  DESCRIPCION_MODAL,
  PIE_MODAL,
  TITULO_MODAL,
  BOTON_MODAL_PRINCIPAL,
} from "@/components/ui/estilos-modal";
import { Paso2PlanYHorarios } from "@/features/alumnos/components/preinscripcion/Paso2PlanYHorarios";
import { usePlanes } from "@/features/alumnos/hooks/use-planes";
import { useReactivarAlumno } from "@/features/alumnos/hooks/use-reactivacion";
import { obtenerInscripcionAnterior, type EstadoAlReactivar } from "@/features/alumnos/api/reactivacion-api";
import { listarHorarios, listarProfesoras } from "@/features/horarios/api/horarios-api";
import { clasesRequeridasDelPlan } from "@/features/alumnos/utils/plan-y-profesora";
import type { DeudaAlIrse } from "@/features/alumnos/utils/situacion-cuota";
import { cn } from "@/utils/cn";

interface Props {
  idAlumno: number;
  nombre: string;
  /** Lo que debía el día de la baja (US-08): se advierte antes de reactivarlo. */
  deuda: DeudaAlIrse | null;
  menorDeEdad?: boolean;
  onClose: () => void;
}

function mensajeAlReactivar(nombre: string, estado: EstadoAlReactivar): string {
  return estado === "ACTIVA"
    ? `${nombre} quedó activo nuevamente.`
    : `${nombre} quedó preinscripto (se confirma con el pago).`;
}

export function ModalReactivarAlumno({ idAlumno, nombre, deuda, menorDeEdad, onClose }: Props) {
  const reactivar = useReactivarAlumno();

  // Consultas de datos para plan, actividad y horarios
  const { data: planes = [], isLoading: cargandoPlanes } = usePlanes();
  const { data: profesoras = [], isLoading: cargandoProfesoras } = useQuery({
    queryKey: ["profesoras"],
    queryFn: listarProfesoras,
    staleTime: 5 * 60_000,
  });
  const { data: horariosRaw = [], isLoading: cargandoHorarios } = useQuery({
    queryKey: ["horarios"],
    queryFn: listarHorarios,
    staleTime: 5 * 60_000,
  });
  const horarios = useMemo(
    () => horariosRaw.filter((h) => !h.fecha_baja_programada && h.actividad.activo),
    [horariosRaw]
  );

  // Consulta de inscripción anterior para proponer datos previos si están disponibles
  const { data: anterior, isLoading: cargandoAnterior } = useQuery({
    queryKey: ["alumnos", idAlumno, "inscripcion-anterior"],
    queryFn: () => obtenerInscripcionAnterior(idAlumno),
  });

  const cargando = cargandoPlanes || cargandoProfesoras || cargandoHorarios || cargandoAnterior;

  // Estados de selección del formulario
  const [idPlan, setIdPlan] = useState<number | null>(null);
  const [idProfesora, setIdProfesora] = useState<number | null>(null);
  const [idsHorarios, setIdsHorarios] = useState<number[]>([]);
  const [inicializado, setInicializado] = useState(false);

  // Proponer datos de la inscripción previa
  useEffect(() => {
    if (anterior && planes.length > 0 && !inicializado) {
      const planPrevio = planes.find((p) => String(p.id_plan) === anterior.idPlan);
      if (planPrevio) {
        setIdPlan(planPrevio.id_plan);
        const idProfeNum = Number(anterior.idProfesora);
        if (profesoras.some((prof) => Number(prof.id) === idProfeNum)) {
          setIdProfesora(idProfeNum);
        }
        const horariosValidos = anterior.idsHorarios
          .map(Number)
          .filter((id) => horarios.some((h) => h.id_horario === id));
        if (horariosValidos.length > 0) {
          setIdsHorarios(horariosValidos);
        }
      }
      setInicializado(true);
    }
  }, [anterior, planes, profesoras, horarios, inicializado]);

  const planSeleccionado = useMemo(
    () => planes.find((p) => p.id_plan === idPlan) ?? null,
    [planes, idPlan]
  );

  const clasesRequeridas = useMemo(
    () => (planSeleccionado ? clasesRequeridasDelPlan(planSeleccionado) : 0),
    [planSeleccionado]
  );

  const seleccionarPlan = (id: number) => {
    setIdPlan(id);
    setIdsHorarios([]);
  };

  const limpiarHorarios = () => {
    setIdsHorarios([]);
  };

  const toggleHorario = (idHorario: number) => {
    setIdsHorarios((actuales) => {
      if (actuales.includes(idHorario)) {
        return actuales.filter((id) => id !== idHorario);
      }
      const horario = horarios.find((h) => h.id_horario === idHorario);
      if (!horario) return actuales;
      const ocupadoPorMismoDia = actuales.some((id) => {
        const h = horarios.find((otro) => otro.id_horario === id);
        return h?.dia_semana === horario.dia_semana;
      });
      if (ocupadoPorMismoDia) {
        toast.warning("Ya elegiste un horario para este día.");
        return actuales;
      }
      if (clasesRequeridas > 0 && actuales.length >= clasesRequeridas) {
        toast.warning(`Este plan incluye ${clasesRequeridas} clase(s) por semana.`);
        return actuales;
      }
      return [...actuales, idHorario];
    });
  };

  const procesando = reactivar.isPending;

  const puedeConfirmar =
    idPlan !== null &&
    idProfesora !== null &&
    (clasesRequeridas === 0 || idsHorarios.length === clasesRequeridas);

  const confirmar = () => {
    if (!idPlan || !idProfesora) {
      toast.error("Seleccioná un plan y una profesora.");
      return;
    }
    if (clasesRequeridas > 0 && idsHorarios.length !== clasesRequeridas) {
      toast.error(`Elegí ${clasesRequeridas} horario(s) para completar el plan.`);
      return;
    }

    reactivar
      .mutateAsync({
        id: idAlumno,
        cuerpo: {
          id_plan: idPlan,
          id_profesora: idProfesora,
          ids_horarios: idsHorarios,
        },
      })
      .then((estado) => {
        toast.success(mensajeAlReactivar(nombre, estado));
        onClose();
      })
      .catch((err) => {
        toast.error(mensajeDeErrorApi(err, "No se pudo reactivar al alumno."));
      });
  };

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !procesando) onClose();
      }}
    >
      <DialogContent className={cn(CONTENIDO_MODAL, "max-w-4xl")}>
        {/* Header con formato estándar y texto simplificado */}
        <DialogHeader className={CABECERA_MODAL}>
          <DialogTitle className={TITULO_MODAL}>Reactivar a {nombre}</DialogTitle>
          <DialogDescription className={DESCRIPCION_MODAL}>
            Asigná el plan, actividad y horarios para reactivar la inscripción.
          </DialogDescription>
        </DialogHeader>

        {/* Body con formato estándar y diseño igual a paso 2 de preinscripción */}
        <div className={CUERPO_MODAL}>
          {deuda && (
            <Alert className="rounded-xl border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <AlertDescription className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Deuda previa: {deuda.planes.join(" y ")} (hace {deuda.diasDeAtraso} días).
              </AlertDescription>
            </Alert>
          )}

          {cargando ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Cargando opciones disponibles...
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <Paso2PlanYHorarios
                menorDeEdad={menorDeEdad}
                planes={planes}
                profesoras={profesoras}
                horarios={horarios}
                idPlanSeleccionado={idPlan}
                onSeleccionarPlan={seleccionarPlan}
                idProfesoraSeleccionada={idProfesora}
                onSeleccionarProfesora={setIdProfesora}
                esSoloProfesora={false}
                idsHorarios={idsHorarios}
                onToggleHorario={toggleHorario}
                onLimpiarHorarios={limpiarHorarios}
                clasesRequeridas={clasesRequeridas}
              />

              {reactivar.error && (
                <Alert className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
                  <AlertDescription className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                    {mensajeDeErrorApi(reactivar.error, "Ocurrió un error al intentar reactivar.")}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Footer con formato estándar */}
        <DialogFooter className={PIE_MODAL}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={procesando}
            className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={procesando || !puedeConfirmar || cargando}
            onClick={confirmar}
            className={BOTON_MODAL_PRINCIPAL}
          >
            {procesando ? "Reactivando..." : "Reactivar alumno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
