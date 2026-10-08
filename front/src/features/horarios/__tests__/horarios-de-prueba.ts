import type { HorarioApi, ProfesoraApi } from "@/features/horarios/schemas/horario";
import type { ActividadApi } from "@/features/actividades/schemas/actividad";
import type { Horario } from "@/types/horarios";

let contadorIdHorario = 1;

export function crearActividad(overrides?: Partial<ActividadApi>): ActividadApi {
  return {
    id_actividad: 1,
    codigo: "FUNCIONAL",
    nombre: "Funcional Grupal",
    descripcion: "Entrenamiento funcional de alta intensidad",
    modalidad: "GRUPAL",
    cupo_maximo: null,
    activo: true,
    ...overrides,
  };
}

export function crearProfesora(overrides?: Partial<ProfesoraApi>): ProfesoraApi {
  return {
    id_profesora: 1,
    id_usuario: 10,
    especialidad: "Entrenamiento Grupal",
    fecha_alta: new Date().toISOString(),
    fecha_baja: null,
    usuario: { nombre: "Lucía", apellido: "Gómez" },
    ...overrides,
  };
}

export function crearHorario(overrides?: Partial<HorarioApi>): HorarioApi {
  const actividadMock = crearActividad(overrides?.actividad);
  const profesoraMock = crearProfesora(overrides?.profesora);

  return {
    id_horario: overrides?.id_horario ?? contadorIdHorario++,
    id_actividad: overrides?.id_actividad ?? actividadMock.id_actividad,
    id_profesora: overrides?.id_profesora ?? profesoraMock.id_profesora,
    dia_semana: 1, // Lunes
    hora_inicio: "10:00",
    hora_fin: "11:00",
    cupo_maximo: null, // Sin cupo propio
    fecha_alta: new Date().toISOString(),
    fecha_baja: null,
    actividad: actividadMock,
    profesora: profesoraMock,
    cupo_maximo_efectivo: overrides?.cupo_maximo ?? actividadMock.cupo_maximo,
    ...overrides,
  };
}

// Modelo de dominio del Frontend (camelCase), listo para inyectar en componentes visuales.
// Evita duplicar esta función en cada test de componente.
export function crearHorarioFrontend(overrides?: Partial<Horario>): Horario {
  return {
    id: "1",
    actividadId: "1",
    actividadNombre: "Funcional Grupal",
    actividadTipo: "GRUPAL",
    profesoraId: "1",
    profesoraNombre: "Lucía Gómez",
    tema: {
      primary: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-200",
      badgeBg: "bg-blue-100",
      badgeText: "text-blue-800",
    },
    diaSemana: "LUNES",
    horaInicio: "10:00",
    horaFin: "11:00",
    cupoPropio: null,
    cupoMaximo: 15,
    ...overrides,
  };
}
