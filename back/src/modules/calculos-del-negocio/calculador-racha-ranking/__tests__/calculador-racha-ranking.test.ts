import { describe, expect, it } from "vitest";
import { CalculadorRachaRanking } from "../calculador-racha-ranking.js";
import type { FilaParaRanking, MarcaDeHistorial } from "../calculador-racha-ranking.types.js";

const calculador = new CalculadorRachaRanking();

// Una marca por día desde el 1/10/2026, en el orden de la cadena: "P" presente, "A" ausente.
function marcas(secuencia: string): MarcaDeHistorial[] {
  return [...secuencia].map((letra, indice) => ({
    asistio: letra === "P",
    inicio: new Date(Date.UTC(2026, 9, 1 + indice, 21)),
  }));
}

function dia(numero: number): Date {
  return new Date(Date.UTC(2026, 9, numero, 21));
}

function fila(datos: Partial<FilaParaRanking> & Pick<FilaParaRanking, "id_alumno">): FilaParaRanking {
  return { nombre: "Ana", apellido: "Pérez", clases_asistidas: 4, porcentaje_asistencia: 100, ...datos };
}

describe("CalculadorRachaRanking", () => {
  describe("resumirRacha", () => {
    it("sin marcas no hay racha", () => {
      expect(calculador.resumirRacha([])).toEqual({
        actual: 0,
        mejor: 0,
        inicio_actual: null,
        clases_asistidas: 0,
      });
    });

    it("cuenta las clases seguidas y la fecha en que empezó la racha", () => {
      expect(calculador.resumirRacha(marcas("PPP"))).toEqual({
        actual: 3,
        mejor: 3,
        inicio_actual: dia(1),
        clases_asistidas: 3,
      });
    });

    it("una inasistencia corta la racha y conserva la mejor", () => {
      expect(calculador.resumirRacha(marcas("PPPAPP"))).toEqual({
        actual: 2,
        mejor: 3,
        inicio_actual: dia(5),
        clases_asistidas: 5,
      });
    });

    it("si la última fue una inasistencia la racha actual es 0", () => {
      expect(calculador.resumirRacha(marcas("PPA"))).toMatchObject({
        actual: 0,
        mejor: 2,
        inicio_actual: null,
      });
    });
  });

  describe("cuandoSeAlcanzo", () => {
    it("RACHA devuelve el inicio de la clase que completó el umbral por primera vez", () => {
      expect(calculador.cuandoSeAlcanzo(marcas("PPAPPPPP"), "RACHA", 3)).toEqual(dia(6));
    });

    it("RACHA no cuenta asistencias separadas por una falta", () => {
      expect(calculador.cuandoSeAlcanzo(marcas("PPAPP"), "RACHA", 3)).toBeNull();
    });

    it("TOTAL_CLASES suma las asistencias aunque haya faltas en el medio", () => {
      expect(calculador.cuandoSeAlcanzo(marcas("PPAPP"), "TOTAL_CLASES", 3)).toEqual(dia(4));
    });

    it("TOTAL_CLASES devuelve null si no llegó al umbral", () => {
      expect(calculador.cuandoSeAlcanzo(marcas("PAP"), "TOTAL_CLASES", 3)).toBeNull();
    });
  });

  describe("porcentaje", () => {
    it.each([
      [3, 4, 75],
      [2, 3, 66.67],
      [4, 4, 100],
      [0, 5, 0],
      [0, 0, 0],
    ])("%i de %i es %d", (asistidas, previstas, esperado) => {
      expect(calculador.porcentaje(asistidas, previstas)).toBe(esperado);
    });
  });

  describe("ordenarRanking", () => {
    it("ordena por porcentaje descendente y numera las posiciones", () => {
      const ordenado = calculador.ordenarRanking([
        fila({ id_alumno: 1, porcentaje_asistencia: 50 }),
        fila({ id_alumno: 2, porcentaje_asistencia: 100 }),
        fila({ id_alumno: 3, porcentaje_asistencia: 75 }),
      ]);
      expect(ordenado.map(({ id_alumno, posicion }) => [id_alumno, posicion])).toEqual([
        [2, 1],
        [3, 2],
        [1, 3],
      ]);
    });

    it("con el mismo porcentaje desempata por clases asistidas descendente", () => {
      const ordenado = calculador.ordenarRanking([
        fila({ id_alumno: 1, clases_asistidas: 4 }),
        fila({ id_alumno: 2, clases_asistidas: 8 }),
      ]);
      expect(ordenado.map(({ id_alumno }) => id_alumno)).toEqual([2, 1]);
    });

    it("con el mismo porcentaje y clases desempata por apellido y nombre sin distinguir acentos", () => {
      const ordenado = calculador.ordenarRanking([
        fila({ id_alumno: 1, apellido: "Zapata", nombre: "Ana" }),
        fila({ id_alumno: 2, apellido: "Álvarez", nombre: "Lucía" }),
        fila({ id_alumno: 3, apellido: "álvarez", nombre: "Beatriz" }),
      ]);
      expect(ordenado.map(({ id_alumno }) => id_alumno)).toEqual([3, 2, 1]);
    });

    it("con todo igual el orden no depende del orden de llegada", () => {
      const ordenado = calculador.ordenarRanking([fila({ id_alumno: 9 }), fila({ id_alumno: 4 })]);
      expect(ordenado.map(({ id_alumno }) => id_alumno)).toEqual([4, 9]);
    });

    it("no modifica la lista recibida", () => {
      const filas = [fila({ id_alumno: 2, porcentaje_asistencia: 10 }), fila({ id_alumno: 1 })];
      calculador.ordenarRanking(filas);
      expect(filas.map(({ id_alumno }) => id_alumno)).toEqual([2, 1]);
    });
  });

  describe("proximoHito", () => {
    it("devuelve el umbral más chico pendiente y cuánto falta", () => {
      expect(calculador.proximoHito(7, [25, 10])).toEqual({ umbral: 10, faltantes: 3 });
    });

    it("un umbral ya alcanzado no es el próximo", () => {
      expect(calculador.proximoHito(10, [10, 25])).toEqual({ umbral: 25, faltantes: 15 });
    });

    it("devuelve null si ya alcanzó todos o no hay umbrales", () => {
      expect(calculador.proximoHito(30, [10, 25])).toBeNull();
      expect(calculador.proximoHito(0, [])).toBeNull();
    });
  });
});
