import { describe, expect, it } from "vitest";
import type { HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import {
  clasesDelDia,
  diaInicial,
  franjasHorarias,
  horaDesdeApi,
  minutosDeHora,
  minutosDesdeApi,
  textoDisponibilidad,
} from "../tablero";

function horario(id: number, dia: number, inicio = "09:00", fin = "10:00"): HorarioPublico {
  return {
    id_horario: id,
    dia_semana: dia,
    hora_inicio: `1970-01-01T${inicio}:00.000Z`,
    hora_fin: `1970-01-01T${fin}:00.000Z`,
    actividad: { id_actividad: 1, nombre: "Funcional", descripcion: null, modalidad: "GRUPAL" },
    profesora: { nombre: "Lucía", apellido: "Gómez" },
    cupo_maximo: null,
    cupo_disponible: null,
    disponibilidad: "SIN_LIMITE",
  };
}

describe("tablero", () => {
  it("horaDesdeApi y minutosDesdeApi leen el TIME serializado", () => {
    expect(horaDesdeApi("1970-01-01T18:30:00.000Z")).toBe("18:30");
    expect(minutosDesdeApi("1970-01-01T18:30:00.000Z")).toBe(1110);
    expect(minutosDeHora("07:05")).toBe(425);
  });

  it("franjasHorarias va de la hora de la primera clase al fin de la última, de a una hora", () => {
    const franjas = franjasHorarias([horario(1, 2, "09:00", "10:00"), horario(2, 1, "18:30", "19:15")]);

    expect(franjas[0]).toEqual({ inicio: "09:00", fin: "10:00" });
    expect(franjas.at(-1)).toEqual({ inicio: "19:00", fin: "20:00" });
    expect(franjas).toHaveLength(11);
    expect(franjasHorarias([])).toEqual([]);
  });

  it("clasesDelDia filtra las clases de un día", () => {
    const horarios = [horario(1, 1), horario(2, 2), horario(3, 1, "18:00", "19:00")];

    expect(clasesDelDia(horarios, 1).map(({ id_horario }) => id_horario)).toEqual([1, 3]);
    expect(clasesDelDia(horarios, 6)).toEqual([]);
  });

  it("diaInicial muestra hoy si tiene clases, si no el próximo día con clases", () => {
    const lunesYJueves = [horario(1, 1), horario(2, 4)];

    expect(diaInicial(new Date(2026, 9, 12), lunesYJueves)).toBe(1);
    expect(diaInicial(new Date(2026, 9, 13), lunesYJueves)).toBe(4);
    // Viernes: no quedan días con clases en la semana, vuelve al lunes.
    expect(diaInicial(new Date(2026, 9, 16), lunesYJueves)).toBe(1);
    // Domingo, con el centro cerrado.
    expect(diaInicial(new Date(2026, 9, 11), lunesYJueves)).toBe(1);
    expect(diaInicial(new Date(2026, 9, 14), [])).toBe(1);
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
