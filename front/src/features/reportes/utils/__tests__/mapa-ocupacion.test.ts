import { describe, expect, it } from "vitest";
import { armarMapaDeOcupacion, nivelDelPorcentaje } from "../mapa-ocupacion";
import type { HorarioOcupado } from "@/types/reportes";

function horario(id: number, diaSemana: number, horaInicio: string, inscriptos: number, cupo: number | null): HorarioOcupado {
  return {
    id,
    diaSemana,
    horaInicio,
    horaFin: "",
    actividad: `Actividad ${id}`,
    modalidad: "GRUPAL",
    profesora: "Ana Paz",
    cupo,
    inscriptos,
    porcentaje: cupo ? (inscriptos / cupo) * 100 : null,
    nivel: "LIBRE",
  };
}

describe("nivelDelPorcentaje", () => {
  it.each([
    [100, "COMPLETO"],
    [85, "CASI_LLENO"],
    [84.9, "MODERADO"],
    [60, "MODERADO"],
    [59.9, "LIBRE"],
    [0, "LIBRE"],
  ] as const)("%s %% es %s", (porcentaje, nivel) => {
    expect(nivelDelPorcentaje(porcentaje)).toBe(nivel);
  });
});

describe("armarMapaDeOcupacion", () => {
  it("arma una fila por hora de inicio, ordenadas, con los siete días", () => {
    const mapa = armarMapaDeOcupacion([horario(1, 3, "18:00", 2, 4), horario(2, 1, "08:00", 1, 10)]);

    expect(mapa.map(({ hora }) => hora)).toEqual(["08:00", "18:00"]);
    expect(mapa[0]?.celdas).toHaveLength(7);
    expect(mapa[0]?.celdas[0]).toMatchObject({ dia: 1, porcentaje: 10, nivel: "LIBRE" });
    expect(mapa[0]?.celdas[1]).toMatchObject({ dia: 2, nivel: "SIN_ACTIVIDAD", porcentaje: null });
    expect(mapa[1]?.celdas[2]).toMatchObject({ dia: 3, porcentaje: 50 });
  });

  it("suma los horarios que caen en la misma franja", () => {
    const [franja] = armarMapaDeOcupacion([horario(1, 1, "18:00", 4, 4), horario(2, 1, "18:00", 5, 6)]);

    expect(franja?.celdas[0]).toMatchObject({ porcentaje: 90, nivel: "CASI_LLENO" });
    expect(franja?.celdas[0]?.horarios).toHaveLength(2);
  });

  it("una franja sin cupo no tiene porcentaje", () => {
    const [franja] = armarMapaDeOcupacion([horario(1, 6, "10:00", 7, null)]);

    expect(franja?.celdas[5]).toMatchObject({ nivel: "SIN_CUPO", porcentaje: null });
  });
});
