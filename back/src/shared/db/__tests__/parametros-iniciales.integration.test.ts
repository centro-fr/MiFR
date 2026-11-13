import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearPrismaDePrueba, reiniciarBase } from "../../../__tests__/integracion/base-de-prueba.js";
import { CATALOGO_PARAMETROS } from "../../../modules/gestion-servicio-entrenamiento/parametros-sistema/parametros-sistema.catalogo.js";
import { cargarParametrosIniciales } from "../parametros-iniciales.js";

const prisma = crearPrismaDePrueba();

beforeEach(() => reiniciarBase(prisma));
afterAll(() => prisma.$disconnect());

describe("cargarParametrosIniciales", () => {
  it("deja cada parámetro del catálogo con su tipo y su valor inicial", async () => {
    const filas = await prisma.parametros_sistema.findMany();
    // Se ordenan los dos lados acá: la intercalación de la base puede ordenar "DIAS_" y "DIA_C" distinto
    // que JavaScript, y eso no es lo que se prueba.
    const porClave = (a: { clave: string }, b: { clave: string }) =>
      a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0;

    expect(filas.map(({ clave, tipo_dato, valor }) => ({ clave, tipo_dato, valor })).sort(porClave)).toEqual(
      Object.entries(CATALOGO_PARAMETROS)
        .map(([clave, { tipo_dato, valor_inicial }]) => ({ clave, tipo_dato, valor: valor_inicial }))
        .sort(porClave),
    );
    expect(filas.every(({ fecha_actualizacion }) => fecha_actualizacion instanceof Date)).toBe(true);
  });

  it("volver a correrlo no pisa un valor que la propietaria cambió", async () => {
    await prisma.parametros_sistema.update({
      where: { clave: "DIAS_RESERVA_PREINSCRIPCION" },
      data: { valor: "7" },
    });

    await cargarParametrosIniciales(prisma);

    const parametro = await prisma.parametros_sistema.findUniqueOrThrow({
      where: { clave: "DIAS_RESERVA_PREINSCRIPCION" },
    });
    expect(parametro.valor).toBe("7");
  });

  it("vuelve a crear un parámetro que falta", async () => {
    await prisma.parametros_sistema.delete({ where: { clave: "DIAS_RESERVA_PREINSCRIPCION" } });

    await cargarParametrosIniciales(prisma);

    expect(await prisma.parametros_sistema.count()).toBe(Object.keys(CATALOGO_PARAMETROS).length);
  });

  it("la base rechaza un tipo de dato fuera del DER", async () => {
    await expect(
      prisma.$executeRaw`UPDATE parametros_sistema SET tipo_dato = 'FECHA' WHERE clave = 'DIAS_RESERVA_PREINSCRIPCION'`,
    ).rejects.toThrow();
  });
});
