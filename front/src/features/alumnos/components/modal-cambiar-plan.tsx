import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { mensajeDeErrorApi } from "@/api/errores";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Paso2PlanYHorarios } from "@/features/alumnos/components/preinscripcion/Paso2PlanYHorarios";
import { usePlanes } from "@/features/alumnos/hooks/use-planes";
import { useCambiarPlanYHorarios } from "@/features/alumnos/hooks/use-reactivacion";
import { clasesRequeridasDelPlan } from "@/features/alumnos/utils/plan-y-profesora";
import { listarHorarios, listarProfesoras } from "@/features/horarios/api/horarios-api";
import type { InscripcionDeAlumno } from "@/features/alumnos/schemas/alumno";
import { cn } from "@/utils/cn";
import { fechaCalendarioCorta } from "@/utils/fecha";
import { CABECERA_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

interface Props {
  nombre: string;
  inscripcion: InscripcionDeAlumno;
  inscripciones?: InscripcionDeAlumno[];
  tienePlanVigente?: boolean;
  onClose: () => void;
}

const CINCO_MINUTOS = 5 * 60_000;

/** Indica si la inscripción tiene su cuota al día o dentro de los días de gracia (el cambio se programa). */
function tieneGraciaVigente(inscripcion: InscripcionDeAlumno): boolean {
  if (inscripcion.estado !== "ACTIVA") return false;
  const estado = inscripcion.situacion_cuota?.estado;
  return estado === "AL_DIA" || estado === "POR_VENCER" || estado === "CLASE_SUELTA_VIGENTE";
}

export function ModalCambiarPlan({
  nombre,
  inscripcion,
  inscripciones,
  tienePlanVigente = false,
  onClose,
}: Props) {
  const inscripcionesLista = inscripciones && inscripciones.length > 0 ? inscripciones : [inscripcion];
  const [inscripcionElegida, setInscripcionElegida] = useState<InscripcionDeAlumno | null>(
    inscripcionesLista.length >= 2 ? null : inscripcionesLista[0],
  );
  const inscripcionActiva = inscripcionElegida ?? inscripcion;

  const { data: planes = [], isLoading: cargandoPlanes } = usePlanes();
  const { data: profesoras = [], isLoading: cargandoProfesoras } = useQuery({
    queryKey: ["profesoras"],
    queryFn: listarProfesoras,
    staleTime: CINCO_MINUTOS,
  });
  const { data: horarios = [], isLoading: cargandoHorarios } = useQuery({
    queryKey: ["horarios"],
    queryFn: listarHorarios,
    staleTime: CINCO_MINUTOS,
  });

  const cambiar = useCambiarPlanYHorarios({
    idInscripcion: inscripcionActiva.id_inscripcion,
    idPlan: inscripcionActiva.plan.id_plan,
  });

  const [idPlan, setIdPlan] = useState<number | null>(inscripcionActiva.plan.id_plan);
  const [idProfesora, setIdProfesora] = useState<number | null>(
    inscripcionActiva.id_profesora,
  );
  const [idsHorarios, setIdsHorarios] = useState<number[]>(
    () => inscripcionActiva.horarios.map((h) => h.id_horario),
  );

  const seleccionarInscripcion = (item: InscripcionDeAlumno) => {
    setInscripcionElegida(item);
    setIdPlan(item.plan.id_plan);
    setIdProfesora(item.id_profesora);
    setIdsHorarios(item.horarios.map((h) => h.id_horario));
  };

  const planSeleccionado = useMemo(
    () => planes.find((p) => p.id_plan === idPlan) ?? null,
    [planes, idPlan],
  );

  const clasesRequeridas = useMemo(
    () => (planSeleccionado ? clasesRequeridasDelPlan(planSeleccionado) : 0),
    [planSeleccionado],
  );

  const toggleHorario = (idHorario: number) => {
    setIdsHorarios((prev) => {
      if (prev.includes(idHorario)) {
        return prev.filter((id) => id !== idHorario);
      }
      if (clasesRequeridas > 0 && prev.length >= clasesRequeridas) {
        toast.info(
          `El plan seleccionado admite ${clasesRequeridas} ${
            clasesRequeridas === 1 ? "clase" : "clases"
          } por semana.`,
        );
        return prev;
      }
      return [...prev, idHorario];
    });
  };

  // Con el mismo plan solo se cambian los horarios, dentro de la misma profesora y actividad: otra
  // profesora u otra actividad es un cambio de plan. Un horario con la baja programada no recibe
  // alumnos nuevos, pero quien ya está en él lo conserva.
  const mismoPlan = idPlan === inscripcionActiva.plan.id_plan;
  const horariosElegibles = useMemo(() => {
    const actuales = new Set(inscripcionActiva.horarios.map((h) => h.id_horario));
    const actividades = new Set(inscripcionActiva.horarios.map((h) => h.id_actividad));
    return horarios.filter(
      (h) =>
        (!h.fecha_baja_programada || actuales.has(h.id_horario)) &&
        (!mismoPlan || (h.id_profesora === inscripcionActiva.id_profesora && actividades.has(h.id_actividad))),
    );
  }, [horarios, inscripcionActiva, mismoPlan]);

  const seleccionarPlan = (nuevoIdPlan: number) => {
    setIdPlan(nuevoIdPlan);
    if (nuevoIdPlan === inscripcionActiva.plan.id_plan) {
      setIdProfesora(inscripcionActiva.id_profesora);
      setIdsHorarios(inscripcionActiva.horarios.map((h) => h.id_horario));
      return;
    }
    const nuevoPlan = planes.find((p) => p.id_plan === nuevoIdPlan);
    const req = nuevoPlan ? clasesRequeridasDelPlan(nuevoPlan) : 0;
    if (idsHorarios.length > req) {
      setIdsHorarios([]);
    }
  };

  const guardar = () => {
    if (!idPlan) {
      toast.error("Seleccioná un plan.");
      return;
    }
    if (!idProfesora) {
      toast.error("Seleccioná un/a profesor/a.");
      return;
    }
    if (clasesRequeridas > 0 && idsHorarios.length !== clasesRequeridas) {
      toast.error(
        `Seleccioná ${clasesRequeridas} ${
          clasesRequeridas === 1 ? "horario" : "horarios"
        } para este plan.`,
      );
      return;
    }

    const mismosHorarios =
      idsHorarios.length === inscripcionActiva.horarios.length &&
      idsHorarios.every((id) => inscripcionActiva.horarios.some((h) => h.id_horario === id));

    if (mismoPlan && mismosHorarios) {
      toast.info("No hay cambios para guardar.");
      return;
    }
    if (mismoPlan && inscripcionActiva.estado !== "ACTIVA") {
      toast.error("Los horarios se cambian con la inscripción activa: primero tiene que registrar el primer pago.");
      return;
    }

    cambiar.mutate(
      {
        id_plan: idPlan,
        id_profesora: idProfesora,
        ids_horarios: idsHorarios,
      },
      {
        onSuccess: ({ programadoPara }) => {
          toast.success(
            programadoPara
              ? `Se programó el cambio de plan de ${nombre}: se aplica el ${fechaCalendarioCorta(programadoPara)}, al terminar la gracia de la cuota actual.`
              : `Se actualizaron el plan y horarios de ${nombre}`,
          );
          onClose();
        },
        onError: (err) => {
          toast.error(
            mensajeDeErrorApi(err, "No se pudo actualizar el plan y horarios."),
          );
        },
      },
    );
  };

  const cargando = cargandoPlanes || cargandoProfesoras || cargandoHorarios;

  if (!inscripcionElegida) {
    return (
      <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
        <DialogContent className={cn(CONTENIDO_MODAL, "max-w-md")}>
          <DialogHeader className={CABECERA_MODAL}>
            <DialogTitle className={TITULO_MODAL}>Cambiar plan y horarios</DialogTitle>
            <DialogDescription className={DESCRIPCION_MODAL}>
              {nombre} tiene {inscripcionesLista.length} planes activos. Elegí cuál querés modificar:
            </DialogDescription>
          </DialogHeader>
          <div className={cn(CUERPO_MODAL, "space-y-2")}>
            {inscripcionesLista.map((item) => (
              <button
                key={item.id_inscripcion}
                type="button"
                onClick={() => seleccionarInscripcion(item)}
                className="flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 dark:border-white/15 dark:hover:border-primary dark:hover:bg-primary/10"
              >
                <span className="text-sm font-bold text-slate-900 dark:text-white">{item.plan.nombre}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{item.profesora}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !cambiar.isPending) onClose();
      }}
    >
      <DialogContent className={cn(CONTENIDO_MODAL, "max-w-3xl")}>
        <DialogHeader className={CABECERA_MODAL}>
          <DialogTitle className={TITULO_MODAL}>
            Cambiar plan y horarios
          </DialogTitle>
          <DialogDescription className={DESCRIPCION_MODAL}>
            Para {nombre}. Seleccioná el plan, actividad, profesor/a y horarios.
          </DialogDescription>
        </DialogHeader>

        <div className={CUERPO_MODAL}>
          {(tienePlanVigente || inscripcionActiva.cambio_programado) && (
            <Alert className="rounded-xl border-slate-200 bg-slate-50 p-3 text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
              <AlertDescription className="text-xs font-medium leading-relaxed">
                {inscripcionActiva.cambio_programado
                  ? `Ya tiene programado el cambio a ${inscripcionActiva.cambio_programado.nombre_plan} para el ${fechaCalendarioCorta(inscripcionActiva.cambio_programado.fecha_aplicacion)}: uno nuevo lo reemplaza.`
                  : tieneGraciaVigente(inscripcionActiva)
                    ? "Con el plan vigente, el cambio de plan se aplica al terminar la gracia de la cuota actual. Cambiar solo los horarios es inmediato."
                    : "La cuota actual no está vigente: el cambio de plan se aplicará en el momento."}
              </AlertDescription>
            </Alert>
          )}

          {cargando ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="size-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-semibold">Cargando opciones disponibles...</p>
            </div>
          ) : (
            <Paso2PlanYHorarios
              planes={planes}
              profesoras={profesoras}
              horarios={horariosElegibles}
              idPlanSeleccionado={idPlan}
              onSeleccionarPlan={seleccionarPlan}
              idProfesoraSeleccionada={idProfesora}
              onSeleccionarProfesora={setIdProfesora}
              esSoloProfesora={mismoPlan}
              idsHorarios={idsHorarios}
              onToggleHorario={toggleHorario}
              onLimpiarHorarios={() => setIdsHorarios([])}
              clasesRequeridas={clasesRequeridas}
            />
          )}
        </div>

        <div className={cn(PIE_MODAL, "mt-2")}>
          <Button
            type="button"
            variant="outline"
            disabled={cambiar.isPending}
            onClick={onClose}
            className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={guardar}
            disabled={cambiar.isPending || cargando}
            className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
          >
            {cambiar.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
