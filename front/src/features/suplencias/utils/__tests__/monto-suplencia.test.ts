import { describe, expect, it } from "vitest";
import { horasDeLaClase, montoDeLaSuplencia } from "../monto-suplencia";
import type { TarifaHonorario } from "@/types/honorarios";
import type { Suplencia } from "@/types/suplencia";

function suplencia(cambios: Partial<Suplencia> = {}): Suplencia {
  return {
    idClase: "1",
    idHorario: "11",
    fechaClase: "2026-10-16",
    horaInicio: "09:00",
    horaFin: "10:00",
    estadoClase: "DICTADA",
    actividad: { id: "1", nombre: "Funcional" },
    titular: { id: "1", nombre: "Lucía", apellido: "Gómez" },
    suplente: { id: "2", nombre: "Carla", apellido: "Ruiz" },
    motivo: null,
    ...cambios,
  };
}

function tarifa(idProfesora: number, valor: number, desde: string, hasta: string | null = null): TarifaHonorario {
  return { id: valor, concepto: "HORA_SUPLENCIA", idProfesora, tipoValor: "MONTO_FIJO", valor, desde, hasta };
}

describe("horasDeLaClase", () => {
  it("cuenta las horas y las fracciones", () => {
    expect(horasDeLaClase({ horaInicio: "09:00", horaFin: "10:00" })).toBe(1);
    expect(horasDeLaClase({ horaInicio: "18:30", horaFin: "20:00" })).toBe(1.5);
  });
});

describe("montoDeLaSuplencia", () => {
  it("paga el valor por hora de quien cubrió, vigente el día de la clase, por la duración", () => {
    const tarifas = [tarifa(2, 2000, "2026-01-01", "2026-09-30"), tarifa(2, 2500, "2026-10-01"), tarifa(1, 9000, "2026-01-01")];
    expect(montoDeLaSuplencia(suplencia({ horaFin: "10:30" }), tarifas)).toBe(3750);
  });

  it("sin valor por hora de quien cubrió no hay monto", () => {
    expect(montoDeLaSuplencia(suplencia(), [tarifa(1, 2500, "2026-01-01")])).toBeNull();
  });

  it("una clase cancelada no se paga", () => {
    expect(montoDeLaSuplencia(suplencia({ estadoClase: "CANCELADA" }), [tarifa(2, 2500, "2026-01-01")])).toBe(0);
  });
});
