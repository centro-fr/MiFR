import { toast } from "sonner";
import {
  CargandoOpciones,
  DialogoPlanYHorarios,
  ErrorOpciones,
  FormularioPlanYHorarios,
} from "@/features/alumnos/components/formulario-plan-y-horarios";
import { useCambiarPlanYHorarios, useOpcionesDeInscripcion } from "@/features/alumnos/hooks/use-reactivacion";
import type { ReactivacionFormValues } from "@/features/alumnos/schemas/reactivacion";
import type { InscripcionDeAlumno } from "@/features/alumnos/schemas/alumno";

interface Props {
  nombre: string;
  inscripcion: InscripcionDeAlumno;
  onClose: () => void;
}

const mismosElementos = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

// Cambio de plan u horarios desde la ficha (solo la propietaria). Con el mismo plan, el back solo
// deja cambiar los horarios: la profesora a cargo queda igual. Las cuotas ya cobradas no cambian.
export function ModalCambiarPlan({ nombre, inscripcion, onClose }: Props) {
  const { datos, error, reintentar } = useOpcionesDeInscripcion();
  const cambiar = useCambiarPlanYHorarios({ idInscripcion: inscripcion.id_inscripcion, idPlan: inscripcion.plan.id_plan });
  const actual = {
    idPlan: String(inscripcion.plan.id_plan),
    idProfesora: String(inscripcion.id_profesora),
    idsHorarios: inscripcion.horarios.map(({ id_horario }) => String(id_horario)),
  };

  const validarAdemas = ({ idPlan, idProfesora, idsHorarios }: ReactivacionFormValues) => {
    if (idPlan !== actual.idPlan) return null;
    if (idProfesora !== actual.idProfesora) {
      return { idProfesora: "Con el mismo plan solo se cambian los horarios: para cambiar de profesora, cambiá también el plan." };
    }
    return mismosElementos(idsHorarios, actual.idsHorarios) ? { idsHorarios: "No hay cambios para guardar." } : null;
  };

  return (
    <DialogoPlanYHorarios
      titulo={`Cambiar plan u horarios de ${nombre}`}
      descripcion="Las cuotas ya cobradas no se modifican: el plan nuevo rige para las próximas."
      procesando={cambiar.isPending}
      onClose={onClose}
    >
      {datos ? (
        <FormularioPlanYHorarios
          opciones={datos}
          propuesta={actual}
          validarAdemas={validarAdemas}
          textoConfirmar="Guardar cambios"
          textoProcesando="Guardando..."
          procesando={cambiar.isPending}
          error={cambiar.error}
          onClose={onClose}
          onConfirm={(cuerpo) =>
            cambiar.mutate(cuerpo, {
              onSuccess: () => {
                toast.success(`Se actualizó la inscripción de ${nombre}`);
                onClose();
              },
            })
          }
        />
      ) : error ? (
        <ErrorOpciones error={error} onReintentar={reintentar} />
      ) : (
        <CargandoOpciones />
      )}
    </DialogoPlanYHorarios>
  );
}
