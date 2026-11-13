import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOGO_PARAMETROS } from "../parametros-sistema.catalogo.js";
import type { ParametrosSistemaRepository } from "../parametros-sistema.repository.js";
import { ParametrosSistemaService } from "../parametros-sistema.service.js";

describe("ParametrosSistemaService", () => {
  let repositorio: {
    buscarValor: ReturnType<typeof vi.fn>;
    listar: ReturnType<typeof vi.fn>;
    guardar: ReturnType<typeof vi.fn>;
  };
  let servicio: ParametrosSistemaService;

  beforeEach(() => {
    repositorio = { buscarValor: vi.fn(), listar: vi.fn(), guardar: vi.fn() };
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

  describe("listar", () => {
    it("devuelve todos los del catálogo, en su orden, con el valor inicial de los que no tienen fila", async () => {
      repositorio.listar.mockResolvedValue([]);

      const parametros = await servicio.listar();

      expect(parametros.map(({ clave }) => clave)).toEqual(Object.keys(CATALOGO_PARAMETROS));
      expect(parametros.every(({ fecha_actualizacion }) => fecha_actualizacion === null)).toBe(true);
      expect(parametros.find(({ clave }) => clave === "DIAS_RESERVA_PREINSCRIPCION")).toMatchObject({
        tipo_dato: "ENTERO",
        valor: 3,
        descripcion: CATALOGO_PARAMETROS.DIAS_RESERVA_PREINSCRIPCION.descripcion,
      });
    });

    it("usa el valor y la fecha guardados y convierte cada uno a su tipo", async () => {
      const fecha = new Date("2026-10-11T12:00:00Z");
      repositorio.listar.mockResolvedValue([
        { clave: "VENCIDOS_PUEDEN_ASISTIR", valor: "false", fecha_actualizacion: fecha },
        { clave: "DATOS_BANCARIOS_ALIAS", valor: "mifr.centro", fecha_actualizacion: fecha },
      ]);

      const parametros = await servicio.listar();

      expect(parametros.find(({ clave }) => clave === "VENCIDOS_PUEDEN_ASISTIR")).toMatchObject({
        valor: false,
        fecha_actualizacion: fecha,
      });
      expect(parametros.find(({ clave }) => clave === "DATOS_BANCARIOS_ALIAS")).toMatchObject({
        valor: "mifr.centro",
        fecha_actualizacion: fecha,
      });
    });

    it("ignora las filas que no están en el catálogo", async () => {
      repositorio.listar.mockResolvedValue([
        { clave: "PARAMETRO_VIEJO", valor: "1", fecha_actualizacion: new Date() },
      ]);

      expect(await servicio.listar()).toHaveLength(Object.keys(CATALOGO_PARAMETROS).length);
    });
  });

  describe("actualizar", () => {
    it("guarda el valor como texto con el tipo y la descripción del catálogo y devuelve el parámetro", async () => {
      const fecha = new Date("2026-10-11T12:00:00Z");
      repositorio.guardar.mockResolvedValue({
        clave: "DIAS_RESERVA_PREINSCRIPCION",
        valor: "7",
        fecha_actualizacion: fecha,
      });

      const parametro = await servicio.actualizar("DIAS_RESERVA_PREINSCRIPCION", 7);

      expect(repositorio.guardar).toHaveBeenCalledWith(
        "DIAS_RESERVA_PREINSCRIPCION",
        "7",
        "ENTERO",
        CATALOGO_PARAMETROS.DIAS_RESERVA_PREINSCRIPCION.descripcion,
      );
      expect(parametro).toEqual({
        clave: "DIAS_RESERVA_PREINSCRIPCION",
        tipo_dato: "ENTERO",
        valor: 7,
        descripcion: CATALOGO_PARAMETROS.DIAS_RESERVA_PREINSCRIPCION.descripcion,
        fecha_actualizacion: fecha,
      });
    });

    it.each([
      ["DIAS_RESERVA_PREINSCRIPCION", -1],
      ["MINUTOS_CIERRE_ASISTENCIA", -5],
      ["DIAS_RESERVA_PREINSCRIPCION", "3"],
      ["VENCIDOS_PUEDEN_ASISTIR", "true"],
    ] as const)("rechaza %s con el valor %j sin guardar nada", async (clave, valor) => {
      await expect(servicio.actualizar(clave, valor)).rejects.toThrow();

      expect(repositorio.guardar).not.toHaveBeenCalled();
    });
  });

  it("obtenerDatosBancarios junta el CBU, el alias y el titular", async () => {
    repositorio.buscarValor.mockImplementation(
      async (clave: string) =>
        ({
          DATOS_BANCARIOS_CBU: "0000003100012345678901",
          DATOS_BANCARIOS_ALIAS: "mifr.centro",
          DATOS_BANCARIOS_TITULAR: "María Fernández",
        })[clave] ?? null,
    );

    expect(await servicio.obtenerDatosBancarios()).toEqual({
      cbu: "0000003100012345678901",
      alias: "mifr.centro",
      titular: "María Fernández",
    });
  });

  it("obtenerDatosBancarios devuelve textos vacíos hasta que la propietaria los carga", async () => {
    repositorio.buscarValor.mockResolvedValue(null);

    expect(await servicio.obtenerDatosBancarios()).toEqual({ cbu: "", alias: "", titular: "" });
  });
});
