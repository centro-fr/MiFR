import { useState, useMemo, useCallback } from 'react';
import type { Horario, HorarioFormData, DiaSemana, Profesora, ProfesoraColorTheme, SaveHorarioOptions } from '../../../types/horarios';
import { MOCK_HORARIOS_INICIALES, MOCK_ACTIVIDADES, MOCK_PROFESORAS, THEME_DEFAULT } from '../../../mocks/mock-horarios-data';

// Helper para convertir "HH:mm" a minutos desde las 00:00
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Verifica solapamiento estricto de intervalos semicerrados [inicio, fin)
// Dos intervalos [i1, f1) y [i2, f2) se superponen si y solo si: (i1 < f2) && (i2 < f1)
export const haySolapamiento = (
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

// Validar que el horario esté dentro del rango permitido 07:00 a 20:00
export const estaEnRangoPermitido = (inicio: string, fin: string): boolean => {
  const MIN_LIMIT = timeToMinutes('07:00'); // 420 mins
  const MAX_LIMIT = timeToMinutes('20:00'); // 1200 mins
  const i = timeToMinutes(inicio);
  const f = timeToMinutes(fin);
  return i >= MIN_LIMIT && f <= MAX_LIMIT && f > i;
};

// Validar solapamiento de una misma profesora (US-04: una profesora no puede dictar dos clases a la vez)
export const validarSolapamientoProfesoraEnLista = (
  horarios: Horario[],
  profesoraId: string,
  dia: DiaSemana,
  horaInicio: string,
  horaFin: string,
  ignoreHorarioId?: string
): Horario | undefined => {
  return horarios.find((h) => {
    if (ignoreHorarioId && h.id === ignoreHorarioId) return false;
    if (h.profesoraId !== profesoraId) return false;
    if (h.diaSemana !== dia) return false;
    return haySolapamiento(h.horaInicio, h.horaFin, horaInicio, horaFin);
  });
};

// Validar solapamiento en el salón único (Regla del negocio MiFR: único salón de entrenamiento)
// Ninguna clase puede superponerse en el mismo día y rango horario, sin importar profesora ni actividad.
export const validarSolapamientoSalonEnLista = (
  horarios: Horario[],
  dia: DiaSemana,
  horaInicio: string,
  horaFin: string,
  ignoreHorarioId?: string
): Horario[] => {
  return horarios.filter((h) => {
    if (ignoreHorarioId && h.id === ignoreHorarioId) return false;
    if (h.diaSemana !== dia) return false;
    return haySolapamiento(h.horaInicio, h.horaFin, horaInicio, horaFin);
  });
};

// Mover un horario a un nuevo día y hora de inicio (manteniendo su duración)
// Soporta ajuste inteligente para clases multislot si el inicio directo colisiona pero el fin cabe sin conflicto
export const moverHorarioEnLista = (
  horarios: Horario[],
  horarioId: string,
  nuevoDia: DiaSemana,
  nuevaHoraInicio: string,
  opciones?: { slotFin?: string }
): { ok: boolean; error?: string; horariosActualizados?: Horario[] } => {
  const target = horarios.find((h) => h.id === horarioId);
  if (!target) return { ok: false, error: 'Horario no encontrado.' };

  const duracionMinutos = timeToMinutes(target.horaFin) - timeToMinutes(target.horaInicio);

  const evaluarPosicion = (inicioStr: string) => {
    const inicioM = timeToMinutes(inicioStr);
    const finM = inicioM + duracionMinutos;
    const finStr = `${Math.floor(finM / 60)
      .toString()
      .padStart(2, '0')}:${(finM % 60).toString().padStart(2, '0')}`;

    if (!estaEnRangoPermitido(inicioStr, finStr)) {
      return {
        ok: false as const,
        error: `El horario resultante (${inicioStr} - ${finStr} hs) excede el horario operativo permitido (07:00 a 20:00 hs).`,
      };
    }

    const solapProf = validarSolapamientoProfesoraEnLista(
      horarios,
      target.profesoraId,
      nuevoDia,
      inicioStr,
      finStr,
      target.id
    );
    if (solapProf) {
      return {
        ok: false as const,
        error: `La profesora ${solapProf.profesoraNombre} ya dicta una clase el ${solapProf.diaSemana} de ${solapProf.horaInicio} a ${solapProf.horaFin} hs.`,
      };
    }

    const solapSalon = validarSolapamientoSalonEnLista(
      horarios,
      nuevoDia,
      inicioStr,
      finStr,
      target.id
    );
    if (solapSalon.length > 0) {
      const conf = solapSalon[0];
      return {
        ok: false as const,
        error: `El salón ya está ocupado por "${conf.actividadNombre}" el ${conf.diaSemana} de ${conf.horaInicio} a ${conf.horaFin} hs.`,
      };
    }

    return { ok: true as const, inicioStr, finStr };
  };

  // 1. Probar posicionamiento tomando la celda como inicio
  let resultado = evaluarPosicion(nuevaHoraInicio);

  // 2. Si la clase dura más de 1 slot y el inicio choca, probar alinear el final al slotFin (desplazamiento suave)
  if (!resultado.ok && opciones?.slotFin && duracionMinutos > 60) {
    const finSlotM = timeToMinutes(opciones.slotFin);
    const inicioAlineadoM = finSlotM - duracionMinutos;
    if (inicioAlineadoM >= timeToMinutes('07:00')) {
      const inicioAlineadoStr = `${Math.floor(inicioAlineadoM / 60)
        .toString()
        .padStart(2, '0')}:${(inicioAlineadoM % 60).toString().padStart(2, '0')}`;
      const resultadoAlineado = evaluarPosicion(inicioAlineadoStr);
      if (resultadoAlineado.ok) {
        resultado = resultadoAlineado;
      }
    }
  }

  if (!resultado.ok) {
    return { ok: false, error: resultado.error };
  }

  const { inicioStr, finStr } = resultado;

  // Generar lista actualizada en borrador
  const horariosActualizados = horarios.map((h) =>
    h.id === target.id
      ? {
          ...h,
          diaSemana: nuevoDia,
          dia_semana: nuevoDia,
          horaInicio: inicioStr,
          hora_inicio: inicioStr,
          horaFin: finStr,
          hora_fin: finStr,
        }
      : h
  );

  return { ok: true, horariosActualizados };
};

// Intercambiar (Swap) dos horarios entre sí
export const intercambiarHorariosEnLista = (
  horarios: Horario[],
  idA: string,
  idB: string
): { ok: boolean; error?: string; horariosActualizados?: Horario[] } => {
  if (idA === idB) return { ok: true, horariosActualizados: horarios };

  const a = horarios.find((h) => h.id === idA);
  const b = horarios.find((h) => h.id === idB);
  if (!a || !b) return { ok: false, error: 'Uno o ambos horarios a intercambiar no existen.' };

  const durA = timeToMinutes(a.horaFin) - timeToMinutes(a.horaInicio);
  const durB = timeToMinutes(b.horaFin) - timeToMinutes(b.horaInicio);

  const nuevoDiaA = b.diaSemana;
  const nuevaHoraInicioA = b.horaInicio;
  const finMinsA = timeToMinutes(nuevaHoraInicioA) + durA;
  const nuevaHoraFinA = `${Math.floor(finMinsA / 60)
    .toString()
    .padStart(2, '0')}:${(finMinsA % 60).toString().padStart(2, '0')}`;

  const nuevoDiaB = a.diaSemana;
  const nuevaHoraInicioB = a.horaInicio;
  const finMinsB = timeToMinutes(nuevaHoraInicioB) + durB;
  const nuevaHoraFinB = `${Math.floor(finMinsB / 60)
    .toString()
    .padStart(2, '0')}:${(finMinsB % 60).toString().padStart(2, '0')}`;

  if (!estaEnRangoPermitido(nuevaHoraInicioA, nuevaHoraFinA) || !estaEnRangoPermitido(nuevaHoraInicioB, nuevaHoraFinB)) {
    return { ok: false, error: 'El intercambio excede el rango operativo permitido (07:00 a 20:00 hs).' };
  }

  // Lista excluyendo A y B para validar solapamientos externos
  const otrosSinAyB = horarios.filter((h) => h.id !== a.id && h.id !== b.id);

  // Validar si la profesora de A colisiona en el nuevo horario
  const solapProfA = validarSolapamientoProfesoraEnLista(
    otrosSinAyB,
    a.profesoraId,
    nuevoDiaA,
    nuevaHoraInicioA,
    nuevaHoraFinA
  );
  if (solapProfA) {
    return {
      ok: false,
      error: `Conflicto en intercambio: La profesora ${a.profesoraNombre} ya dicta otra clase en ese horario.`,
    };
  }

  // Validar si la profesora de B colisiona en el nuevo horario
  const solapProfB = validarSolapamientoProfesoraEnLista(
    otrosSinAyB,
    b.profesoraId,
    nuevoDiaB,
    nuevaHoraInicioB,
    nuevaHoraFinB
  );
  if (solapProfB) {
    return {
      ok: false,
      error: `Conflicto en intercambio: La profesora ${b.profesoraNombre} ya dicta otra clase en ese horario.`,
    };
  }

  // Validar salón para A
  const solapSalonA = validarSolapamientoSalonEnLista(otrosSinAyB, nuevoDiaA, nuevaHoraInicioA, nuevaHoraFinA);
  if (solapSalonA.length > 0) {
    return {
      ok: false,
      error: `Conflicto de salón: El horario de ${a.actividadNombre} colisiona con otra clase existente.`,
    };
  }

  // Validar salón para B
  const solapSalonB = validarSolapamientoSalonEnLista(otrosSinAyB, nuevoDiaB, nuevaHoraInicioB, nuevaHoraFinB);
  if (solapSalonB.length > 0) {
    return {
      ok: false,
      error: `Conflicto de salón: El horario de ${b.actividadNombre} colisiona con otra clase existente.`,
    };
  }

  // Si los nuevos slots de A y B se solapan entre sí (por ejemplo, si tenían duraciones distintas y se superponen):
  if (nuevoDiaA === nuevoDiaB && haySolapamiento(nuevaHoraInicioA, nuevaHoraFinA, nuevaHoraInicioB, nuevaHoraFinB)) {
    return {
      ok: false,
      error: 'Conflicto de duración: los horarios intercambiados se solapan entre sí.',
    };
  }

  const horariosActualizados = horarios.map((h) => {
    if (h.id === a.id) {
      return {
        ...h,
        diaSemana: nuevoDiaA,
        dia_semana: nuevoDiaA,
        horaInicio: nuevaHoraInicioA,
        hora_inicio: nuevaHoraInicioA,
        horaFin: nuevaHoraFinA,
        hora_fin: nuevaHoraFinA,
      };
    }
    if (h.id === b.id) {
      return {
        ...h,
        diaSemana: nuevoDiaB,
        dia_semana: nuevoDiaB,
        horaInicio: nuevaHoraInicioB,
        hora_inicio: nuevaHoraInicioB,
        horaFin: nuevaHoraFinB,
        hora_fin: nuevaHoraFinB,
      };
    }
    return h;
  });

  return { ok: true, horariosActualizados };
};

// Helper para generar una paleta armónica legible a partir de cualquier color HEX elegido
export const generarTemaDesdeColor = (hex: string): ProfesoraColorTheme => {
  const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
  const r = parseInt(cleanHex.slice(1, 3), 16) || 0;
  const g = parseInt(cleanHex.slice(3, 5), 16) || 0;
  const b = parseInt(cleanHex.slice(5, 7), 16) || 0;

  // Fondo pastel luminoso agradable (mezcla 28% color con 72% blanco)
  const bgR = Math.round(r * 0.28 + 255 * 0.72);
  const bgG = Math.round(g * 0.28 + 255 * 0.72);
  const bgB = Math.round(b * 0.28 + 255 * 0.72);
  const bg = `rgb(${bgR}, ${bgG}, ${bgB})`;

  // Borde a tono
  const borderR = Math.round(r * 0.5 + 255 * 0.5);
  const borderG = Math.round(g * 0.5 + 255 * 0.5);
  const borderB = Math.round(b * 0.5 + 255 * 0.5);
  const border = `rgb(${borderR}, ${borderG}, ${borderB})`;

  // Color primario para textos/títulos
  const primaryR = Math.round(r * 0.8);
  const primaryG = Math.round(g * 0.8);
  const primaryB = Math.round(b * 0.8);
  const primary = `rgb(${primaryR}, ${primaryG}, ${primaryB})`;

  return {
    primary,
    bg,
    border,
    badgeBg: cleanHex,
    badgeText: '#FFFFFF',
  };
};

export const useHorarios = () => {
  const [horariosOficiales, setHorariosOficiales] = useState<Horario[]>(MOCK_HORARIOS_INICIALES);
  const [horarios, setHorarios] = useState<Horario[]>(MOCK_HORARIOS_INICIALES);
  const [profesoras, setProfesoras] = useState<Profesora[]>(MOCK_PROFESORAS);
  const [filtroActividad, setFiltroActividad] = useState<string>('TODAS');
  const [filtroProfesora, setFiltroProfesora] = useState<string>('TODAS');
  const [filtroDia, setFiltroDia] = useState<string>('TODOS');
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  // Saber si hay modificaciones sin consolidar respecto a la versión oficial guardada
  const hayCambiosPendientes = useMemo(() => {
    if (horarios.length !== horariosOficiales.length) return true;
    return JSON.stringify(horarios) !== JSON.stringify(horariosOficiales);
  }, [horarios, horariosOficiales]);

  // Alumnos afectados pendientes de consolidación en borrador (reestructurados o dados de baja)
  const alumnosAfectadosPendientes = useMemo(() => {
    let count = 0;
    horariosOficiales.forEach((oficial) => {
      const enBorrador = horarios.find((h) => h.id === oficial.id);
      const inscriptosOficial = oficial.inscriptosActuales ?? oficial.inscriptos ?? 0;

      if (!enBorrador) {
        // Horario borrado en el borrador
        count += inscriptosOficial;
      } else if (
        (enBorrador.actividadId !== oficial.actividadId || enBorrador.profesoraId !== oficial.profesoraId) &&
        (enBorrador.inscriptosActuales ?? 0) === 0 &&
        inscriptosOficial > 0
      ) {
        // Horario reestructurado en el borrador
        count += inscriptosOficial;
      }
    });
    return count;
  }, [horarios, horariosOficiales]);

  // Consolidar y registrar oficialmente los cambios en el cronograma
  const guardarCambios = useCallback((): { ok: boolean; count: number; alumnosDesvinculados: number } => {
    const desvinculados = alumnosAfectadosPendientes;
    setHorariosOficiales([...horarios]);
    return { ok: true, count: horarios.length, alumnosDesvinculados: desvinculados };
  }, [horarios, alumnosAfectadosPendientes]);

  // Cancelar y revertir cualquier cambio no guardado
  const cancelarCambios = useCallback(() => {
    setHorarios([...horariosOficiales]);
    setErrorValidacion(null);
  }, [horariosOficiales]);

  // Cambiar el color de una profesora a elección y actualizar sus horarios en vivo
  const cambiarColorProfesora = useCallback((profesoraId: string, colorHex: string) => {
    const nuevoTheme = generarTemaDesdeColor(colorHex);

    // 1. Actualizar estado de profesoras
    setProfesoras((prev) =>
      prev.map((p) => (p.id === profesoraId ? { ...p, colorTheme: nuevoTheme } : p))
    );

    // 2. Actualizar todas las tarjetas asociadas a esa profesora en tiempo real
    setHorarios((prev) =>
      prev.map((h) => (h.profesoraId === profesoraId ? { ...h, profesoraTheme: nuevoTheme } : h))
    );
  }, []);

  // Horarios filtrados
  const horariosFiltrados = useMemo(() => {
    return horarios.filter((h) => {
      const matchActividad = filtroActividad === 'TODAS' || h.actividadId === filtroActividad;
      const matchProfesora = filtroProfesora === 'TODAS' || h.profesoraId === filtroProfesora;
      const matchDia = filtroDia === 'TODOS' || h.diaSemana === filtroDia;
      return matchActividad && matchProfesora && matchDia;
    });
  }, [horarios, filtroActividad, filtroProfesora, filtroDia]);

  // Validar solapamiento en el salón único
  const validarSolapamientoSalon = useCallback(
    (dia: DiaSemana, horaInicio: string, horaFin: string, ignoreHorarioId?: string) => {
      return validarSolapamientoSalonEnLista(horarios, dia, horaInicio, horaFin, ignoreHorarioId);
    },
    [horarios]
  );

  // Validación preventiva exhaustiva de superposición horaria, salón y rangos
  const validarSuperposicion = useCallback(
    (data: HorarioFormData, ignoreHorarioId?: string): { ok: boolean; error?: string } => {
      // 1. Validar límite de rango operativo (07:00 a 20:00)
      if (!estaEnRangoPermitido(data.horaInicio, data.horaFin)) {
        return {
          ok: false,
          error: 'Los horarios permitidos deben estar comprendidos entre las 07:00 y las 20:00 hs.',
        };
      }

      if (data.horaFin <= data.horaInicio) {
        return {
          ok: false,
          error: 'La hora de fin debe ser posterior a la hora de inicio.',
        };
      }

      // 2. Validar solapamiento de profesora en el mismo día
      const solapamientoProf = validarSolapamientoProfesoraEnLista(
        horarios,
        data.profesoraId,
        data.diaSemana,
        data.horaInicio,
        data.horaFin,
        ignoreHorarioId
      );
      if (solapamientoProf) {
        return {
          ok: false,
          error: `La profesora ${solapamientoProf.profesoraNombre} ya dicta una clase el ${solapamientoProf.diaSemana} de ${solapamientoProf.horaInicio} a ${solapamientoProf.horaFin} hs.`,
        };
      }

      // 3. Validar solapamiento en el salón único
      const conflictos = validarSolapamientoSalon(data.diaSemana, data.horaInicio, data.horaFin, ignoreHorarioId);
      if (conflictos.length > 0) {
        const conf = conflictos[0];
        return {
          ok: false,
          error: `El salón ya está ocupado por "${conf.actividadNombre}" el ${conf.diaSemana} de ${conf.horaInicio} a ${conf.horaFin} hs.`,
        };
      }

      return { ok: true };
    },
    [horarios, validarSolapamientoSalon]
  );

  // Crear horario
  const crearHorario = (data: HorarioFormData): { ok: boolean; error?: string } => {
    setErrorValidacion(null);

    // 1. Verificación preventiva de superposición y reglas
    const validacion = validarSuperposicion(data);
    if (!validacion.ok) {
      setErrorValidacion(validacion.error || 'Error de validación.');
      return validacion;
    }

    // 2. Obtener referencias de actividad y profesora
    const actividad = MOCK_ACTIVIDADES.find((a) => a.id === data.actividadId);
    const profesora = profesoras.find((p) => p.id === data.profesoraId);

    if (!actividad || !profesora) {
      const msg = 'Actividad o profesora no encontrada.';
      setErrorValidacion(msg);
      return { ok: false, error: msg };
    }

    const cupoFinal = data.cupoMaximo && data.cupoMaximo > 0 ? data.cupoMaximo : (actividad.cupoMaximoBase || 15);
    const nuevoId = `hor-${Date.now()}`;

    const nuevoHorario: Horario = {
      id: nuevoId,
      id_horario: nuevoId,
      actividadId: actividad.id,
      id_actividad: actividad.id,
      actividadNombre: actividad.nombre,
      actividadTipo: actividad.tipo,
      tipo_actividad: actividad.tipo,
      profesoraId: profesora.id,
      id_profesora: profesora.id,
      profesoraNombre: `${profesora.nombre} ${profesora.apellido}`,
      profesoraTheme: profesora.colorTheme || THEME_DEFAULT,
      diaSemana: data.diaSemana,
      dia_semana: data.diaSemana,
      horaInicio: data.horaInicio,
      hora_inicio: data.horaInicio,
      horaFin: data.horaFin,
      hora_fin: data.horaFin,
      cupoMaximo: cupoFinal,
      cupo_maximo: cupoFinal,
      inscriptosActuales: 0,
      inscriptos_actuales: 0,
      inscriptos: 0,
    };

    setHorarios((prev) => [...prev, nuevoHorario]);
    return { ok: true };
  };

  // Editar horario
  const editarHorario = (
    id: string,
    data: HorarioFormData,
    options?: SaveHorarioOptions
  ): { ok: boolean; error?: string; alumnosDesvinculados?: number } => {
    setErrorValidacion(null);

    // 1. Verificación preventiva de superposición y reglas ignorando el horario actual
    const validacion = validarSuperposicion(data, id);
    if (!validacion.ok) {
      setErrorValidacion(validacion.error || 'Error de validación.');
      return validacion;
    }

    const actividad = MOCK_ACTIVIDADES.find((a) => a.id === data.actividadId);
    const profesora = profesoras.find((p) => p.id === data.profesoraId);

    if (!actividad || !profesora) {
      const msg = 'Actividad o profesora no válida.';
      setErrorValidacion(msg);
      return { ok: false, error: msg };
    }

    const horarioExistente = horarios.find((h) => h.id === id);
    const inscriptosPrevios = horarioExistente?.inscriptosActuales ?? horarioExistente?.inscriptos ?? 0;

    // Regla de desvinculación por reestructuración crítica
    const desvincular = Boolean(options?.desvincularInscriptos);
    const inscriptosFinales = desvincular ? 0 : inscriptosPrevios;
    const alumnosDesvinculados = desvincular ? inscriptosPrevios : 0;
    const cupoFinal = data.cupoMaximo && data.cupoMaximo > 0 ? data.cupoMaximo : (actividad.cupoMaximoBase || 15);

    setHorarios((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        return {
          ...h,
          id_horario: h.id,
          actividadId: actividad.id,
          id_actividad: actividad.id,
          actividadNombre: actividad.nombre,
          actividadTipo: actividad.tipo,
          tipo_actividad: actividad.tipo,
          profesoraId: profesora.id,
          id_profesora: profesora.id,
          profesoraNombre: `${profesora.nombre} ${profesora.apellido}`,
          profesoraTheme: profesora.colorTheme || THEME_DEFAULT,
          diaSemana: data.diaSemana,
          dia_semana: data.diaSemana,
          horaInicio: data.horaInicio,
          hora_inicio: data.horaInicio,
          horaFin: data.horaFin,
          hora_fin: data.horaFin,
          cupoMaximo: cupoFinal,
          cupo_maximo: cupoFinal,
          inscriptosActuales: inscriptosFinales,
          inscriptos_actuales: inscriptosFinales,
          inscriptos: inscriptosFinales,
        };
      })
    );

    return { ok: true, alumnosDesvinculados };
  };

  // Eliminar horario de forma inmediata y definitiva (sin borrador).
  // La baja se aplica tanto al borrador como a la versión oficial para que
  // no genere "cambios sin guardar" ni pueda deshacerse con "Descartar".
  const eliminarHorario = (id: string): { ok: boolean; alumnosDesvinculados: number } => {
    const target = horarios.find((h) => h.id === id) ?? horariosOficiales.find((h) => h.id === id);
    const inscriptosCount = target?.inscriptosActuales ?? target?.inscriptos ?? 0;
    setHorarios((prev) => prev.filter((h) => h.id !== id));
    setHorariosOficiales((prev) => prev.filter((h) => h.id !== id));
    return { ok: true, alumnosDesvinculados: inscriptosCount };
  };

  // Mover horario a una nueva franja
  const moverHorario = useCallback(
    (
      horarioId: string,
      nuevoDia: DiaSemana,
      nuevaHoraInicio: string,
      slotFin?: string
    ): { ok: boolean; error?: string } => {
      const res = moverHorarioEnLista(horarios, horarioId, nuevoDia, nuevaHoraInicio, { slotFin });
      if (!res.ok) {
        setErrorValidacion(res.error || 'No se pudo mover el horario.');
        return { ok: false, error: res.error };
      }
      setHorarios(res.horariosActualizados!);
      setErrorValidacion(null);
      return { ok: true };
    },
    [horarios]
  );

  // Intercambiar dos horarios de lugar (Swap)
  const intercambiarHorarios = useCallback(
    (idA: string, idB: string): { ok: boolean; error?: string } => {
      const res = intercambiarHorariosEnLista(horarios, idA, idB);
      if (!res.ok) {
        setErrorValidacion(res.error || 'No se pudieron intercambiar los horarios.');
        return { ok: false, error: res.error };
      }
      setHorarios(res.horariosActualizados!);
      setErrorValidacion(null);
      return { ok: true };
    },
    [horarios]
  );

  // Limpiar todo el cronograma
  const limpiarCronograma = useCallback(() => {
    setHorarios([]);
  }, []);

  const profesorasActivas = useMemo(() => profesoras.filter((p) => p.activa), [profesoras]);

  return {
    horarios: horariosFiltrados,
    totalHorarios: horarios.length,
    actividades: MOCK_ACTIVIDADES,
    profesoras: profesorasActivas,
    todasProfesoras: profesoras,
    cambiarColorProfesora,
    filtroActividad,
    setFiltroActividad,
    filtroProfesora,
    setFiltroProfesora,
    filtroDia,
    setFiltroDia,
    errorValidacion,
    setErrorValidacion,
    crearHorario,
    editarHorario,
    eliminarHorario,
    moverHorario,
    intercambiarHorarios,
    limpiarCronograma,
    validarSolapamientoSalon,
    validarSuperposicion,
    hayCambiosPendientes,
    alumnosAfectadosPendientes,
    guardarCambios,
    cancelarCambios,
    horariosOficiales,
  };
};
