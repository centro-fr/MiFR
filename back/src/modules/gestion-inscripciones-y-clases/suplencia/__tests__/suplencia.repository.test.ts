import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SuplenciaRepository } from "../suplencia.repository.js";
import { INCLUIR_DATOS_SUPLENCIA } from "../suplencia.types.js";

const DESDE = new Date("2026-10-01T00:00:00Z");
const HASTA = new Date("2026-10-31T00:00:00Z");
const clave = { id_clase_id_prof_ausente: { id_clase: 20, id_prof_ausente: 8 } };

function crearPrismaMock() {
  return {
    suplencias: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id_clase: 20 }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe("SuplenciaRepository", () => {
  let prisma: ReturnType<typeof crearPrismaMock>;
  let repositorio: SuplenciaRepository;

  beforeEach(() => {
    prisma = crearPrismaMock();
    repositorio = new SuplenciaRepository(prisma as unknown as PrismaClient);
  });

  it("listar sin filtros pagina de la clase más nueva a la más vieja", async () => {
    await repositorio.listar({ limit: 50, offset: 100 });

    expect(prisma.suplencias.findMany).toHaveBeenCalledWith({
      where: { clase: {} },
      include: INCLUIR_DATOS_SUPLENCIA,
      orderBy: [{ clase: { fecha_clase: "desc" } }, { id_clase: "desc" }],
      take: 50,
      skip: 100,
    });
  });

  it("listar filtra por fechas, actividad y profesora titular o suplente", async () => {
    await repositorio.listar({
      desde: DESDE,
      hasta: HASTA,
      id_profesora: 8,
      id_actividad: 3,
      limit: 10,
      offset: 0,
    });

    expect(prisma.suplencias.findMany.mock.calls[0]?.[0].where).toEqual({
      clase: { fecha_clase: { gte: DESDE, lte: HASTA }, horario: { id_actividad: 3 } },
      OR: [{ id_prof_ausente: 8 }, { clase: { id_prof_dictante: 8 } }],
    });
  });

  it("listar con una sola fecha deja abierto el otro extremo", async () => {
    await repositorio.listar({ hasta: HASTA, limit: 10, offset: 0 });

    expect(prisma.suplencias.findMany.mock.calls[0]?.[0].where).toEqual({
      clase: { fecha_clase: { gte: undefined, lte: HASTA } },
    });
  });

  it("buscarPorClase trae la suplencia de la clase con sus datos", async () => {
    await expect(repositorio.buscarPorClase(20)).resolves.toEqual({ id_clase: 20 });

    expect(prisma.suplencias.findFirst).toHaveBeenCalledWith({
      where: { id_clase: 20 },
      include: INCLUIR_DATOS_SUPLENCIA,
    });
  });

  it("crear, actualizar y eliminar usan la clave (id_clase, id_prof_ausente)", async () => {
    const datos = { id_clase: 20, id_prof_ausente: 8, motivo: null, id_usuario_registra: 1 };
    const cambios = { motivo: "Viaje", id_usuario_registra: 1, fecha_registro: HASTA };

    await repositorio.crear(datos);
    await repositorio.actualizar(20, 8, cambios);
    await repositorio.eliminar(20, 8);

    expect(prisma.suplencias.create).toHaveBeenCalledWith({ data: datos });
    expect(prisma.suplencias.update).toHaveBeenCalledWith({ where: clave, data: cambios });
    expect(prisma.suplencias.delete).toHaveBeenCalledWith({ where: clave });
  });
});
