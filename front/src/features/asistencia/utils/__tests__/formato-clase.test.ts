import { describe, expect, it } from "vitest";
import {
  estadoMomentoClase,
  estadoVisible,
  estaEnRangoHorario,
  puedeTomarAsistencia,
  rangoHorario,
} from "../formato-clase";
import type { ClaseApi } from "@/features/asistencia/schemas/asistencia";

describe("formato-clase (apertura de asistencia por rango horario)", () => {
  const clasePrueba: ClaseApi = {
    id_clase: 1,
    id_horario: 1,
    fecha_clase: "2026-10-14T10:00:00.000Z",
    id_prof_dictante: 1,
    estado: "PROGRAMADA",
    fecha_cierre_asist: null,
    observaciones: null,
    horario: {
      hora_inicio: "2026-10-14T10:00:00.000Z", // 10:00
      hora_fin: "2026-10-14T11:00:00.000Z", // 11:00
      cupo_maximo: 10,
      actividad: {
        id_actividad: 1,
        nombre: "Funcional",
        modalidad: "GRUPAL",
        cupo_maximo: 10,
      },
    },
  };

  it("calcula correctamente el rango horario formateado", () => {
    expect(rangoHorario(clasePrueba)).toBe("10:00 a 11:00");
  });

  it("determina que antes del inicio la clase no está en curso y la asistencia no está abierta para la profesora", () => {
    // 09:30 Argentina (UTC-3 -> 12:30 UTC)
    const antesDeClase = new Date("2026-10-14T12:30:00.000Z");

    expect(estadoMomentoClase(clasePrueba, antesDeClase)).toBe("ANTES");
    expect(estaEnRangoHorario(clasePrueba, antesDeClase)).toBe(false);
    expect(estadoVisible(clasePrueba, true, antesDeClase)).toBe("PROGRAMADA");

    // Para la profesora NO está habilitada la toma de asistencia antes de la hora
    expect(puedeTomarAsistencia(clasePrueba, true, false, antesDeClase)).toBe(false);

    // Para la propietaria sí está habilitada para supervisión
    expect(puedeTomarAsistencia(clasePrueba, true, true, antesDeClase)).toBe(true);
  });

  it("determina que durante el rango horario la asistencia está abierta para la profesora", () => {
    // 10:15 Argentina (UTC-3 -> 13:15 UTC)
    const duranteClase = new Date("2026-10-14T13:15:00.000Z");

    expect(estadoMomentoClase(clasePrueba, duranteClase)).toBe("EN_CURSO");
    expect(estaEnRangoHorario(clasePrueba, duranteClase)).toBe(true);
    expect(estadoVisible(clasePrueba, true, duranteClase)).toBe("EN_CURSO");

    // Para la profesora y propietaria está abierta
    expect(puedeTomarAsistencia(clasePrueba, true, false, duranteClase)).toBe(true);
    expect(puedeTomarAsistencia(clasePrueba, true, true, duranteClase)).toBe(true);
  });

  it("determina que en los límites exactos de inicio y fin la asistencia está abierta", () => {
    // Exactamente 10:00 Argentina (13:00 UTC)
    const inicioExacto = new Date("2026-10-14T13:00:00.000Z");
    expect(estaEnRangoHorario(clasePrueba, inicioExacto)).toBe(true);
    expect(puedeTomarAsistencia(clasePrueba, true, false, inicioExacto)).toBe(true);

    // Exactamente 11:00 Argentina (14:00 UTC)
    const finExacto = new Date("2026-10-14T14:00:00.000Z");
    expect(estaEnRangoHorario(clasePrueba, finExacto)).toBe(true);
    expect(puedeTomarAsistencia(clasePrueba, true, false, finExacto)).toBe(true);
  });

  it("determina que después del fin de la clase la asistencia finaliza para la profesora", () => {
    // 11:05 Argentina (14:05 UTC)
    const despuesDeClase = new Date("2026-10-14T14:05:00.000Z");

    expect(estadoMomentoClase(clasePrueba, despuesDeClase)).toBe("DESPUES");
    expect(estaEnRangoHorario(clasePrueba, despuesDeClase)).toBe(false);
    expect(estadoVisible(clasePrueba, true, despuesDeClase)).toBe("CERRADA");

    // La profesora ya no puede tomar asistencia
    expect(puedeTomarAsistencia(clasePrueba, true, false, despuesDeClase)).toBe(false);

    // La propietaria puede corregir marcas
    expect(puedeTomarAsistencia(clasePrueba, true, true, despuesDeClase)).toBe(true);
  });

  it("bloquea la toma de asistencia para cualquier rol si la clase está cancelada", () => {
    const claseCancelada: ClaseApi = { ...clasePrueba, estado: "CANCELADA" };
    const duranteClase = new Date("2026-10-14T13:15:00.000Z");

    expect(estadoVisible(claseCancelada, true, duranteClase)).toBe("CANCELADA");
    expect(puedeTomarAsistencia(claseCancelada, true, false, duranteClase)).toBe(false);
    expect(puedeTomarAsistencia(claseCancelada, true, true, duranteClase)).toBe(false);
  });

  it("bloquea la toma de asistencia para la profesora si la clase ya fue cerrada/dictada", () => {
    const claseDictada: ClaseApi = { ...clasePrueba, estado: "DICTADA" };
    const duranteClase = new Date("2026-10-14T13:15:00.000Z");

    expect(estadoVisible(claseDictada, true, duranteClase)).toBe("CERRADA");
    expect(puedeTomarAsistencia(claseDictada, true, false, duranteClase)).toBe(false);
    // Pero la propietaria puede corregir marcas individuales
    expect(puedeTomarAsistencia(claseDictada, true, true, duranteClase)).toBe(true);
  });
});
