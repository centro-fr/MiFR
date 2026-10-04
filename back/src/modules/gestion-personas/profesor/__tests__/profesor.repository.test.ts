import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfesorRepository } from "../profesor.repository.js";

const prisma = {
  profesoras: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
};

describe("ProfesorRepository", () => {
  let repositorio: ProfesorRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repositorio = new ProfesorRepository(prisma as unknown as PrismaClient);
  });

  it("crear da de alta el perfil con los datos recibidos", async () => {
    await repositorio.crear({ id_usuario: 5, especialidad: "Pilates" });

    expect(prisma.profesoras.create).toHaveBeenCalledWith({
      data: { id_usuario: 5, especialidad: "Pilates" },
    });
  });

  it("buscarPorId busca por id_profesora", async () => {
    await repositorio.buscarPorId(3);

    expect(prisma.profesoras.findUnique).toHaveBeenCalledWith({ where: { id_profesora: 3 } });
  });

  it("buscarPorUsuarioId busca por la clave única id_usuario", async () => {
    await repositorio.buscarPorUsuarioId(5);

    expect(prisma.profesoras.findUnique).toHaveBeenCalledWith({ where: { id_usuario: 5 } });
  });

  it("listar trae solo las profesoras sin fecha de baja", async () => {
    await repositorio.listar();

    expect(prisma.profesoras.findMany).toHaveBeenCalledWith({
      where: { fecha_baja: null },
      orderBy: { id_profesora: "asc" },
    });
  });

  it("darDeBaja registra la fecha de baja sin borrar el perfil", async () => {
    await repositorio.darDeBaja(3);

    expect(prisma.profesoras.update).toHaveBeenCalledWith({
      where: { id_profesora: 3 },
      data: { fecha_baja: expect.any(Date) },
    });
  });
});
