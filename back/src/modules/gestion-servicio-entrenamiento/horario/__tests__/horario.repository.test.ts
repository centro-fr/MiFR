import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HorarioRepository } from "../horario.repository.js";

function hora(horas: number, minutos = 0): Date {
  return new Date(Date.UTC(1970, 0, 1, horas, minutos));
}

// 23:30 del 4 de octubre en Argentina: en UTC ya es el 5.
const AHORA = new Date("2026-10-05T02:30:00Z");
const HOY_EN_ARGENTINA = new Date("2026-10-04T00:00:00Z");

const transaccion = {
  $executeRaw: vi.fn(),
  horarios: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
};
const prisma = {
  $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  horarios: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
};

const CON_DATOS = {
  actividad: true,
  profesora: { include: { usuario: { select: { nombre: true, apellido: true } } } },
};
const nuevo = { id_actividad: 1, id_profesora: 3, dia_semana: 2, hora_inicio: "18:00", hora_fin: "19:00" };

describe("HorarioRepository", () => {
  let repositorio: HorarioRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    transaccion.horarios.findFirst.mockResolvedValue(null);
    repositorio = new HorarioRepository(prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("crear bloquea la agenda de esa profesora y ese día antes de buscar superposiciones", async () => {
    await repositorio.crear(nuevo);

    const [plantilla, clave] = transaccion.$executeRaw.mock.calls[0];
    expect(plantilla.join("?")).toContain("pg_advisory_xact_lock(hashtextextended(");
    expect(clave).toBe("agenda-profesora:3:2");
    expect(transaccion.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      transaccion.horarios.findFirst.mock.invocationCallOrder[0],
    );
  });

  it("crear busca superposición con intervalos semicerrados entre horarios activos", async () => {
    await repositorio.crear(nuevo);

    expect(transaccion.horarios.findFirst).toHaveBeenCalledWith({
      where: {
        id_profesora: 3,
        dia_semana: 2,
        fecha_baja: null,
        hora_inicio: { lt: hora(19) },
        hora_fin: { gt: hora(18) },
      },
      select: { id_horario: true },
    });
  });

  it("crear guarda las horas como TIME sobre 1970-01-01, el alta con la fecha de hoy en Argentina y devuelve el horario", async () => {
    transaccion.horarios.create.mockResolvedValue({ id_horario: 9 });

    await expect(repositorio.crear(nuevo)).resolves.toEqual({ id_horario: 9 });
    expect(transaccion.horarios.create).toHaveBeenCalledWith({
      data: { ...nuevo, hora_inicio: hora(18), hora_fin: hora(19), fecha_alta: HOY_EN_ARGENTINA },
      include: CON_DATOS,
    });
  });

  it("crear devuelve null y no inserta si hay un horario superpuesto", async () => {
    transaccion.horarios.findFirst.mockResolvedValue({ id_horario: 4 });

    await expect(repositorio.crear(nuevo)).resolves.toBeNull();
    expect(transaccion.horarios.create).not.toHaveBeenCalled();
  });

  it("actualizar bloquea la agenda del destino y excluye al propio horario de la búsqueda", async () => {
    const criterio = { id_profesora: 5, dia_semana: 4, hora_inicio: "09:00", hora_fin: "10:30" };

    await repositorio.actualizar(7, { dia_semana: 4 }, criterio);

    expect(transaccion.$executeRaw.mock.calls[0][1]).toBe("agenda-profesora:5:4");
    expect(transaccion.horarios.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hora_inicio: { lt: hora(10, 30) },
          hora_fin: { gt: hora(9) },
          id_horario: { not: 7 },
        }),
      }),
    );
  });

  it("actualizar convierte solo las horas que se envían", async () => {
    const criterio = { id_profesora: 5, dia_semana: 4, hora_inicio: "09:00", hora_fin: "11:00" };

    await repositorio.actualizar(7, { hora_fin: "11:00", cupo_maximo: null }, criterio);

    expect(transaccion.horarios.update).toHaveBeenCalledWith({
      where: { id_horario: 7 },
      data: { hora_fin: hora(11), cupo_maximo: null },
      include: CON_DATOS,
    });
  });

  it("actualizar convierte ambas horas si se envían las dos", async () => {
    const criterio = { id_profesora: 5, dia_semana: 4, hora_inicio: "07:30", hora_fin: "08:15" };

    await repositorio.actualizar(7, { hora_inicio: "07:30", hora_fin: "08:15" }, criterio);

    expect(transaccion.horarios.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { hora_inicio: hora(7, 30), hora_fin: hora(8, 15) } }),
    );
  });

  it("actualizar devuelve null y no modifica si queda superpuesto", async () => {
    transaccion.horarios.findFirst.mockResolvedValue({ id_horario: 8 });
    const criterio = { id_profesora: 5, dia_semana: 4, hora_inicio: "09:00", hora_fin: "10:00" };

    await expect(repositorio.actualizar(7, { dia_semana: 4 }, criterio)).resolves.toBeNull();
    expect(transaccion.horarios.update).not.toHaveBeenCalled();
  });

  it("listar trae solo horarios activos, con los filtros, ordenados por día y hora", async () => {
    await repositorio.listar({ id_profesora: 3 });

    expect(prisma.horarios.findMany).toHaveBeenCalledWith({
      where: { fecha_baja: null, id_profesora: 3 },
      include: CON_DATOS,
      orderBy: [{ dia_semana: "asc" }, { hora_inicio: "asc" }],
    });
  });

  it.each([
    ["tieneActivosDeActividad", { id_actividad: 1, fecha_baja: null }],
    ["tieneActivosDeProfesora", { id_profesora: 1, fecha_baja: null }],
  ] as const)("%s cuenta solo los horarios sin fecha de baja", async (metodo, where) => {
    prisma.horarios.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);

    await expect(repositorio[metodo](1)).resolves.toBe(false);
    await expect(repositorio[metodo](1)).resolves.toBe(true);
    expect(prisma.horarios.count).toHaveBeenCalledWith({ where });
  });

  it("darDeBaja registra la fecha de hoy en Argentina sin borrar el horario", async () => {
    await repositorio.darDeBaja(7);

    expect(transaccion.$executeRaw.mock.calls[0][1]).toBe("inscripcion-horario:7");
    expect(transaccion.horarios.update).toHaveBeenCalledWith({
      where: { id_horario: 7 },
      data: { fecha_baja: HOY_EN_ARGENTINA },
      include: CON_DATOS,
    });
  });

  it("buscarPorId trae el horario con su actividad y su profesora, aunque esté dado de baja", async () => {
    await repositorio.buscarPorId(7);

    expect(prisma.horarios.findUnique).toHaveBeenCalledWith({ where: { id_horario: 7 }, include: CON_DATOS });
  });
});
