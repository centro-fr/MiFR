import { describe, expect, it } from "vitest";
import type { HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import {
  clasesDe,
  DIAS_DEL_CENTRO,
  diaInicial,
  diasConClases,
  horaDesdeApi,
  horasPorTurno,
  textoDisponibilidad,
  turnoDe,
} from "../tablero";

function horario(id: number, dia: number, inicio = "09:00"): HorarioPublico {
  return {
    id_horario: id,
    dia_semana: dia,
    hora_inicio: `1970-01-01T${inicio}:00.000Z`,
    hora_fin: "1970-01-01T23:00:00.000Z",
    actividad: { id_actividad: 1, nombre: "Funcional", descripcion: null, modalidad: "GRUPAL" },
    profesora: { nombre: "Lucía", apellido: "Gómez" },
    cupo_maximo: 12,
    cupo_disponible: 12,
    disponibilidad: "LIBRE",
  };
}

describe("tablero", () => {
  it("horaDesdeApi toma la hora del TIME serializado", () => {
    expect(horaDesdeApi("1970-01-01T18:30:00.000Z")).toBe("18:30");
  });

  it("turnoDe separa la mañana (hasta las 13), la tarde y la noche (desde las 19)", () => {
    expect(turnoDe("08:00")).toBe("Mañana");
    expect(turnoDe("12:59")).toBe("Mañana");
    expect(turnoDe("13:00")).toBe("Tarde");
    expect(turnoDe("18:30")).toBe("Tarde");
    expect(turnoDe("19:00")).toBe("Noche");
  });

  it("horasPorTurno arma una fila por hora con clases, sin repetir ni dejar huecos, agrupadas por turno", () => {
    const turnos = horasPorTurno([
      horario(1, 1, "22:00"),
      horario(2, 2, "08:00"),
      horario(3, 3, "08:00"),
      horario(4, 1, "15:00"),
      horario(5, 4, "09:00"),
    ]);

    expect(turnos).toEqual([
      { turno: "Mañana", horas: ["08:00", "09:00"] },
      { turno: "Tarde", horas: ["15:00"] },
      { turno: "Noche", horas: ["22:00"] },
    ]);
    expect(horasPorTurno([])).toEqual([]);
  });

  it("diasConClases deja solo los días que tienen alguna clase, en orden", () => {
    const dias = diasConClases([horario(1, 4), horario(2, 1), horario(3, 4)]);

    expect(dias.map(({ nombre }) => nombre)).toEqual(["Lunes", "Jueves"]);
  });

  it("clasesDe filtra por día y, si se indica, por hora de inicio", () => {
    const horarios = [horario(1, 1, "09:00"), horario(2, 1, "18:00"), horario(3, 2, "09:00")];

    expect(clasesDe(horarios, 1).map(({ id_horario }) => id_horario)).toEqual([1, 2]);
    expect(clasesDe(horarios, 1, "18:00").map(({ id_horario }) => id_horario)).toEqual([2]);
    expect(clasesDe(horarios, 6)).toEqual([]);
  });

  it("diaInicial muestra hoy si tiene clases, si no el próximo día con clases", () => {
    const lunesYJueves = [DIAS_DEL_CENTRO[0], DIAS_DEL_CENTRO[3]];

    expect(diaInicial(new Date(2026, 9, 12), lunesYJueves)).toBe(1);
    expect(diaInicial(new Date(2026, 9, 13), lunesYJueves)).toBe(4);
    // Viernes: no quedan días con clases en la semana, vuelve al lunes.
    expect(diaInicial(new Date(2026, 9, 16), lunesYJueves)).toBe(1);
    // Domingo, con el centro cerrado.
    expect(diaInicial(new Date(2026, 9, 11), lunesYJueves)).toBe(1);
    expect(diaInicial(new Date(2026, 9, 12), [])).toBeUndefined();
  });

  it("textoDisponibilidad nombra los lugares según la escala de US-32", () => {
    expect(textoDisponibilidad("LIBRE", 5)).toBe("5 libres");
    expect(textoDisponibilidad("LIBRE", 1)).toBe("1 libre");
    expect(textoDisponibilidad("CASI_LLENO", 2)).toBe("Últimos 2");
    expect(textoDisponibilidad("CASI_LLENO", 1)).toBe("Último lugar");
    expect(textoDisponibilidad("COMPLETO", 0)).toBe("Completo");
    expect(textoDisponibilidad("SIN_LIMITE", null)).toBe("Sin límite");
  });
});
