import type { HorarioDTO, DiaSemana, TipoActividad } from '../../types/horarios';
import { MOCK_HORARIOS_INICIALES, MOCK_ACTIVIDADES, MOCK_PROFESORAS } from '../mock-horarios-data';

// ============================================================================
// CONTRATO Y TIPOS DE LA API DE HORARIOS (/api/v1/horarios)
// ============================================================================

export interface ApiResponse<T> {
  status: number;
  data?: T;
  error?: string;
  meta?: {
    alumnos_desvinculados?: number;
    mensaje?: string;
  };
}

export interface HorarioInputPayload {
  id_actividad: string;
  id_profesora: string;
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo?: number | null;
  confirmar_reestructuracion?: boolean;
}

export interface HorarioRecord extends HorarioDTO {
  id_horario: string;
  actividad_nombre?: string;
  profesora_nombre?: string;
  fecha_alta: string;
  fecha_baja?: string | null;
}

// ============================================================================
// BASE DE DATOS EN MEMORIA (IN-MEMORY PERSISTENCE)
// ============================================================================

const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const haySolapamiento = (
  inicio1: string,
  fin1: string,
  inicio2: string,
  fin2: string
): boolean => {
  const i1 = timeToMinutes(inicio1);
  const f1 = timeToMinutes(fin1);
  const i2 = timeToMinutes(inicio2);
  const f2 = timeToMinutes(fin2);
  return i1 < f2 && i2 < f1;
};

// Semilla inicial a partir de MOCK_HORARIOS_INICIALES
const inicializarDb = (): HorarioRecord[] => {
  return MOCK_HORARIOS_INICIALES.map((h) => ({
    id_horario: h.id,
    id_actividad: h.actividadId,
    id_profesora: h.profesoraId,
    dia_semana: h.diaSemana,
    hora_inicio: h.horaInicio,
    hora_fin: h.horaFin,
    cupo_maximo: h.cupoMaximo,
    tipo_actividad: h.actividadTipo,
    inscriptos_actuales: h.inscriptosActuales,
    inscriptos: h.inscriptosActuales,
    actividad_nombre: h.actividadNombre,
    profesora_nombre: h.profesoraNombre,
    fecha_alta: new Date().toISOString(),
    fecha_baja: null,
  }));
};

let inMemoryHorarios: HorarioRecord[] = inicializarDb();

export const resetHorariosMockDb = (): void => {
  inMemoryHorarios = inicializarDb();
};

export const getHorariosMockDb = (): HorarioRecord[] => {
  return [...inMemoryHorarios];
};

// ============================================================================
// CONTROLADORES SEMÁNTICOS (HANDLERS SIMULADOS CON PERSISTENCIA)
// ============================================================================

/**
 * GET /api/v1/horarios
 * Retorna todos los horarios activos con filtros opcionales.
 */
export const getHorariosHandler = (queryParams?: {
  id_actividad?: string;
  id_profesora?: string;
  dia_semana?: DiaSemana;
}): ApiResponse<HorarioRecord[]> => {
  let activos = inMemoryHorarios.filter((h) => !h.fecha_baja);

  if (queryParams?.id_actividad && queryParams.id_actividad !== 'TODAS') {
    activos = activos.filter((h) => h.id_actividad === queryParams.id_actividad);
  }
  if (queryParams?.id_profesora && queryParams.id_profesora !== 'TODAS') {
    activos = activos.filter((h) => h.id_profesora === queryParams.id_profesora);
  }
  if (queryParams?.dia_semana && queryParams.dia_semana !== ('TODOS' as DiaSemana)) {
    activos = activos.filter((h) => h.dia_semana === queryParams.dia_semana);
  }

  return {
    status: 200,
    data: activos,
  };
};

/**
 * POST /api/v1/horarios
 * Crea un horario con validación preventiva de solapamientos.
 */
export const postHorarioHandler = (
  payload: HorarioInputPayload
): ApiResponse<HorarioRecord> => {
  // 1. Validar rango permitido [07:00, 20:00]
  if (payload.hora_inicio < '07:00' || payload.hora_fin > '20:00' || payload.hora_fin <= payload.hora_inicio) {
    return {
      status: 400,
      error: 'Rango de horario inválido: debe estar comprendido entre las 07:00 y las 20:00 hs con hora_fin > hora_inicio.',
    };
  }

  const activos = inMemoryHorarios.filter((h) => !h.fecha_baja);

  // 2. Validar solapamiento de profesora en el mismo día (409 Conflict)
  const solapamientoProf = activos.find(
    (h) =>
      h.id_profesora === payload.id_profesora &&
      h.dia_semana === payload.dia_semana &&
      haySolapamiento(h.hora_inicio, h.hora_fin, payload.hora_inicio, payload.hora_fin)
  );
  if (solapamientoProf) {
    return {
      status: 409,
      error: `Conflicto 409: La profesora ya tiene asignada la clase "${solapamientoProf.actividad_nombre}" el ${solapamientoProf.dia_semana} de ${solapamientoProf.hora_inicio} a ${solapamientoProf.hora_fin} hs.`,
    };
  }

  // 3. Validar solapamiento de salón único (409 Conflict)
  const solapamientoSalon = activos.find(
    (h) =>
      h.dia_semana === payload.dia_semana &&
      haySolapamiento(h.hora_inicio, h.hora_fin, payload.hora_inicio, payload.hora_fin)
  );
  if (solapamientoSalon) {
    return {
      status: 409,
      error: `Conflicto 409: El salón ya se encuentra ocupado el ${solapamientoSalon.dia_semana} de ${solapamientoSalon.hora_inicio} a ${solapamientoSalon.hora_fin} hs por "${solapamientoSalon.actividad_nombre}".`,
    };
  }

  const actividad = MOCK_ACTIVIDADES.find((a) => a.id === payload.id_actividad);
  const profesora = MOCK_PROFESORAS.find((p) => p.id === payload.id_profesora);

  if (!actividad || !profesora) {
    return {
      status: 404,
      error: 'Actividad o profesora no encontrada en el sistema.',
    };
  }

  const nuevoId = `hor-${Date.now()}`;
  const nuevoHorario: HorarioRecord = {
    id_horario: nuevoId,
    id_actividad: actividad.id,
    id_profesora: profesora.id,
    dia_semana: payload.dia_semana,
    hora_inicio: payload.hora_inicio,
    hora_fin: payload.hora_fin,
    cupo_maximo: payload.cupo_maximo || actividad.cupoMaximoBase || 15,
    tipo_actividad: actividad.tipo as TipoActividad,
    inscriptos_actuales: 0,
    inscriptos: 0,
    actividad_nombre: actividad.nombre,
    profesora_nombre: `${profesora.nombre} ${profesora.apellido}`,
    fecha_alta: new Date().toISOString(),
    fecha_baja: null,
  };

  inMemoryHorarios.push(nuevoHorario);

  return {
    status: 201,
    data: nuevoHorario,
  };
};

/**
 * PUT /api/v1/horarios/:id
 * Modifica un horario existente contemplando reglas de reestructuración crítica.
 */
export const putHorarioHandler = (
  id_horario: string,
  payload: HorarioInputPayload
): ApiResponse<HorarioRecord> => {
  const index = inMemoryHorarios.findIndex((h) => h.id_horario === id_horario && !h.fecha_baja);
  if (index === -1) {
    return {
      status: 404,
      error: `Horario con ID "${id_horario}" no encontrado.`,
    };
  }

  const horarioActual = inMemoryHorarios[index];

  // 1. Validar rango operativo
  if (payload.hora_inicio < '07:00' || payload.hora_fin > '20:00' || payload.hora_fin <= payload.hora_inicio) {
    return {
      status: 400,
      error: 'Horario inválido: debe estar entre las 07:00 y las 20:00 hs con hora_fin > hora_inicio.',
    };
  }

  const otrosActivos = inMemoryHorarios.filter((h) => !h.fecha_baja && h.id_horario !== id_horario);

  // 2. Validar colisión de profesora (409 Conflict)
  const colisionProf = otrosActivos.find(
    (h) =>
      h.id_profesora === payload.id_profesora &&
      h.dia_semana === payload.dia_semana &&
      haySolapamiento(h.hora_inicio, h.hora_fin, payload.hora_inicio, payload.hora_fin)
  );
  if (colisionProf) {
    return {
      status: 409,
      error: `Conflicto 409: La profesora ya dicta "${colisionProf.actividad_nombre}" el ${colisionProf.dia_semana} de ${colisionProf.hora_inicio} a ${colisionProf.hora_fin} hs.`,
    };
  }

  // 3. Validar colisión de salón único (409 Conflict)
  const colisionSalon = otrosActivos.find(
    (h) =>
      h.dia_semana === payload.dia_semana &&
      haySolapamiento(h.hora_inicio, h.hora_fin, payload.hora_inicio, payload.hora_fin)
  );
  if (colisionSalon) {
    return {
      status: 409,
      error: `Conflicto 409: Salón ocupado el ${colisionSalon.dia_semana} de ${colisionSalon.hora_inicio} a ${colisionSalon.hora_fin} hs por "${colisionSalon.actividad_nombre}".`,
    };
  }

  // 4. Regla crítica de Reestructuración (US-04 / US-11)
  const cambioDisciplina = payload.id_actividad !== horarioActual.id_actividad;
  const cambioProfesora = payload.id_profesora !== horarioActual.id_profesora;
  const inscriptosPrevios = horarioActual.inscriptos_actuales ?? horarioActual.inscriptos ?? 0;
  const esReestructuracionCritica = (cambioDisciplina || cambioProfesora) && inscriptosPrevios > 0;

  if (esReestructuracionCritica && !payload.confirmar_reestructuracion) {
    return {
      status: 422,
      error: `Reestructuración crítica no confirmada: la clase posee ${inscriptosPrevios} alumno(s) inscripto(s). Modificar la disciplina o la profesora requiere confirmación explícita para desvincular a los alumnos sin afectar su plan.`,
    };
  }

  const actividad = MOCK_ACTIVIDADES.find((a) => a.id === payload.id_actividad);
  const profesora = MOCK_PROFESORAS.find((p) => p.id === payload.id_profesora);

  if (!actividad || !profesora) {
    return {
      status: 404,
      error: 'Actividad o profesora no encontrada.',
    };
  }

  // Si se confirmó la reestructuración, los alumnos pasan a 0 (desvinculados a "sin horario asignado")
  const inscriptosFinales = esReestructuracionCritica && payload.confirmar_reestructuracion ? 0 : inscriptosPrevios;
  const alumnosDesvinculados = esReestructuracionCritica ? inscriptosPrevios : 0;

  const horarioActualizado: HorarioRecord = {
    ...horarioActual,
    id_actividad: actividad.id,
    id_profesora: profesora.id,
    dia_semana: payload.dia_semana,
    hora_inicio: payload.hora_inicio,
    hora_fin: payload.hora_fin,
    cupo_maximo: payload.cupo_maximo || actividad.cupoMaximoBase || 15,
    tipo_actividad: actividad.tipo as TipoActividad,
    inscriptos_actuales: inscriptosFinales,
    inscriptos: inscriptosFinales,
    actividad_nombre: actividad.nombre,
    profesora_nombre: `${profesora.nombre} ${profesora.apellido}`,
  };

  inMemoryHorarios[index] = horarioActualizado;

  return {
    status: 200,
    data: horarioActualizado,
    meta: {
      alumnos_desvinculados: alumnosDesvinculados,
      mensaje: alumnosDesvinculados > 0
        ? `Horario reestructurado exitosamente. ${alumnosDesvinculados} alumnos quedaron sin horario asignado para reubicación.`
        : 'Horario actualizado exitosamente.',
    },
  };
};

/**
 * DELETE /api/v1/horarios/:id
 * Aplica baja lógica de horario y reporta alumnos desvinculados para reubicación.
 */
export const deleteHorarioHandler = (
  id_horario: string
): ApiResponse<{ id_horario: string; fecha_baja: string }> => {
  const index = inMemoryHorarios.findIndex((h) => h.id_horario === id_horario && !h.fecha_baja);
  if (index === -1) {
    return {
      status: 404,
      error: `Horario con ID "${id_horario}" no encontrado o ya dado de baja.`,
    };
  }

  const horario = inMemoryHorarios[index];
  const inscriptos = horario.inscriptos_actuales ?? horario.inscriptos ?? 0;
  const fecha_baja = new Date().toISOString();

  // Baja lógica segura
  inMemoryHorarios[index] = {
    ...horario,
    fecha_baja,
  };

  return {
    status: 200,
    data: {
      id_horario,
      fecha_baja,
    },
    meta: {
      alumnos_desvinculados: inscriptos,
      mensaje: inscriptos > 0
        ? `Horario dado de baja. ${inscriptos} alumno(s) quedaron desvinculados para reubicación en su plan.`
        : 'Horario dado de baja correctamente.',
    },
  };
};

// ============================================================================
// SIMULADOR DE API HTTP (MSW / REST DISPATCHER)
// ============================================================================

export const mockHorariosApi = {
  getHorarios: (params?: { id_actividad?: string; id_profesora?: string; dia_semana?: DiaSemana }) =>
    getHorariosHandler(params),
  createHorario: (payload: HorarioInputPayload) =>
    postHorarioHandler(payload),
  updateHorario: (id: string, payload: HorarioInputPayload) =>
    putHorarioHandler(id, payload),
  deleteHorario: (id: string) =>
    deleteHorarioHandler(id),
};
