import type { DiaSemana, Horario } from "@/types/horarios";

// Reglas puras del cronograma, las mismas de US-04 que valida el back: una profesora no
// puede tener dos horarios superpuestos el mismo día, y todo horario va de 07:00 a 20:00.

const DIAS_POR_NUMERO: DiaSemana[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

export const HORA_APERTURA = "07:00";
export const HORA_CIERRE = "23:00";
export const HORA_MAX_INICIO = "22:00";

// El back numera los días de 1 (lunes) a 7 (domingo).
export function diaDesdeNumero(numero: number): DiaSemana {
  return DIAS_POR_NUMERO[numero - 1];
}

export function numeroDeDia(dia: DiaSemana): number {
  return DIAS_POR_NUMERO.indexOf(dia) + 1;
}

// El back serializa las horas sobre el 1970-01-01 en UTC: "1970-01-01T09:00:00.000Z" → "09:00", o como "09:00:00" / "09:00".
export function horaDesdeApi(valor: string): string {
  if (valor.length >= 16 && valor.includes("T")) {
    return valor.slice(11, 16);
  }
  return valor.slice(0, 5);
}

export function timeToMinutes(hora: string): number {
  const [horas, minutos] = hora.split(":").map(Number);
  return (horas || 0) * 60 + (minutos || 0);
}

export function minutosAHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

// Intervalos semicerrados [inicio, fin): se superponen si cada uno empieza antes de que termine el otro.
export function haySolapamiento(inicio1: string, fin1: string, inicio2: string, fin2: string): boolean {
  return timeToMinutes(inicio1) < timeToMinutes(fin2) && timeToMinutes(inicio2) < timeToMinutes(fin1);
}

export function estaEnRangoPermitido(inicio: string, fin: string): boolean {
  const i = timeToMinutes(inicio);
  const f = timeToMinutes(fin);
  return i >= timeToMinutes(HORA_APERTURA) && f <= timeToMinutes(HORA_CIERRE) && f > i;
}

export function validarSolapamientoProfesoraEnLista(
  horarios: Horario[],
  profesoraId: string,
  dia: DiaSemana,
  horaInicio: string,
  horaFin: string,
  ignorarHorarioId?: string,
): Horario | undefined {
  return horarios.find(
    (h) =>
      h.id !== ignorarHorarioId &&
      h.profesoraId === profesoraId &&
      h.diaSemana === dia &&
      haySolapamiento(h.horaInicio, h.horaFin, horaInicio, horaFin),
  );
}

const DIA_EN_ESPANOL: Record<DiaSemana, string> = {
  LUNES: 'lunes',
  MARTES: 'martes',
  MIERCOLES: 'miércoles',
  JUEVES: 'jueves',
  VIERNES: 'viernes',
  SABADO: 'sábado',
  DOMINGO: 'domingo',
};

export function mensajeSuperposicion(conflicto: Horario): string {
  const diaTxt = DIA_EN_ESPANOL[conflicto.diaSemana] ?? conflicto.diaSemana.toLowerCase();
  return `${conflicto.profesoraNombre} ya da ${conflicto.actividadNombre} el ${diaTxt} a las ${conflicto.horaInicio}. Elegí otro horario u otra profesora.`;
}

type ResultadoCronograma = { ok: true; horariosActualizados: Horario[] } | { ok: false; error: string };

function evaluarPosicion(horarios: Horario[], target: Horario, dia: DiaSemana, inicio: string) {
  const duracion = timeToMinutes(target.horaFin) - timeToMinutes(target.horaInicio);
  const fin = minutosAHora(timeToMinutes(inicio) + duracion);

  if (!estaEnRangoPermitido(inicio, fin)) {
    return {
      ok: false as const,
      error: `El horario resultante (${inicio} - ${fin} hs) excede el horario operativo (${HORA_APERTURA} a ${HORA_CIERRE} hs).`,
    };
  }
  const conflicto = validarSolapamientoProfesoraEnLista(horarios, target.profesoraId, dia, inicio, fin, target.id);
  if (conflicto) return { ok: false as const, error: mensajeSuperposicion(conflicto) };
  return { ok: true as const, inicio, fin };
}

// Mueve un horario a otro día y hora manteniendo su duración. Si la clase dura más de una
// franja y el inicio choca, prueba alinear su fin con el fin de la franja destino.
export function moverHorarioEnLista(
  horarios: Horario[],
  horarioId: string,
  nuevoDia: DiaSemana,
  nuevaHoraInicio: string,
  opciones?: { slotFin?: string },
): ResultadoCronograma {
  const target = horarios.find((h) => h.id === horarioId);
  if (!target) return { ok: false, error: "Horario no encontrado." };

  let resultado = evaluarPosicion(horarios, target, nuevoDia, nuevaHoraInicio);
  const duracion = timeToMinutes(target.horaFin) - timeToMinutes(target.horaInicio);
  if (!resultado.ok && opciones?.slotFin && duracion > 60) {
    const inicioAlineado = timeToMinutes(opciones.slotFin) - duracion;
    if (inicioAlineado >= timeToMinutes(HORA_APERTURA)) {
      const alineado = evaluarPosicion(horarios, target, nuevoDia, minutosAHora(inicioAlineado));
      if (alineado.ok) resultado = alineado;
    }
  }
  if (!resultado.ok) return resultado;

  const { inicio, fin } = resultado;
  return {
    ok: true,
    horariosActualizados: horarios.map((h) =>
      h.id === target.id ? { ...h, diaSemana: nuevoDia, horaInicio: inicio, horaFin: fin } : h,
    ),
  };
}

// Intercambia día y hora de inicio de dos horarios; cada uno conserva su duración.
export function intercambiarHorariosEnLista(horarios: Horario[], idA: string, idB: string): ResultadoCronograma {
  if (idA === idB) return { ok: true, horariosActualizados: horarios };
  const a = horarios.find((h) => h.id === idA);
  const b = horarios.find((h) => h.id === idB);
  if (!a || !b) return { ok: false, error: "Uno o ambos horarios a intercambiar no existen." };

  const finA = minutosAHora(timeToMinutes(b.horaInicio) + timeToMinutes(a.horaFin) - timeToMinutes(a.horaInicio));
  const finB = minutosAHora(timeToMinutes(a.horaInicio) + timeToMinutes(b.horaFin) - timeToMinutes(b.horaInicio));
  const nuevoA = { ...a, diaSemana: b.diaSemana, horaInicio: b.horaInicio, horaFin: finA };
  const nuevoB = { ...b, diaSemana: a.diaSemana, horaInicio: a.horaInicio, horaFin: finB };

  if (!estaEnRangoPermitido(nuevoA.horaInicio, nuevoA.horaFin) || !estaEnRangoPermitido(nuevoB.horaInicio, nuevoB.horaFin)) {
    return { ok: false, error: `El intercambio excede el horario operativo (${HORA_APERTURA} a ${HORA_CIERRE} hs).` };
  }

  const otros = horarios.filter((h) => h.id !== a.id && h.id !== b.id);
  for (const movido of [nuevoA, nuevoB]) {
    const conflicto = validarSolapamientoProfesoraEnLista(
      otros,
      movido.profesoraId,
      movido.diaSemana,
      movido.horaInicio,
      movido.horaFin,
    );
    if (conflicto) return { ok: false, error: `Conflicto en el intercambio: ${mensajeSuperposicion(conflicto)}` };
  }
  if (
    nuevoA.profesoraId === nuevoB.profesoraId &&
    nuevoA.diaSemana === nuevoB.diaSemana &&
    haySolapamiento(nuevoA.horaInicio, nuevoA.horaFin, nuevoB.horaInicio, nuevoB.horaFin)
  ) {
    return { ok: false, error: "Conflicto de duración: los horarios intercambiados se superponen entre sí." };
  }

  return {
    ok: true,
    horariosActualizados: horarios.map((h) => (h.id === a.id ? nuevoA : h.id === b.id ? nuevoB : h)),
  };
}
