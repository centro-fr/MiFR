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
import { CABECERA_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

interface Props {
  nombre: string;
  inscripcion: InscripcionDeAlumno;
  tienePlanVigente?: boolean;
  onClose: () => void;
}

const CINCO_MINUTOS = 5 * 60_000;

export function ModalCambiarPlan({
  nombre,
  inscripcion,
  tienePlanVigente = false,
  onClose,
}: Props) {
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
    idInscripcion: inscripcion.id_inscripcion,
    idPlan: inscripcion.plan.id_plan,
  });

  const [idPlan, setIdPlan] = useState<number | null>(inscripcion.plan.id_plan);
  const [idProfesora, setIdProfesora] = useState<number | null>(
    inscripcion.id_profesora,
  );
  const [idsHorarios, setIdsHorarios] = useState<number[]>(
    inscripcion.horarios.map((h) => h.id_horario),
  );
  const [fechaInicio, setFechaInicio] = useState<string>(
    inscripcion.fecha_inicio || "",
  );

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

  const seleccionarPlan = (nuevoIdPlan: number) => {
    setIdPlan(nuevoIdPlan);
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

    const mismoPlan = idPlan === inscripcion.plan.id_plan;
    const mismaProfesora = idProfesora === inscripcion.id_profesora;
    const mismosHorarios =
      idsHorarios.length === inscripcion.horarios.length &&
      idsHorarios.every((id) =>
        inscripcion.horarios.some((h) => h.id_horario === id),
      );

    if (mismoPlan && mismaProfesora && mismosHorarios) {
      toast.info("No hay cambios para guardar.");
      return;
    }

    cambiar.mutate(
      {
        id_plan: idPlan,
        id_profesora: idProfesora,
        ids_horarios: idsHorarios,
      },
      {
        onSuccess: () => {
          if (!mismoPlan && tienePlanVigente) {
            toast.success(
              `Se programó el cambio de plan para ${nombre}. Se aplicará cuando venza el plan actual.`,
            );
          } else {
            toast.success(`Se actualizaron el plan y horarios de ${nombre}`);
          }
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
          {tienePlanVigente && (
            <Alert className="rounded-xl border-blue-200 bg-blue-50/70 p-3 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
              <AlertDescription className="text-xs font-medium leading-relaxed">
                El alumno cuenta con un plan vigente. Al cambiar de plan, el cambio
                se aplicará automáticamente cuando venza el período actual.
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
              horarios={horarios}
              idPlanSeleccionado={idPlan}
              onSeleccionarPlan={seleccionarPlan}
              idProfesoraSeleccionada={idProfesora}
              onSeleccionarProfesora={setIdProfesora}
              esSoloProfesora={false}
              idsHorarios={idsHorarios}
              onToggleHorario={toggleHorario}
              onLimpiarHorarios={() => setIdsHorarios([])}
              clasesRequeridas={clasesRequeridas}
              fechaInicio={fechaInicio}
              onChangeFechaInicio={setFechaInicio}
            />
          )}
        </div>

        <div className={cn(PIE_MODAL, "-mx-6 -mb-5 mt-2")}>
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
