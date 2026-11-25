import { Prisma, type PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanRepository } from "../plan.repository.js";

const transaccion = {
  $executeRaw: vi.fn(),
  plan_precios: { deleteMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
};

const prisma = {
  $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  planes: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
  plan_precios: { findMany: vi.fn(), findFirst: vi.fn() },
};

const HOY = new Date("2026-10-08T00:00:00Z");
const CON_DATOS = {
  actividad_exclusiva: { select: { id_actividad: true, nombre: true, modalidad: true } },
  precios: {
    where: { OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: HOY } }] },
    orderBy: { fecha_vigencia_desde: "asc" },
  },
};

function filaPrecio(id: number, precio: string, desde: string, hasta: string | null = null) {
  return {
    id_plan_precio: id,
    id_plan: 1,
    precio: new Prisma.Decimal(precio),
    fecha_vigencia_desde: new Date(`${desde}T00:00:00Z`),
    fecha_vigencia_hasta: hasta ? new Date(`${hasta}T00:00:00Z`) : null,
  };
}

function filaPlan(precios: ReturnType<typeof filaPrecio>[] = []) {
  return {
    id_plan: 1,
    tipo: "MENSUAL",
    nombre: "Básico",
    descripcion: null,
    clases_por_semana: 2,
    dias_gracia: 5,
    id_actividad_exclusiva: null,
    profesora_unica: true,
    fecha_alta: HOY,
    fecha_baja: null,
    actividad_exclusiva: null,
    precios,
  };
}

describe("PlanRepository", () => {
  let repositorio: PlanRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T15:00:00Z"));
    repositorio = new PlanRepository(prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("crear da de alta el plan con su precio inicial vigente desde hoy", async () => {
    prisma.planes.create.mockResolvedValue(filaPlan([filaPrecio(1, "25000", "2026-10-08")]));

    const plan = await repositorio.crear({
      tipo: "MENSUAL",
      nombre: "Básico",
      clases_por_semana: 2,
      dias_gracia: 5,
      profesora_unica: true,
      solo_menores: false,
      precio: 25000,
    });

    expect(prisma.planes.create).toHaveBeenCalledWith({
      data: {
        tipo: "MENSUAL",
        nombre: "Básico",
        clases_por_semana: 2,
        dias_gracia: 5,
        profesora_unica: true,
        solo_menores: false,
        fecha_alta: HOY,
        precios: { create: { precio: 25000, fecha_vigencia_desde: HOY } },
      },
      include: CON_DATOS,
    });
    expect(plan.precio_vigente).toMatchObject({ precio: 25000 });
    expect(plan.precio_programado).toBeNull();
    expect(plan).not.toHaveProperty("precios");
  });

  it("separa el precio que rige hoy del aumento programado", async () => {
    prisma.planes.findUnique.mockResolvedValue(
      filaPlan([filaPrecio(1, "25000.50", "2026-09-01", "2026-10-31"), filaPrecio(2, "28000", "2026-11-01")]),
    );

    const plan = await repositorio.buscarPorId(1);

    expect(plan?.precio_vigente).toMatchObject({ id_plan_precio: 1, precio: 25000.5 });
    expect(plan?.precio_programado).toMatchObject({ id_plan_precio: 2, precio: 28000 });
  });

  it("buscarPorId devuelve null si no existe", async () => {
    prisma.planes.findUnique.mockResolvedValue(null);

    await expect(repositorio.buscarPorId(9)).resolves.toBeNull();
    expect(prisma.planes.findUnique).toHaveBeenCalledWith({ where: { id_plan: 9 }, include: CON_DATOS });
  });

  it("listar sin filtros trae los planes vigentes ordenados por nombre", async () => {
    prisma.planes.findMany.mockResolvedValue([filaPlan()]);

    await repositorio.listar({});

    expect(prisma.planes.findMany).toHaveBeenCalledWith({
      where: { fecha_baja: null },
      include: CON_DATOS,
      orderBy: { nombre: "asc" },
    });
  });

  it("listar aplica todos los filtros e incluye los dados de baja si se pide", async () => {
    prisma.planes.findMany.mockResolvedValue([]);

    await repositorio.listar({
      incluirBajas: true,
      tipo: "MENSUAL",
      id_actividad_exclusiva: 4,
      busqueda: "kid",
    });

    expect(prisma.planes.findMany).toHaveBeenCalledWith({
      where: {
        tipo: "MENSUAL",
        id_actividad_exclusiva: 4,
        nombre: { contains: "kid", mode: "insensitive" },
      },
      include: CON_DATOS,
      orderBy: { nombre: "asc" },
    });
  });

  it("existeVigenteConNombre compara el nombre sin distinguir mayúsculas", async () => {
    prisma.planes.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(repositorio.existeVigenteConNombre("básico")).resolves.toBe(true);
    await expect(repositorio.existeVigenteConNombre("básico", 3)).resolves.toBe(false);
    expect(prisma.planes.count).toHaveBeenLastCalledWith({
      where: { fecha_baja: null, nombre: { equals: "básico", mode: "insensitive" }, id_plan: { not: 3 } },
    });
  });

  it("actualizar y darDeBaja modifican el plan y lo devuelven con sus precios", async () => {
    prisma.planes.update.mockResolvedValue(filaPlan());

    await repositorio.actualizar(1, { clases_por_semana: 3 });
    await repositorio.darDeBaja(1);

    expect(prisma.planes.update).toHaveBeenNthCalledWith(1, {
      where: { id_plan: 1 },
      data: { clases_por_semana: 3 },
      include: CON_DATOS,
    });
    expect(prisma.planes.update).toHaveBeenNthCalledWith(2, {
      where: { id_plan: 1 },
      data: { fecha_baja: HOY },
      include: CON_DATOS,
    });
  });

  it("listarPrecios trae el historial del más nuevo al más viejo", async () => {
    prisma.plan_precios.findMany.mockResolvedValue([filaPrecio(2, "28000", "2026-11-01")]);

    await expect(repositorio.listarPrecios(1)).resolves.toEqual([
      expect.objectContaining({ id_plan_precio: 2, precio: 28000 }),
    ]);
    expect(prisma.plan_precios.findMany).toHaveBeenCalledWith({
      where: { id_plan: 1 },
      orderBy: { fecha_vigencia_desde: "desc" },
    });
  });

  it("precioVigente busca el precio cuya vigencia contiene la fecha", async () => {
    prisma.plan_precios.findFirst
      .mockResolvedValueOnce(filaPrecio(1, "25000", "2026-09-01"))
      .mockResolvedValueOnce(null);

    await expect(repositorio.precioVigente(1, HOY)).resolves.toMatchObject({ precio: 25000 });
    await expect(repositorio.precioVigente(1, HOY)).resolves.toBeNull();
    expect(prisma.plan_precios.findFirst).toHaveBeenCalledWith({
      where: {
        id_plan: 1,
        fecha_vigencia_desde: { lte: HOY },
        OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: HOY } }],
      },
    });
  });

  describe("registrarPrecio", () => {
    const desde = new Date("2026-11-01T00:00:00Z");

    it("bloquea el plan, borra los programados que reemplaza, cierra el último y crea el nuevo", async () => {
      transaccion.plan_precios.findFirst.mockResolvedValue(filaPrecio(1, "25000", "2026-09-01"));
      transaccion.plan_precios.create.mockResolvedValue(filaPrecio(2, "28000", "2026-11-01"));

      await expect(
        repositorio.registrarPrecio(1, { precio: 28000, fecha_vigencia_desde: desde }),
      ).resolves.toMatchObject({
        id_plan_precio: 2,
        precio: 28000,
      });

      expect(transaccion.$executeRaw).toHaveBeenCalledOnce();
      expect(transaccion.plan_precios.deleteMany).toHaveBeenCalledWith({
        where: { id_plan: 1, fecha_vigencia_desde: { gte: desde, gt: HOY } },
      });
      expect(transaccion.plan_precios.update).toHaveBeenCalledWith({
        where: { id_plan_precio: 1 },
        data: { fecha_vigencia_hasta: new Date("2026-10-31T00:00:00Z") },
      });
      expect(transaccion.plan_precios.create).toHaveBeenCalledWith({
        data: { id_plan: 1, precio: 28000, fecha_vigencia_desde: desde },
      });
    });

    it("crea el precio sin cerrar ninguno si el plan no tenía precios", async () => {
      transaccion.plan_precios.findFirst.mockResolvedValue(null);
      transaccion.plan_precios.create.mockResolvedValue(filaPrecio(2, "28000", "2026-11-01"));

      await repositorio.registrarPrecio(1, { precio: 28000, fecha_vigencia_desde: desde });

      expect(transaccion.plan_precios.update).not.toHaveBeenCalled();
    });

    it("devuelve null sin crear nada si ya hay un precio que empieza esa fecha", async () => {
      transaccion.plan_precios.findFirst.mockResolvedValue(filaPrecio(1, "25000", "2026-10-08"));

      await expect(
        repositorio.registrarPrecio(1, { precio: 28000, fecha_vigencia_desde: HOY }),
      ).resolves.toBeNull();
      expect(transaccion.plan_precios.update).not.toHaveBeenCalled();
      expect(transaccion.plan_precios.create).not.toHaveBeenCalled();
    });
  });
});
