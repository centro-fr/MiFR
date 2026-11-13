import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface PlanElegidoState {
  /** Por alumno, el id_inscripcion que eligió ver; sin entrada = el de cuota más urgente. */
  porAlumno: Record<number, number>;
  elegirPlan: (idAlumno: number, idInscripcion: number) => void;
}

// Persiste en sessionStorage igual que alumno-elegido-store: la elección se mantiene al navegar
// entre Inicio, Clases y Perfil y al recargar la pestaña, sin mezclarse entre alumnos del tutor.
export const usePlanElegidoStore = create<PlanElegidoState>()(
  persist(
    (set) => ({
      porAlumno: {},
      elegirPlan: (idAlumno, idInscripcion) =>
        set((estado) => ({
          porAlumno: { ...estado.porAlumno, [idAlumno]: idInscripcion },
        })),
    }),
    { name: "mifr:plan-elegido", storage: createJSONStorage(() => sessionStorage) },
  ),
);

