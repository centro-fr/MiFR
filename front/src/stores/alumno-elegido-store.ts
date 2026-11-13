import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AlumnoElegidoState {
  /** El menor que eligió ver el tutor; null hasta que elige (se muestra el primero). */
  idAlumnoElegido: number | null;
  elegirAlumno: (idAlumno: number) => void;
}

// El tutor elige una vez de quién ver los datos y la elección sigue al pasar de Inicio a Clases, Rutina,
// Ranking o Perfil, y al recargar la pestaña. Si el id ya no es de sus alumnos, se muestra el primero.
export const useAlumnoElegidoStore = create<AlumnoElegidoState>()(
  persist(
    (set) => ({
      idAlumnoElegido: null,
      elegirAlumno: (idAlumno) => set({ idAlumnoElegido: idAlumno }),
    }),
    { name: "mifr:alumno-elegido", storage: createJSONStorage(() => sessionStorage) },
  ),
);
