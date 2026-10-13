import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaseRepository } from "../clase.repository.js";
import { INCLUIR_DATOS_CLASE } from "../clase.types.js";

const HOY = new Date("2026-10-12T00:00:00Z");
const clase = { id_clase: 20 };

function crearPrismaMock() {
  return {
    clases: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      findMany: vi.fn().mockResolvedValue([clase]),
      findUnique: vi.fn().mockResolvedValue(clase),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };
}

describe("ClaseRepository", () => {
  let prisma: ReturnType<typeof crearPrismaMock>;
  let repositorio: ClaseRepository;

  beforeEach(() => {
    prisma = crearPrismaMock();
    repositorio = new ClaseRepository(prisma as unknown as PrismaClient);
  });

  it("crearDelDia crea las clases de una sola vez y saltea las que ya existen", async () => {
    await repositorio.crearDelDia(
      [
        { id_horario: 4, id_profesora: 8 },
        { id_horario: 5, id_profesora: 9 },
      ],
      HOY,
    );

    expect(prisma.clases.createMany).toHaveBeenCalledWith({
      data: [
        { id_horario: 4, id_prof_dictante: 8, fecha_clase: HOY },
        { id_horario: 5, id_prof_dictante: 9, fecha_clase: HOY },
      ],
      skipDuplicates: true,
    });
  });

  it("crearDelDia no consulta la base si no hay horarios", async () => {
    await repositorio.crearDelDia([], HOY);

    expect(prisma.clases.createMany).not.toHaveBeenCalled();
  });

  it("listarPorFecha filtra por la profesora dictante solo si se la pasa, con tope", async () => {
    await repositorio.listarPorFecha(HOY, 8);
    await repositorio.listarPorFecha(HOY);

    const orden = [{ horario: { hora_inicio: "asc" } }, { id_clase: "asc" }];
    expect(prisma.clases.findMany).toHaveBeenNthCalledWith(1, {
      where: { fecha_clase: HOY, id_prof_dictante: 8 },
      include: INCLUIR_DATOS_CLASE,
      orderBy: orden,
      take: 100,
    });
    expect(prisma.clases.findMany).toHaveBeenNthCalledWith(2, {
      where: { fecha_clase: HOY },
      include: INCLUIR_DATOS_CLASE,
      orderBy: orden,
      take: 100,
    });
  });

  it("listarAbiertasHasta trae las PROGRAMADA hasta la fecha, de la más vieja a la más nueva", async () => {
    await repositorio.listarAbiertasHasta(HOY);

    expect(prisma.clases.findMany).toHaveBeenCalledWith({
      where: { fecha_clase: { lte: HOY }, estado: "PROGRAMADA" },
      include: INCLUIR_DATOS_CLASE,
      orderBy: [{ fecha_clase: "asc" }, { horario: { hora_fin: "asc" } }, { id_clase: "asc" }],
      take: 500,
    });
  });

  it("buscarPorId trae la clase con su horario", async () => {
    await expect(repositorio.buscarPorId(20)).resolves.toBe(clase);
    expect(prisma.clases.findUnique).toHaveBeenCalledWith({
      where: { id_clase: 20 },
      include: INCLUIR_DATOS_CLASE,
    });
  });

  it("bloquear toma la fila con FOR UPDATE y devuelve su estado, o null si no existe", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ estado: "DICTADA" }]).mockResolvedValueOnce([]);

    await expect(repositorio.bloquear(20)).resolves.toBe("DICTADA");
    await expect(repositorio.bloquear(21)).resolves.toBeNull();
    const [partes, id] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray, number];
    expect(partes.join("?")).toContain("FOR UPDATE");
    expect(id).toBe(20);
  });

  it("cerrar pasa una PROGRAMADA a DICTADA con la fecha de cierre y la devuelve", async () => {
    const fecha = new Date("2026-10-12T22:00:00Z");

    await expect(repositorio.cerrar(20, fecha)).resolves.toBe(clase);
    expect(prisma.clases.updateMany).toHaveBeenCalledWith({
      where: { id_clase: 20, estado: "PROGRAMADA" },
      data: { estado: "DICTADA", fecha_cierre_asist: fecha },
    });
  });

  it("cancelar pasa a CANCELADA solo una clase PROGRAMADA", async () => {
    await repositorio.cancelar(20);

    expect(prisma.clases.updateMany).toHaveBeenCalledWith({
      where: { id_clase: 20, estado: "PROGRAMADA" },
      data: { estado: "CANCELADA" },
    });
  });

  it("cerrar devuelve null sin releer si la clase ya no estaba PROGRAMADA", async () => {
    prisma.clases.updateMany.mockResolvedValue({ count: 0 });

    await expect(repositorio.cerrar(20, new Date())).resolves.toBeNull();
    expect(prisma.clases.findUnique).not.toHaveBeenCalled();
  });

  it("buscarPorHorarioYFecha busca por el único (id_horario, fecha_clase)", async () => {
    await expect(repositorio.buscarPorHorarioYFecha(4, HOY)).resolves.toBe(clase);

    expect(prisma.clases.findUnique).toHaveBeenCalledWith({
      where: { id_horario_fecha_clase: { id_horario: 4, fecha_clase: HOY } },
      include: INCLUIR_DATOS_CLASE,
    });
  });

  it("cambiarDictante actualiza la profesora que dicta la clase", async () => {
    await repositorio.cambiarDictante(20, 9);

    expect(prisma.clases.update).toHaveBeenCalledWith({
      where: { id_clase: 20 },
      data: { id_prof_dictante: 9 },
    });
  });

  it("listarSuplidasEnPeriodo trae las clases con suplencia sin las canceladas, una fila por suplencia", async () => {
    const desde = new Date("2026-10-01T00:00:00Z");
    const horario = {
      hora_inicio: new Date("1970-01-01T18:00:00Z"),
      hora_fin: new Date("1970-01-01T19:00:00Z"),
    };
    prisma.clases.findMany.mockResolvedValue([
      {
        id_clase: 20,
        id_horario: 4,
        fecha_clase: HOY,
        id_prof_dictante: 9,
        horario,
        suplencias: [{ id_prof_ausente: 8 }],
      },
    ]);

    await expect(repositorio.listarSuplidasEnPeriodo(desde, HOY)).resolves.toEqual([
      {
        id_clase: 20,
        id_horario: 4,
        fecha_clase: HOY,
        ...horario,
        id_prof_suplente: 9,
        id_prof_ausente: 8,
      },
    ]);
    expect(prisma.clases.findMany).toHaveBeenCalledWith({
      where: {
        fecha_clase: { gte: desde, lte: HOY },
        estado: { not: "CANCELADA" },
        suplencias: { some: {} },
      },
      select: {
        id_clase: true,
        id_horario: true,
        fecha_clase: true,
        id_prof_dictante: true,
        horario: { select: { hora_inicio: true, hora_fin: true } },
        suplencias: { select: { id_prof_ausente: true } },
      },
      orderBy: [{ fecha_clase: "asc" }, { id_clase: "asc" }],
    });
  });
});
