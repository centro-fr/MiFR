// Las actividades que muestra la página pública. Están fijas en el front y no se piden a la API: así un
// visitante no despierta la API ni la base, y la página carga aunque la API esté dormida (US-32). Por eso
// un cambio de actividades o de días se hace acá y se publica el front.
//
// Provisorio: son las actividades de los datos de prueba del front (mocks/data/semilla.ts). Hay que
// reemplazarlas por las reales del centro antes de publicar.

export interface ActividadDelCentro {
  nombre: string;
  descripcion: string | null;
  modalidad: "GRUPAL" | "PERSONALIZADA";
  // De 1 (lunes) a 6 (sábado), en orden.
  dias: number[];
  horariosPorSemana: number;
}

const LUNES_A_VIERNES = [1, 2, 3, 4, 5];
const LUNES_MIERCOLES_Y_VIERNES = [1, 3, 5];
const MARTES_Y_JUEVES = [2, 4];

export const ACTIVIDADES_DEL_CENTRO: readonly ActividadDelCentro[] = [
  {
    nombre: "Funcional",
    descripcion: "Trabajo de fuerza y resistencia mediante movimientos que emulan gestos cotidianos",
    modalidad: "GRUPAL",
    dias: LUNES_A_VIERNES,
    horariosPorSemana: 13,
  },
  {
    nombre: "Acondicionamiento físico",
    descripcion: "Entrenamiento general orientado a mejorar la capacidad física y movilidad",
    modalidad: "GRUPAL",
    dias: LUNES_A_VIERNES,
    horariosPorSemana: 5,
  },
  {
    nombre: "Power",
    descripcion: "Entrenamiento de sobrecarga y fuerza muscular",
    modalidad: "GRUPAL",
    dias: LUNES_MIERCOLES_Y_VIERNES,
    horariosPorSemana: 3,
  },
  {
    nombre: "Personalizado",
    descripcion: "Sesión de preparación física individualizada con seguimiento personal",
    modalidad: "PERSONALIZADA",
    dias: LUNES_A_VIERNES,
    horariosPorSemana: 8,
  },
  {
    nombre: "HIIT",
    descripcion: "Entrenamiento interválico de alta intensidad",
    modalidad: "GRUPAL",
    dias: LUNES_A_VIERNES,
    horariosPorSemana: 8,
  },
  {
    nombre: "Training",
    descripcion: "Circuito de fuerza, acondicionamiento y potencia física",
    modalidad: "GRUPAL",
    dias: LUNES_MIERCOLES_Y_VIERNES,
    horariosPorSemana: 3,
  },
  {
    nombre: "Bootyband",
    descripcion: "Trabajo focalizado con bandas de resistencia en glúteos y piernas",
    modalidad: "GRUPAL",
    dias: MARTES_Y_JUEVES,
    horariosPorSemana: 2,
  },
  {
    nombre: "GAP",
    descripcion: "Enfocado en el trabajo de glúteos, abdominales y piernas",
    modalidad: "GRUPAL",
    dias: MARTES_Y_JUEVES,
    horariosPorSemana: 2,
  },
  {
    nombre: "Kid Fit",
    descripcion: "Entrenamiento motriz y lúdico para niños y jóvenes",
    modalidad: "GRUPAL",
    dias: MARTES_Y_JUEVES,
    horariosPorSemana: 2,
  },
  {
    nombre: "Combat",
    descripcion: "Entrenamiento cardiovascular inspirado en técnicas de combate",
    modalidad: "GRUPAL",
    dias: MARTES_Y_JUEVES,
    horariosPorSemana: 2,
  },
];
