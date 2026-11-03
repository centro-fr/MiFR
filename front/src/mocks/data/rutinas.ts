// Tablas rutinas y registros_progreso (con medidas_corporales) para el mock de US-27. Las fechas son
// AAAA-MM-DD, como las columnas DATE; el handler las responde como medianoche UTC, igual que el back.

interface EjercicioMock {
  nombre: string;
  series: number;
  repeticiones: string;
  notas: string | null;
}

export interface RutinaMock {
  id_rutina: number;
  id_alumno: number;
  id_profesora: number;
  nombre: string;
  fecha_desde: string;
  fecha_hasta: string | null;
  contenido: { dias: { nombre: string; ejercicios: EjercicioMock[] }[] };
  observaciones: string | null;
  activa: boolean;
}

export interface RegistroProgresoMock {
  id_registro: number;
  id_alumno: number;
  id_profesora: number;
  fecha: string;
  observaciones: string | null;
  medidas: { codigo: string; unidad: string; valor: number }[];
  fecha_modificacion: string | null;
  id_usuario_modifica: number | null;
  /** Baja lógica, como el back: deja de listarse y ya no se puede corregir. */
  dado_de_baja: boolean;
}

const ejercicio = (nombre: string, series: number, repeticiones: string, notas: string | null = null): EjercicioMock => ({
  nombre,
  series,
  repeticiones,
  notas,
});

// Valentina Herrera (alumno 3, de Lucía) tiene historial completo; Martín Morales (alumno 13, de
// Marina) solo la medición de la pre-inscripción y ninguna rutina. Para US-28, que se prueba entrando
// como alumno o tutor: Camila Pérez (alumno 4, usuaria de prueba) tiene rutina y dos mediciones, y
// Lucía Benítez (alumno 12, menor a cargo de la tutora Mariana López) solo rutina. El resto, nada.
export function rutinasSemilla(): RutinaMock[] {
  return [
    {
      id_rutina: 3,
      id_alumno: 4,
      id_profesora: 1,
      nombre: "Tonificación",
      fecha_desde: "2026-09-01",
      fecha_hasta: null,
      contenido: {
        dias: [
          { nombre: "Día 1 · Tren inferior", ejercicios: [ejercicio("Sentadilla búlgara", 3, "10", "Con mancuernas de 4 kg"), ejercicio("Puente de glúteos", 3, "15")] },
          { nombre: "Día 2 · Tren superior", ejercicios: [ejercicio("Flexiones de brazos", 3, "8-10", "Apoyando las rodillas"), ejercicio("Plancha lateral", 3, "20 s")] },
        ],
      },
      observaciones: "Tomate un minuto de pausa entre series.",
      activa: true,
    },
    {
      id_rutina: 4,
      id_alumno: 12,
      id_profesora: 2,
      nombre: "Coordinación",
      fecha_desde: "2026-10-01",
      fecha_hasta: "2026-12-15",
      contenido: {
        dias: [{ nombre: "Circuito", ejercicios: [ejercicio("Saltos a la soga", 3, "30 s"), ejercicio("Escalera de coordinación", 4, "2 pasadas")] }],
      },
      observaciones: null,
      activa: true,
    },
    {
      id_rutina: 1,
      id_alumno: 3,
      id_profesora: 1,
      nombre: "Adaptación",
      fecha_desde: "2026-06-01",
      fecha_hasta: "2026-09-30",
      contenido: {
        dias: [
          { nombre: "Día 1 · Cuerpo completo", ejercicios: [ejercicio("Sentadilla con peso corporal", 3, "15"), ejercicio("Plancha", 3, "20 s")] },
          { nombre: "Día 2 · Cardio", ejercicios: [ejercicio("Bicicleta fija", 1, "20 min", "Ritmo suave")] },
        ],
      },
      observaciones: null,
      activa: false,
    },
    {
      id_rutina: 2,
      id_alumno: 3,
      id_profesora: 1,
      nombre: "Fuerza – etapa 1",
      fecha_desde: "2026-10-01",
      fecha_hasta: "2026-11-30",
      contenido: {
        dias: [
          {
            nombre: "Día 1 · Piernas",
            ejercicios: [ejercicio("Sentadilla", 4, "12", "20 kg"), ejercicio("Peso muerto", 3, "10", "25 kg"), ejercicio("Estocadas", 3, "10", "6 kg por mano")],
          },
          {
            nombre: "Día 2 · Tren superior",
            ejercicios: [ejercicio("Remo con mancuerna", 3, "12", "8 kg"), ejercicio("Press de hombros", 3, "8-10", "5 kg"), ejercicio("Plancha", 3, "40 s")],
          },
        ],
      },
      observaciones: "Si te molesta la rodilla, bajá el peso en la sentadilla.",
      activa: true,
    },
  ];
}

export function registrosProgresoSemilla(): RegistroProgresoMock[] {
  const peso = (valor: number) => ({ codigo: "PESO", unidad: "kg", valor });
  const cm = (codigo: string, valor: number) => ({ codigo, unidad: "cm", valor });
  const sinCorregir = { fecha_modificacion: null, id_usuario_modifica: null, dado_de_baja: false };
  return [
    { id_registro: 1, id_alumno: 3, id_profesora: 1, fecha: "2026-03-02", observaciones: "Medición inicial", medidas: [peso(64), cm("TALLA", 165), cm("CINTURA", 77)] },
    { id_registro: 2, id_alumno: 3, id_profesora: 1, fecha: "2026-05-04", observaciones: null, medidas: [peso(63.6), cm("CINTURA", 76)] },
    { id_registro: 3, id_alumno: 3, id_profesora: 1, fecha: "2026-07-06", observaciones: null, medidas: [peso(63.1), cm("CINTURA", 75.5)] },
    {
      id_registro: 4,
      id_alumno: 3,
      id_profesora: 1,
      fecha: "2026-10-14",
      observaciones: "Tomada en ayunas",
      medidas: [peso(62.4), cm("CINTURA", 74), cm("CADERA", 96)],
    },
    { id_registro: 5, id_alumno: 13, id_profesora: 3, fecha: "2026-09-15", observaciones: null, medidas: [peso(81.2), cm("TALLA", 178)] },
    { id_registro: 6, id_alumno: 4, id_profesora: 1, fecha: "2026-09-01", observaciones: null, medidas: [peso(58.5), cm("CINTURA", 70)] },
    { id_registro: 7, id_alumno: 4, id_profesora: 1, fecha: "2026-10-20", observaciones: null, medidas: [peso(57.8), cm("CINTURA", 68.5)] },
  ].map((registro) => ({ ...registro, ...sinCorregir }));
}
