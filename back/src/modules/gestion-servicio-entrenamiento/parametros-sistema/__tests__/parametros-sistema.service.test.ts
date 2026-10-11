import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOGO_PARAMETROS } from "../parametros-sistema.catalogo.js";
import type { ParametrosSistemaRepository } from "../parametros-sistema.repository.js";
import { ParametrosSistemaService } from "../parametros-sistema.service.js";

describe("ParametrosSistemaService", () => {
  let repositorio: { buscarValor: ReturnType<typeof vi.fn> };
  let servicio: ParametrosSistemaService;

  beforeEach(() => {
    repositorio = { buscarValor: vi.fn() };
    servicio = new ParametrosSistemaService(repositorio as unknown as ParametrosSistemaRepository);
  });

  it("obtener convierte un ENTERO en número", async () => {
    repositorio.buscarValor.mockResolvedValue("5");

    expect(await servicio.obtener("DIAS_RESERVA_PREINSCRIPCION")).toBe(5);
    expect(repositorio.buscarValor).toHaveBeenCalledWith("DIAS_RESERVA_PREINSCRIPCION");
  });

  it.each([
    ["true", true],
    ["false", false],
  ])("obtener convierte el BOOLEANO %s", async (guardado, esperado) => {
    repositorio.buscarValor.mockResolvedValue(guardado);

    expect(await servicio.obtener("VENCIDOS_PUEDEN_ASISTIR")).toBe(esperado);
  });

  it("obtener devuelve un TEXTO tal como está guardado", async () => {
    repositorio.buscarValor.mockResolvedValue("mifr.centro");

    expect(await servicio.obtener("DATOS_BANCARIOS_ALIAS")).toBe("mifr.centro");
  });

  it("obtener usa el valor inicial del catálogo si la clave todavía no tiene fila", async () => {
    repositorio.buscarValor.mockResolvedValue(null);

    expect(await servicio.obtener("DIAS_RESERVA_PREINSCRIPCION")).toBe(3);
  });

  it.each([
    ["DIAS_RESERVA_PREINSCRIPCION", "tres"],
    ["DIAS_RESERVA_PREINSCRIPCION", "2.5"],
    ["DIAS_RESERVA_PREINSCRIPCION", ""],
    ["VENCIDOS_PUEDEN_ASISTIR", "si"],
  ] as const)("obtener rechaza %s con el valor %j, que no respeta su tipo", async (clave, guardado) => {
    repositorio.buscarValor.mockResolvedValue(guardado);

    await expect(servicio.obtener(clave)).rejects.toThrow(`El parámetro ${clave} tiene el valor`);
  });

  it("el catálogo da un valor inicial válido para cada parámetro y entra en las columnas del DER", async () => {
    repositorio.buscarValor.mockResolvedValue(null);

    for (const [clave, definicion] of Object.entries(CATALOGO_PARAMETROS)) {
      await expect(servicio.obtener(clave as keyof typeof CATALOGO_PARAMETROS)).resolves.toBeDefined();
      expect(clave.length).toBeLessThanOrEqual(50);
      expect(definicion.valor_inicial.length).toBeLessThanOrEqual(100);
      expect(definicion.descripcion.length).toBeLessThanOrEqual(150);
    }
  });
});
