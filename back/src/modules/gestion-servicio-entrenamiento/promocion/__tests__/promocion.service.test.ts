import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error.js";
import type { PromocionRepository } from "../promocion.repository.js";
import { estadoDePromocion, PromocionService } from "../promocion.service.js";

// 01:00 UTC del 13/10: en Argentina todavía es el 12.
const AHORA = new Date("2026-10-13T01:00:00Z");
const HOY = new Date("2026-10-12T00:00:00Z");
const dia = (texto: string) => new Date(`${texto}T00:00:00Z`);

const guardada = {
  id_promocion: 4,
  nombre: "Verano",
  tipo_descuento: "PORCENTAJE" as const,
  valor: 20,
  fecha_desde: dia("2026-10-01"),
  fecha_hasta: dia("2026-10-31"),
  activo: true,
  planes: [{ id_plan: 1, nombre: "Básico" }],
};

const alta = {
  nombre: "Verano",
  tipo_descuento: "PORCENTAJE" as const,
  valor: 20,
  fecha_desde: dia("2026-10-01"),
  fecha_hasta: dia("2026-10-31"),
  ids_planes: [1],
};

function crearRepositorioMock() {
  return {
    listar: vi.fn().mockResolvedValue([guardada]),
    buscarPorId: vi.fn().mockResolvedValue(guardada),
    guardar: vi.fn().mockResolvedValue({ resultado: "ok", promocion: guardada }),
    desactivar: vi.fn().mockResolvedValue({ ...guardada, activo: false }),
    vigenteParaPlan: vi.fn(),
    buscarAplicable: vi.fn(),
  };
}

describe("estadoDePromocion", () => {
  it.each([
    ["DESACTIVADA", { activo: false }],
    ["PROGRAMADA", { fecha_desde: dia("2026-10-13") }],
    ["ACTIVA", { fecha_desde: HOY }],
    ["ACTIVA", { fecha_hasta: HOY }],
    ["VENCIDA", { fecha_hasta: dia("2026-10-11") }],
    ["DESACTIVADA", { activo: false, fecha_hasta: dia("2026-10-11") }],
  ])("%s con %j", (estado, cambio) => {
    expect(estadoDePromocion({ ...guardada, ...cambio }, HOY)).toBe(estado);
  });
});

describe("PromocionService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let servicio: PromocionService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    repositorio = crearRepositorioMock();
    servicio = new PromocionService(repositorio as unknown as PromocionRepository);
  });

  afterEach(() => vi.useRealTimers());

  it("listar calcula el estado con el día de Argentina", async () => {
    await expect(servicio.listar({ estado: "ACTIVA" })).resolves.toEqual([{ ...guardada, estado: "ACTIVA" }]);
    expect(repositorio.listar).toHaveBeenCalledWith({ estado: "ACTIVA" }, HOY);
  });

  it("obtenerPorId lanza NotFoundError si no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.obtenerPorId(9)).rejects.toBeInstanceOf(NotFoundError);
  });

  describe("crear", () => {
    it("guarda la promoción y la devuelve con su estado", async () => {
      await expect(servicio.crear(alta)).resolves.toMatchObject({ id_promocion: 4, estado: "ACTIVA" });
      expect(repositorio.guardar).toHaveBeenCalledWith(alta);
    });

    it("rechaza una promoción que ya terminó, y acepta una que termina hoy", async () => {
      await expect(servicio.crear({ ...alta, fecha_hasta: dia("2026-10-11") })).rejects.toBeInstanceOf(
        ValidationError,
      );
      await expect(servicio.crear({ ...alta, fecha_hasta: HOY })).resolves.toBeDefined();
    });

    it.each([[{ resultado: "superpuesta", id_plan: 1 }]])(
      "responde 409 si el repositorio informa %j",
      async (resultado) => {
        repositorio.guardar.mockResolvedValue(resultado);

        await expect(servicio.crear(alta)).rejects.toBeInstanceOf(ConflictError);
      },
    );
  });

  describe("actualizar", () => {
    it("guarda los datos resultantes del cambio, con los planes que tenía si no vienen", async () => {
      await servicio.actualizar(4, { valor: 15 });

      expect(repositorio.guardar).toHaveBeenCalledWith(
        {
          nombre: "Verano",
          tipo_descuento: "PORCENTAJE",
          valor: 15,
          fecha_desde: dia("2026-10-01"),
          fecha_hasta: dia("2026-10-31"),
          ids_planes: [1],
        },
        4,
      );
    });

    it("reemplaza los planes y el resto de los campos que vienen", async () => {
      await servicio.actualizar(4, {
        nombre: "Otro",
        tipo_descuento: "MONTO_FIJO",
        valor: 500,
        fecha_desde: dia("2026-10-05"),
        fecha_hasta: dia("2026-11-05"),
        ids_planes: [2, 3],
      });

      expect(repositorio.guardar.mock.calls[0][0]).toMatchObject({ nombre: "Otro", ids_planes: [2, 3] });
    });

    it.each([
      ["vencida", { fecha_hasta: dia("2026-10-11") }],
      ["desactivada", { activo: false }],
    ])("no edita una promoción %s", async (_caso, cambio) => {
      repositorio.buscarPorId.mockResolvedValue({ ...guardada, ...cambio });

      await expect(servicio.actualizar(4, { valor: 15 })).rejects.toBeInstanceOf(ConflictError);
      expect(repositorio.guardar).not.toHaveBeenCalled();
    });

    it.each([
      ["un porcentaje de 100 con el tipo guardado", { valor: 100 }],
      ["una fecha hasta anterior a la desde guardada", { fecha_hasta: dia("2026-09-30") }],
    ])("rechaza %s", async (_caso, cambio) => {
      await expect(servicio.actualizar(4, cambio)).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("desactivar", () => {
    it("desactiva una activa", async () => {
      await expect(servicio.desactivar(4)).resolves.toMatchObject({ estado: "DESACTIVADA" });
    });

    it("responde 409 si ya estaba desactivada", async () => {
      repositorio.desactivar.mockResolvedValue(null);

      await expect(servicio.desactivar(4)).rejects.toBeInstanceOf(ConflictError);
    });
  });

  it("vigenteParaPlan se delega en el repositorio", async () => {
    repositorio.vigenteParaPlan.mockResolvedValue("vigente");

    await expect(servicio.vigenteParaPlan(1, HOY)).resolves.toBe("vigente");
    expect(repositorio.vigenteParaPlan).toHaveBeenCalledWith(1, HOY);
  });

  describe("descuentoAplicable", () => {
    const aplicable = { id_promocion: 4, nombre: "Verano" };

    it.each([
      ["un porcentaje, redondeado a centavos", "PORCENTAJE", 15, 25000.55, 3750.08],
      ["un monto fijo", "MONTO_FIJO", 5000, 25000, 5000],
      [
        "un monto fijo igual o mayor al precio, dejando un centavo para cobrar",
        "MONTO_FIJO",
        30000,
        25000,
        24999.99,
      ],
      ["un porcentaje sobre un precio de un centavo, sin descuento", "PORCENTAJE", 50, 0.01, 0],
    ] as const)("calcula %s", async (_caso, tipo_descuento, valor, precio, descuento) => {
      repositorio.buscarAplicable.mockResolvedValue({ ...aplicable, tipo_descuento, valor });

      await expect(servicio.descuentoAplicable(4, 1, HOY, precio)).resolves.toMatchObject({ descuento });
      expect(repositorio.buscarAplicable).toHaveBeenCalledWith(4, 1, HOY);
    });

    it("devuelve null si la promoción ya no aplica", async () => {
      repositorio.buscarAplicable.mockResolvedValue(null);

      await expect(servicio.descuentoAplicable(4, 1, HOY, 25000)).resolves.toBeNull();
    });
  });
});
