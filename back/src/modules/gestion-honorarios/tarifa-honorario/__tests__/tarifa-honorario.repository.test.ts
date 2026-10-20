import { Prisma, type PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegistrarTarifaInput } from "../tarifa-honorario.schemas.js";
import { TarifaHonorarioRepository } from "../tarifa-honorario.repository.js";

const transaccion = {
  $executeRaw: vi.fn(),
  tarifas_honorario: {
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
};

const prisma = {
  $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  tarifas_honorario: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
};

const HOY = new Date("2026-10-20T00:00:00Z");

function fecha(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function fila(parcial: Record<string, unknown> = {}) {
  return {
    id_tarifa: 1,
    id_profesora: 10,
    concepto: "ALUMNO_A_CARGO",
    id_plan: null,
    tipo_valor: "MONTO_FIJO",
    valor: new Prisma.Decimal("5000.50"),
    fecha_vigencia_desde: fecha("2026-01-01"),
    fecha_vigencia_hasta: null,
    ...parcial,
  };
}

const NUEVA: RegistrarTarifaInput = {
  id_profesora: 10,
  concepto: "ALUMNO_A_CARGO",
  id_plan: null,
  tipo_valor: "MONTO_FIJO",
  valor: 6000,
  fecha_vigencia_desde: fecha("2026-11-01"),
};

describe("TarifaHonorarioRepository", () => {
  let repositorio: TarifaHonorarioRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-20T15:00:00Z"));
    repositorio = new TarifaHonorarioRepository(prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("listar", () => {
    it("sin filtros trae todas, ordenadas por profesora, concepto y vigencia, con el valor como número", async () => {
      prisma.tarifas_honorario.findMany.mockResolvedValue([fila()]);

      const tarifas = await repositorio.listar({});

      expect(prisma.tarifas_honorario.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ id_profesora: "asc" }, { concepto: "asc" }, { fecha_vigencia_desde: "desc" }],
      });
      expect(tarifas).toEqual([{ ...fila(), valor: 5000.5 }]);
    });

    it("filtra por profesora y, con soloVigentes, deja las abiertas o que vencen hoy o después", async () => {
      prisma.tarifas_honorario.findMany.mockResolvedValue([]);

      await repositorio.listar({ id_profesora: 10, soloVigentes: true });

      expect(prisma.tarifas_honorario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id_profesora: 10,
            OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: HOY } }],
          },
        }),
      );
    });
  });

  describe("buscarPorId", () => {
    it("devuelve la tarifa con el valor como número", async () => {
      prisma.tarifas_honorario.findUnique.mockResolvedValue(fila());

      const tarifa = await repositorio.buscarPorId(1);

      expect(prisma.tarifas_honorario.findUnique).toHaveBeenCalledWith({ where: { id_tarifa: 1 } });
      expect(tarifa?.valor).toBe(5000.5);
    });

    it("devuelve null si no existe", async () => {
      prisma.tarifas_honorario.findUnique.mockResolvedValue(null);

      expect(await repositorio.buscarPorId(99)).toBeNull();
    });
  });

  describe("registrar", () => {
    it("reemplaza las programadas sin uso, cierra la abierta el día anterior y crea la nueva", async () => {
      transaccion.tarifas_honorario.findFirst.mockResolvedValue(null);
      transaccion.tarifas_honorario.create.mockResolvedValue(
        fila({ id_tarifa: 2, valor: new Prisma.Decimal("6000"), fecha_vigencia_desde: fecha("2026-11-01") }),
      );
      const alcance = { id_profesora: 10, concepto: "ALUMNO_A_CARGO", id_plan: null };

      const tarifa = await repositorio.registrar(NUEVA);

      expect(transaccion.$executeRaw.mock.calls[0]?.[1]).toBe("tarifas-honorario:10:ALUMNO_A_CARGO:todos");
      expect(transaccion.tarifas_honorario.deleteMany).toHaveBeenCalledWith({
        where: {
          ...alcance,
          fecha_vigencia_desde: { gte: fecha("2026-11-01"), gt: HOY },
          detalles: { none: {} },
        },
      });
      expect(transaccion.tarifas_honorario.findFirst).toHaveBeenCalledWith({
        where: { ...alcance, fecha_vigencia_desde: { gte: fecha("2026-11-01") } },
      });
      expect(transaccion.tarifas_honorario.updateMany).toHaveBeenCalledWith({
        where: {
          ...alcance,
          fecha_vigencia_desde: { lt: fecha("2026-11-01") },
          OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: fecha("2026-11-01") } }],
        },
        data: { fecha_vigencia_hasta: fecha("2026-10-31") },
      });
      expect(transaccion.tarifas_honorario.create).toHaveBeenCalledWith({ data: NUEVA });
      expect(tarifa).toMatchObject({ id_tarifa: 2, valor: 6000 });
    });

    it("bloquea por plan cuando la tarifa es de un plan", async () => {
      transaccion.tarifas_honorario.findFirst.mockResolvedValue(null);
      transaccion.tarifas_honorario.create.mockResolvedValue(fila({ id_plan: 7 }));

      await repositorio.registrar({ ...NUEVA, id_plan: 7 });

      expect(transaccion.$executeRaw.mock.calls[0]?.[1]).toBe("tarifas-honorario:10:ALUMNO_A_CARGO:7");
    });

    it("devuelve null y no cierra ni crea nada si queda una tarifa que empieza en esa fecha o después", async () => {
      transaccion.tarifas_honorario.findFirst.mockResolvedValue(fila({ fecha_vigencia_desde: HOY }));

      expect(await repositorio.registrar(NUEVA)).toBeNull();
      expect(transaccion.tarifas_honorario.updateMany).not.toHaveBeenCalled();
      expect(transaccion.tarifas_honorario.create).not.toHaveBeenCalled();
    });
  });

  describe("cerrar", () => {
    it("pone la fecha de fin de vigencia y devuelve la tarifa", async () => {
      prisma.tarifas_honorario.update.mockResolvedValue(fila({ fecha_vigencia_hasta: fecha("2026-10-31") }));

      const tarifa = await repositorio.cerrar(1, fecha("2026-10-31"));

      expect(prisma.tarifas_honorario.update).toHaveBeenCalledWith({
        where: { id_tarifa: 1 },
        data: { fecha_vigencia_hasta: fecha("2026-10-31") },
      });
      expect(tarifa.fecha_vigencia_hasta).toEqual(fecha("2026-10-31"));
    });
  });
});
