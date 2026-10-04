import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActividadRepository } from "../actividad.repository.js";

const prisma = {
  actividades: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
};

describe("ActividadRepository", () => {
  let repositorio: ActividadRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repositorio = new ActividadRepository(prisma as unknown as PrismaClient);
  });

  it("crear da de alta la actividad como activa", async () => {
    const input = { codigo: "YOGA", nombre: "Yoga", modalidad: "GRUPAL" as const };

    await repositorio.crear(input);

    expect(prisma.actividades.create).toHaveBeenCalledWith({ data: { ...input, activo: true } });
  });

  it("listar sin búsqueda trae las actividades activas ordenadas por nombre", async () => {
    await repositorio.listar({});

    expect(prisma.actividades.findMany).toHaveBeenCalledWith({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
  });

  it("listar busca por código o nombre sin distinguir mayúsculas", async () => {
    await repositorio.listar({ busqueda: "pil" });

    expect(prisma.actividades.findMany).toHaveBeenCalledWith({
      where: {
        activo: true,
        OR: [
          { codigo: { contains: "pil", mode: "insensitive" } },
          { nombre: { contains: "pil", mode: "insensitive" } },
        ],
      },
      orderBy: { nombre: "asc" },
    });
  });

  it("bajaLogica marca la actividad como inactiva sin borrarla", async () => {
    await repositorio.bajaLogica(3);

    expect(prisma.actividades.update).toHaveBeenCalledWith({
      where: { id_actividad: 3 },
      data: { activo: false },
    });
  });

  it("buscarPorId y buscarPorCodigo buscan por sus claves únicas", async () => {
    await repositorio.buscarPorId(3);
    await repositorio.buscarPorCodigo("YOGA");

    expect(prisma.actividades.findUnique).toHaveBeenNthCalledWith(1, { where: { id_actividad: 3 } });
    expect(prisma.actividades.findUnique).toHaveBeenNthCalledWith(2, { where: { codigo: "YOGA" } });
  });

  it("actualizar guarda solo los campos recibidos", async () => {
    await repositorio.actualizar(3, { nombre: "Yoga suave", cupo_maximo: null });

    expect(prisma.actividades.update).toHaveBeenCalledWith({
      where: { id_actividad: 3 },
      data: { nombre: "Yoga suave", cupo_maximo: null },
    });
  });
});
