import { usePlanElegidoStore } from "@/stores/plan-elegido-store";
import { usePanelAlumno } from "./use-panel-alumno";
import { planAMostrar, vistaDelPlan } from "../utils/plan-del-panel";

/**
 * Plan activo del alumno en el portal: el que eligió o, por defecto, el de cuota más urgente.
 * Expone además la vista filtrada (próximas clases e historial) y `elegirPlan`.
 */
export function usePlanElegido() {
  const consulta = usePanelAlumno();
  const panel = consulta.data;
  const idAlumno = panel?.id_alumno;
  const idGuardado = usePlanElegidoStore((estado) => (idAlumno ? estado.porAlumno[idAlumno] : undefined));
  const guardar = usePlanElegidoStore((estado) => estado.elegirPlan);

  const planes = panel?.planes ?? [];
  const elegido = planAMostrar(planes, idGuardado);
  const vista = panel ? vistaDelPlan(panel, elegido?.id_inscripcion) : undefined;
  const elegirPlan = (idInscripcion: number) => {
    if (idAlumno) guardar(idAlumno, idInscripcion);
  };

  return { consulta, planes, elegido, vista, elegirPlan };
}

