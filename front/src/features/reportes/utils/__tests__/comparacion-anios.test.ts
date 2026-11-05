import { describe, expect, it } from "vitest";
import { conSigno, lecturaDelGrafico, motivosPrincipales, valorDelMes } from "../comparacion-anios";
import type { AltasDelMes, EstadisticasInscripciones } from "@/types/reportes";

const HOY = "2026-11-05";

function anio(numero: number, altas: number[], bajas: number[] = [], activos: (number | null)[] = []): EstadisticasInscripciones {
  const meses: AltasDelMes[] = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    anio: numero,
    nombre: "",
    cantidad: altas[i] ?? 0,
    diferencia: null,
    variacion: null,
    bajas: bajas[i] ?? 0,
    activosAlCierre: activos[i] ?? null,
  }));
  return { anio: numero, totalAltas: 0, totalBajas: 0, activosAlInicio: 0, mesPico: null, meses, bajas: { motivos: [], permanencia: { cantidad: 0, promedioMeses: null, primerosTresMeses: 0 } } };
}

describe("valorDelMes", () => {
  const mes = anio(2026, [3], [1], [40]).meses[0];

  it("devuelve el valor de la métrica elegida", () => {
    expect(valorDelMes(mes, "altas", HOY)).toBe(3);
    expect(valorDelMes(mes, "bajas", HOY)).toBe(1);
    expect(valorDelMes(mes, "activos", HOY)).toBe(40);
  });

  it("un mes que todavía no empezó no tiene valor", () => {
    expect(valorDelMes(anio(2026, []).meses[11], "altas", HOY)).toBeNull();
  });
});

describe("lecturaDelGrafico", () => {
  it("con un solo año no dice nada", () => {
    expect(lecturaDelGrafico([anio(2026, [9, 1, 8])], "altas", HOY)).toBeNull();
  });

  it("altas: avisa cuando los dos meses más fuertes se repiten todos los años", () => {
    const lectura = lecturaDelGrafico([anio(2024, [6, 2, 5]), anio(2025, [9, 3, 10]), anio(2026, [14, 4, 13])], "altas", HOY);
    expect(lectura).toBe(
      "enero y marzo son los meses con más altas en los tres años. Conviene llegar a esos meses con cupo libre en los horarios y con las promociones listas.",
    );
  });

  it("altas: si los meses fuertes cambian de un año a otro no hay patrón", () => {
    expect(lecturaDelGrafico([anio(2025, [9, 3, 10]), anio(2026, [2, 14, 13])], "altas", HOY)).toBeNull();
  });

  it("altas: el mes en curso no cuenta, porque todavía va por la mitad", () => {
    const altas2026 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 9, 30];
    const lectura = lecturaDelGrafico([anio(2025, [1, 1, 1, 1, 1, 1, 1, 1, 8, 9]), anio(2026, [1, 1, 1, 1, 1, 1, 1, 1, 7, ...altas2026.slice(9)])], "altas", HOY);
    expect(lectura).toMatch(/^septiembre y octubre son los meses con más altas en 2025 y 2026/);
  });

  it("bajas: avisa del mes que está por encima del promedio todos los años", () => {
    const lectura = lecturaDelGrafico([anio(2025, [], [2, 2, 2, 6, 2]), anio(2026, [], [1, 2, 1, 5, 1])], "bajas", HOY);
    expect(lectura).toBe("abril es el mes con más bajas en 2025 y 2026. Conviene revisar qué pasa en esa época y anticiparse.");
  });

  it("bajas: sin un mes que se repita no dice nada", () => {
    expect(lecturaDelGrafico([anio(2025, [], [6, 1, 1]), anio(2026, [], [1, 6, 1])], "bajas", HOY)).toBeNull();
  });

  it("activos: compara el último mes cerrado con el mismo mes del año anterior", () => {
    const activos2025 = [30, 31, 32, 33, 34, 35, 36, 37, 38, 59];
    const activos2026 = [70, 72, 74, 80, 90, 100, 110, 115, 120, 128, 130];
    expect(lecturaDelGrafico([anio(2025, [], [], activos2025), anio(2026, [], [], activos2026)], "activos", HOY)).toBe(
      "el centro terminó octubre con 128 alumnos activos, 69 más que en octubre de 2025.",
    );
    expect(lecturaDelGrafico([anio(2025, [], [], [...activos2025.slice(0, 9), 140]), anio(2026, [], [], activos2026)], "activos", HOY)).toMatch(
      /12 menos que en octubre de 2025/,
    );
    expect(lecturaDelGrafico([anio(2025, [], [], [...activos2025.slice(0, 9), 128]), anio(2026, [], [], activos2026)], "activos", HOY)).toMatch(
      /los mismos que en octubre de 2025/,
    );
  });

  it("activos: sin el dato del año anterior no dice nada", () => {
    expect(lecturaDelGrafico([anio(2025, []), anio(2026, [], [], [70, 72, 74, 80, 90, 100, 110, 115, 120, 128])], "activos", HOY)).toBeNull();
  });
});

describe("motivosPrincipales", () => {
  it("deja los tres motivos concretos con más bajas y junta el resto en Otros", () => {
    expect(
      motivosPrincipales([
        { motivo: "ABANDONO", cantidad: 9 },
        { motivo: "OTRO", cantidad: 5 },
        { motivo: "CAMBIO_PLAN", cantidad: 4 },
        { motivo: "MUDANZA", cantidad: 3 },
        { motivo: "SALUD", cantidad: 2 },
        { motivo: null, cantidad: 1 },
      ]),
    ).toEqual([
      { nombre: "Abandono", cantidad: 9, secundario: false },
      { nombre: "Cambio de plan", cantidad: 4, secundario: true },
      { nombre: "Mudanza", cantidad: 3, secundario: false },
      { nombre: "Otros", cantidad: 8, secundario: true },
    ]);
  });

  it("sin el resto no agrega Otros; Otro y las bajas sin motivo van ahí", () => {
    expect(motivosPrincipales([{ motivo: "SALUD", cantidad: 2 }])).toEqual([{ nombre: "Salud", cantidad: 2, secundario: false }]);
    expect(motivosPrincipales([{ motivo: null, cantidad: 2 }])).toEqual([{ nombre: "Otros", cantidad: 2, secundario: true }]);
  });
});

describe("conSigno", () => {
  it.each([
    [3, "+3"],
    [-2, "−2"],
    [0, "="],
  ])("%s es %s", (valor, texto) => {
    expect(conSigno(valor)).toBe(texto);
  });
});
