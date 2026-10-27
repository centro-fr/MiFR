import { Prisma, type PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiquidacionRepository } from "../liquidacion.repository.js";
import type { BorradorLiquidacion } from "../liquidacion.types.js";

const transaccion = {
  $executeRaw: vi.fn(),
  liquidaciones: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  liquidacion_detalles: { deleteMany: vi.fn(), createMany: vi.fn(), groupBy: vi.fn() },
};

const prisma = {
  $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  liquidaciones: { findMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  liquidacion_detalles: { groupBy: vi.fn() },
};

function dia(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

const SIN_DESGLOSE = { cantidad_alumnos: 0, subtotal_alumnos: 0, subtotal_suplencias: 0 };

const DESDE = dia("2026-10-01");
const HASTA = dia("2026-10-31");
const PERIODO = { periodo_desde: DESDE, periodo_hasta: HASTA };

function fila(parcial: Record<string, unknown> = {}) {
  return {
    id_liquidacion: 1,
    id_profesora: 10,
    ...PERIODO,
    fecha_liquidacion: new Date("2026-10-20T15:00:00Z"),
    monto_total: new Prisma.Decimal("7000.50"),
    estado: "BORRADOR",
    profesora: { id_profesora: 10, usuario: { nombre: "Ana", apellido: "Paz" } },
    ...parcial,
  };
}

function borrador(idProfesora: number, monto: number): BorradorLiquidacion {
  return {
    id_profesora: idProfesora,
    monto_total: monto,
    detalles: [{ concepto: "ALUMNO_A_CARGO", id_tarifa: 3, id_inscripcion: 5, id_clase: null, monto }],
  };
}

describe("LiquidacionRepository", () => {
  let repositorio: LiquidacionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-20T15:00:00Z"));
    repositorio = new LiquidacionRepository(prisma as unknown as PrismaClient);
    transaccion.liquidaciones.findMany.mockResolvedValue([]);
    transaccion.liquidacion_detalles.groupBy.mockResolvedValue([]);
    prisma.liquidacion_detalles.groupBy.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("guardarBorradores", () => {
    it("crea el borrador de la profesora que todavía no tiene liquidación, con sus detalles", async () => {
      transaccion.liquidaciones.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([fila({ monto_total: new Prisma.Decimal("5000") })]);

      const resultado = await repositorio.guardarBorradores(DESDE, HASTA, [borrador(10, 5000)]);

      expect(transaccion.$executeRaw.mock.calls[0]?.[1]).toBe("liquidaciones-periodo:2026-10-01");
      expect(transaccion.liquidaciones.create).toHaveBeenCalledWith({
        data: {
          id_profesora: 10,
          ...PERIODO,
          monto_total: 5000,
          estado: "BORRADOR",
          detalles: { create: borrador(10, 5000).detalles },
        },
      });
      expect(transaccion.liquidaciones.update).not.toHaveBeenCalled();
      expect(resultado.sin_recalcular).toEqual([]);
      expect(resultado.liquidaciones).toEqual([
        expect.objectContaining({ id_liquidacion: 1, monto_total: 5000, ...SIN_DESGLOSE }),
      ]);
      expect(transaccion.liquidaciones.findMany).toHaveBeenLastCalledWith({
        where: PERIODO,
        include: expect.anything(),
        orderBy: { id_profesora: "asc" },
      });
    });

    it("recalcula un borrador existente: borra sus detalles, actualiza el total y los vuelve a crear", async () => {
      transaccion.liquidaciones.findMany
        .mockResolvedValueOnce([fila({ id_liquidacion: 7, estado: "BORRADOR" })])
        .mockResolvedValueOnce([]);

      await repositorio.guardarBorradores(DESDE, HASTA, [borrador(10, 9000)]);

      expect(transaccion.liquidacion_detalles.deleteMany).toHaveBeenCalledWith({
        where: { id_liquidacion: 7 },
      });
      expect(transaccion.liquidaciones.update).toHaveBeenCalledWith({
        where: { id_liquidacion: 7 },
        data: { monto_total: 9000, fecha_liquidacion: new Date("2026-10-20T15:00:00Z") },
      });
      expect(transaccion.liquidacion_detalles.createMany).toHaveBeenCalledWith({
        data: [{ ...borrador(10, 9000).detalles[0], id_liquidacion: 7 }],
      });
      expect(transaccion.liquidaciones.create).not.toHaveBeenCalled();
    });

    it.each(["CERRADA", "PAGADA"])(
      "no toca la liquidación %s y la informa como sin recalcular",
      async (estado) => {
        transaccion.liquidaciones.findMany
          .mockResolvedValueOnce([fila({ estado })])
          .mockResolvedValueOnce([fila({ estado })]);

        const resultado = await repositorio.guardarBorradores(DESDE, HASTA, [borrador(10, 9000)]);

        expect(resultado.sin_recalcular).toEqual([10]);
        expect(transaccion.liquidaciones.create).not.toHaveBeenCalled();
        expect(transaccion.liquidaciones.update).not.toHaveBeenCalled();
        expect(transaccion.liquidacion_detalles.deleteMany).not.toHaveBeenCalled();
      },
    );
  });

  describe("listarPorPeriodo", () => {
    it("trae las liquidaciones del mes con la profesora y el monto como número", async () => {
      prisma.liquidaciones.findMany.mockResolvedValue([fila()]);

      const liquidaciones = await repositorio.listarPorPeriodo(DESDE, HASTA);

      expect(prisma.liquidaciones.findMany).toHaveBeenCalledWith({
        where: PERIODO,
        include: expect.anything(),
        orderBy: { id_profesora: "asc" },
      });
      expect(liquidaciones).toEqual([{ ...fila(), monto_total: 7000.5, ...SIN_DESGLOSE }]);
    });

    it("sin liquidaciones en el mes devuelve una lista vacía y no consulta los detalles", async () => {
      prisma.liquidaciones.findMany.mockResolvedValue([]);

      expect(await repositorio.listarPorPeriodo(DESDE, HASTA)).toEqual([]);
      expect(prisma.liquidacion_detalles.groupBy).not.toHaveBeenCalled();
    });

    it("suma el desglose de cada profesora con una sola consulta agrupada para todo el mes", async () => {
      prisma.liquidaciones.findMany.mockResolvedValue([
        fila(),
        fila({ id_liquidacion: 2, id_profesora: 11 }),
        fila({ id_liquidacion: 3, id_profesora: 12 }),
      ]);
      prisma.liquidacion_detalles.groupBy.mockResolvedValue([
        {
          id_liquidacion: 1,
          concepto: "ALUMNO_A_CARGO",
          _count: { _all: 3 },
          _sum: { monto: new Prisma.Decimal("24000") },
        },
        {
          id_liquidacion: 1,
          concepto: "CLASE_SUPLIDA",
          _count: { _all: 1 },
          _sum: { monto: new Prisma.Decimal("4500.25") },
        },
        {
          id_liquidacion: 1,
          concepto: "DESCUENTO_AUSENCIA",
          _count: { _all: 2 },
          _sum: { monto: new Prisma.Decimal("-10500.25") },
        },
        {
          id_liquidacion: 2,
          concepto: "DESCUENTO_AUSENCIA",
          _count: { _all: 1 },
          _sum: { monto: new Prisma.Decimal("-1500.1") },
        },
      ]);

      const liquidaciones = await repositorio.listarPorPeriodo(DESDE, HASTA);

      expect(prisma.liquidacion_detalles.groupBy).toHaveBeenCalledTimes(1);
      expect(prisma.liquidacion_detalles.groupBy).toHaveBeenCalledWith({
        by: ["id_liquidacion", "concepto"],
        where: { id_liquidacion: { in: [1, 2, 3] } },
        _count: { _all: true },
        _sum: { monto: true },
      });
      expect(
        liquidaciones.map(({ id_liquidacion, cantidad_alumnos, subtotal_alumnos, subtotal_suplencias }) => ({
          id_liquidacion,
          cantidad_alumnos,
          subtotal_alumnos,
          subtotal_suplencias,
        })),
      ).toEqual([
        { id_liquidacion: 1, cantidad_alumnos: 3, subtotal_alumnos: 24000, subtotal_suplencias: -6000 },
        { id_liquidacion: 2, cantidad_alumnos: 0, subtotal_alumnos: 0, subtotal_suplencias: -1500.1 },
        { id_liquidacion: 3, ...SIN_DESGLOSE },
      ]);
    });
  });

  describe("buscarPorId", () => {
    it("devuelve la liquidación con sus detalles por alumno y por clase", async () => {
      prisma.liquidaciones.findUnique.mockResolvedValue({
        ...fila(),
        detalles: [
          {
            id_liq_detalle: 1,
            id_liquidacion: 1,
            id_tarifa: 3,
            concepto: "ALUMNO_A_CARGO",
            id_inscripcion: 5,
            id_clase: null,
            monto: new Prisma.Decimal("5000"),
            inscripcion: {
              estado: "BAJA",
              fecha_baja: new Date("2026-10-20T15:00:00Z"),
              plan: { id_plan: 2, nombre: "Intermedio" },
              alumno: { id_alumno: 8, usuario: { nombre: "Luz", apellido: "Gil" } },
            },
            clase: null,
          },
          {
            id_liq_detalle: 2,
            id_liquidacion: 1,
            id_tarifa: 4,
            concepto: "DESCUENTO_AUSENCIA",
            id_inscripcion: null,
            id_clase: 9,
            monto: new Prisma.Decimal("-1500.25"),
            inscripcion: null,
            clase: {
              fecha_clase: dia("2026-10-05"),
              horario: {
                hora_inicio: new Date("1970-01-01T10:00:00Z"),
                hora_fin: new Date("1970-01-01T11:00:00Z"),
                actividad: { nombre: "Pilates" },
              },
              profesora: { id_profesora: 11, usuario: { nombre: "Carla", apellido: "Ruiz" } },
              suplencias: [
                { profesora_ausente: { id_profesora: 10, usuario: { nombre: "Ana", apellido: "Paz" } } },
              ],
            },
          },
        ],
      });

      const liquidacion = await repositorio.buscarPorId(1);

      expect(prisma.liquidaciones.findUnique).toHaveBeenCalledWith({
        where: { id_liquidacion: 1 },
        include: expect.anything(),
      });
      expect(liquidacion).toMatchObject({ id_liquidacion: 1, monto_total: 7000.5 });
      expect(liquidacion?.detalles).toEqual([
        {
          id_liq_detalle: 1,
          id_tarifa: 3,
          concepto: "ALUMNO_A_CARGO",
          id_inscripcion: 5,
          id_clase: null,
          monto: 5000,
          alumno: { id_alumno: 8, nombre: "Luz", apellido: "Gil" },
          inscripcion: {
            estado: "BAJA",
            fecha_baja: new Date("2026-10-20T15:00:00Z"),
            plan: { id_plan: 2, nombre: "Intermedio" },
          },
          clase: null,
        },
        {
          id_liq_detalle: 2,
          id_tarifa: 4,
          concepto: "DESCUENTO_AUSENCIA",
          id_inscripcion: null,
          id_clase: 9,
          monto: -1500.25,
          alumno: null,
          inscripcion: null,
          clase: {
            fecha_clase: dia("2026-10-05"),
            hora_inicio: new Date("1970-01-01T10:00:00Z"),
            hora_fin: new Date("1970-01-01T11:00:00Z"),
            actividad: "Pilates",
            profesora_titular: { id_profesora: 10, usuario: { nombre: "Ana", apellido: "Paz" } },
            profesora_suplente: { id_profesora: 11, usuario: { nombre: "Carla", apellido: "Ruiz" } },
          },
        },
      ]);
    });

    it("sin suplencia registrada la clase no tiene profesora titular y la suplente es quien la dictó", async () => {
      prisma.liquidaciones.findUnique.mockResolvedValue({
        ...fila(),
        detalles: [
          {
            id_liq_detalle: 2,
            id_liquidacion: 1,
            id_tarifa: 4,
            concepto: "CLASE_SUPLIDA",
            id_inscripcion: null,
            id_clase: 9,
            monto: new Prisma.Decimal("1500"),
            inscripcion: null,
            clase: {
              fecha_clase: dia("2026-10-05"),
              horario: {
                hora_inicio: new Date("1970-01-01T10:00:00Z"),
                hora_fin: new Date("1970-01-01T11:00:00Z"),
                actividad: { nombre: "Pilates" },
              },
              profesora: { id_profesora: 11, usuario: { nombre: "Carla", apellido: "Ruiz" } },
              suplencias: [],
            },
          },
        ],
      });

      const liquidacion = await repositorio.buscarPorId(1);

      expect(liquidacion?.detalles[0]?.clase).toMatchObject({
        profesora_titular: null,
        profesora_suplente: { id_profesora: 11 },
      });
    });

    it("devuelve null si no existe", async () => {
      prisma.liquidaciones.findUnique.mockResolvedValue(null);

      expect(await repositorio.buscarPorId(99)).toBeNull();
    });
  });

  describe("transicionar", () => {
    it.each<[number, boolean]>([
      [1, true],
      [0, false],
    ])("con %i filas actualizadas devuelve %s", async (count, esperado) => {
      prisma.liquidaciones.updateMany.mockResolvedValue({ count });

      expect(await repositorio.transicionar(4, "BORRADOR", "CERRADA")).toBe(esperado);
      expect(prisma.liquidaciones.updateMany).toHaveBeenCalledWith({
        where: { id_liquidacion: 4, estado: "BORRADOR" },
        data: { estado: "CERRADA" },
      });
    });
  });
});
