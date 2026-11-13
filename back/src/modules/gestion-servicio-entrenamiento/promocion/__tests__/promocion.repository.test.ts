import { Prisma, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromocionRepository } from "../promocion.repository.js";

const HOY = new Date("2026-10-12T00:00:00Z");
const DESDE = new Date("2026-10-01T00:00:00Z");
const HASTA = new Date("2026-10-31T00:00:00Z");
const decimal = (valor: number) => new Prisma.Decimal(valor);

const fila = {
  id_promocion: 4,
  nombre: "Verano",
  tipo_descuento: "PORCENTAJE",
  valor: decimal(20),
  fecha_desde: DESDE,
  fecha_hasta: HASTA,
  activo: true,
  planes: [{ plan: { id_plan: 1, nombre: "Básico" } }],
};
const promocion = { ...fila, valor: 20, planes: [{ id_plan: 1, nombre: "Básico" }] };
const datos = {
  nombre: "Verano",
  tipo_descuento: "PORCENTAJE" as const,
  valor: 20,
  fecha_desde: DESDE,
  fecha_hasta: HASTA,
  ids_planes: [2, 1],
};

const transaccion = {
  $executeRaw: vi.fn(),
  promocion_planes: { findFirst: vi.fn() },
  promociones: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
};
const prisma = {
  $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  promociones: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
};

describe("PromocionRepository", () => {
  let repositorio: PromocionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    transaccion.promocion_planes.findFirst.mockResolvedValue(null);
    transaccion.promociones.findFirst.mockResolvedValue(null);
    transaccion.promociones.create.mockResolvedValue(fila);
    transaccion.promociones.update.mockResolvedValue(fila);
    repositorio = new PromocionRepository(prisma as unknown as PrismaClient);
  });

  describe("listar", () => {
    it.each([
      ["ACTIVA", { activo: true, fecha_desde: { lte: HOY }, fecha_hasta: { gte: HOY } }],
      ["PROGRAMADA", { activo: true, fecha_desde: { gt: HOY } }],
      ["VENCIDA", { activo: true, fecha_hasta: { lt: HOY } }],
      ["DESACTIVADA", { activo: false }],
    ] as const)("filtra en la base el estado %s", async (estado, where) => {
      prisma.promociones.findMany.mockResolvedValue([fila]);

      await expect(repositorio.listar({ estado }, HOY)).resolves.toEqual([promocion]);
      expect(prisma.promociones.findMany.mock.calls[0][0].where).toEqual(where);
    });

    it("filtra por plan y pagina, de la más nueva a la más vieja", async () => {
      prisma.promociones.findMany.mockResolvedValue([]);

      await repositorio.listar({ id_plan: 3, limit: 10, offset: 20 }, HOY);

      expect(prisma.promociones.findMany.mock.calls[0][0]).toMatchObject({
        where: { planes: { some: { id_plan: 3 } } },
        orderBy: [{ fecha_desde: "desc" }, { id_promocion: "desc" }],
        take: 10,
        skip: 20,
      });
    });

    it("sin paginación trae hasta el máximo", async () => {
      prisma.promociones.findMany.mockResolvedValue([]);

      await repositorio.listar({}, HOY);

      expect(prisma.promociones.findMany.mock.calls[0][0]).toMatchObject({ where: {}, take: 100, skip: 0 });
    });
  });

  it("buscarPorId trae la promoción con sus planes, o null", async () => {
    prisma.promociones.findUnique.mockResolvedValueOnce(fila).mockResolvedValueOnce(null);

    await expect(repositorio.buscarPorId(4)).resolves.toEqual(promocion);
    await expect(repositorio.buscarPorId(5)).resolves.toBeNull();
  });

  describe("guardar", () => {
    it("bloquea cada plan en orden, revisa la superposición y crea la promoción activa con sus planes", async () => {
      await expect(repositorio.guardar(datos)).resolves.toEqual({ resultado: "ok", promocion });

      expect(transaccion.$executeRaw.mock.calls.map((llamada) => llamada[1])).toEqual([
        "promocion-plan:1",
        "promocion-plan:2",
      ]);
      expect(transaccion.promocion_planes.findFirst.mock.calls[0][0].where).toEqual({
        id_plan: { in: [2, 1] },
        promocion: {
          id_promocion: { not: undefined },
          activo: true,
          fecha_desde: { lte: HASTA },
          fecha_hasta: { gte: DESDE },
        },
      });
      const { ids_planes: _, ...columnas } = datos;
      expect(transaccion.promociones.create.mock.calls[0][0].data).toEqual({
        ...columnas,
        activo: true,
        planes: { create: [{ id_plan: 2 }, { id_plan: 1 }] },
      });
    });

    it("al editar no se compara consigo misma y reemplaza los planes", async () => {
      await repositorio.guardar(datos, 4);

      expect(transaccion.promocion_planes.findFirst.mock.calls[0][0].where.promocion.id_promocion).toEqual({
        not: 4,
      });
      expect(transaccion.promociones.update.mock.calls[0][0]).toMatchObject({
        where: { id_promocion: 4 },
        data: { planes: { deleteMany: {}, create: [{ id_plan: 2 }, { id_plan: 1 }] } },
      });
      expect(transaccion.promociones.create).not.toHaveBeenCalled();
    });

    it("no guarda si se superpone con otra activa en un plan", async () => {
      transaccion.promocion_planes.findFirst.mockResolvedValue({ id_plan: 2 });

      await expect(repositorio.guardar(datos)).resolves.toEqual({ resultado: "superpuesta", id_plan: 2 });
      expect(transaccion.promociones.create).not.toHaveBeenCalled();
    });
  });

  it("desactivar solo cambia una activa y la devuelve; null si ya no lo estaba", async () => {
    transaccion.promociones.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    transaccion.promociones.findUniqueOrThrow.mockResolvedValue({ ...fila, activo: false });

    await expect(repositorio.desactivar(4)).resolves.toMatchObject({ activo: false, valor: 20 });
    expect(transaccion.promociones.updateMany).toHaveBeenCalledWith({
      where: { id_promocion: 4, activo: true },
      data: { activo: false },
    });
    await expect(repositorio.desactivar(4)).resolves.toBeNull();
  });

  it("vigenteParaPlan busca la activa del plan ese día, la más reciente", async () => {
    prisma.promociones.findFirst
      .mockResolvedValueOnce({ ...fila, planes: undefined })
      .mockResolvedValueOnce(null);

    await expect(repositorio.vigenteParaPlan(1, HOY)).resolves.toMatchObject({ id_promocion: 4, valor: 20 });
    expect(prisma.promociones.findFirst.mock.calls[0][0]).toMatchObject({
      where: {
        activo: true,
        fecha_desde: { lte: HOY },
        fecha_hasta: { gte: HOY },
        planes: { some: { id_plan: 1 } },
      },
      orderBy: [{ fecha_desde: "desc" }, { id_promocion: "desc" }],
    });
    await expect(repositorio.vigenteParaPlan(1, HOY)).resolves.toBeNull();
  });

  it("buscarAplicable exige que esa promoción siga activa, vigente y con el plan", async () => {
    prisma.promociones.findFirst
      .mockResolvedValueOnce({ ...fila, planes: undefined })
      .mockResolvedValueOnce(null);

    await expect(repositorio.buscarAplicable(4, 1, HOY)).resolves.toMatchObject({
      id_promocion: 4,
      valor: 20,
    });
    expect(prisma.promociones.findFirst.mock.calls[0][0].where).toEqual({
      id_promocion: 4,
      activo: true,
      fecha_desde: { lte: HOY },
      fecha_hasta: { gte: HOY },
      planes: { some: { id_plan: 1 } },
    });
    await expect(repositorio.buscarAplicable(4, 1, HOY)).resolves.toBeNull();
  });
});
