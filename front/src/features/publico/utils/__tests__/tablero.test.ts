import { describe, expect, it } from "vitest";
import type { HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import { agruparPorDia, diaInicial, horaDesdeApi, textoDisponibilidad } from "../tablero";

function horario(id: number, dia: number): HorarioPublico {
  return {
    id_horario: id,
    dia_semana: dia,
    hora_inicio: "1970-01-01T09:00:00.000Z",
    hora_fin: "1970-01-01T10:00:00.000Z",
    actividad: { id_actividad: 1, nombre: "Funcional", descripcion: null, modalidad: "GRUPAL" },
    profesora: { nombre: "Lucía", apellido: "Gómez" },
    cupo_maximo: null,
    cupo_disponible: null,
    disponibilidad: "SIN_LIMITE",
  };
}

describe("tablero", () => {
  it("horaDesdeApi toma la hora del TIME serializado", () => {
    expect(horaDesdeApi("1970-01-01T18:30:00.000Z")).toBe("18:30");
  });

  it("agruparPorDia arma los seis días del centro, también los que no tienen clases", () => {
    const porDia = agruparPorDia([horario(1, 1), horario(2, 1), horario(3, 6)]);

    expect([...porDia.keys()]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(porDia.get(1)?.map(({ id_horario }) => id_horario)).toEqual([1, 2]);
    expect(porDia.get(2)).toEqual([]);
    expect(porDia.get(6)?.map(({ id_horario }) => id_horario)).toEqual([3]);
  });

  it("diaInicial muestra el día de hoy y el lunes si es domingo", () => {
    expect(diaInicial(new Date(2026, 9, 14))).toBe(3);
    expect(diaInicial(new Date(2026, 9, 11))).toBe(1);
  });

  it("textoDisponibilidad nombra los lugares según la escala de US-32", () => {
    expect(textoDisponibilidad("LIBRE", 5)).toBe("5 lugares libres");
    expect(textoDisponibilidad("LIBRE", 1)).toBe("1 lugar libre");
    expect(textoDisponibilidad("CASI_LLENO", 2)).toBe("Últimos 2 lugares");
    expect(textoDisponibilidad("CASI_LLENO", 1)).toBe("Último lugar");
    expect(textoDisponibilidad("COMPLETO", 0)).toBe("Completo");
    expect(textoDisponibilidad("SIN_LIMITE", null)).toBe("Sin límite de cupo");
  });
});
