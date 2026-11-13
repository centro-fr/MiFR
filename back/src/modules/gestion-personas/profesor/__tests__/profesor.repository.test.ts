import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfesorRepository } from "../profesor.repository.js";

// 23:30 del 4 de octubre en Argentina: en UTC ya es el 5.
const AHORA = new Date("2026-10-05T02:30:00Z");
const HOY_EN_ARGENTINA = new Date("2026-10-04T00:00:00Z");

// El nombre de la profesora sale de usuarios: todas las consultas lo traen.
const CON_NOMBRE = { usuario: { select: { nombre: true, apellido: true } } };
const CON_DATOS_DE_CONTACTO = {
  usuario: { select: { nombre: true, apellido: true, email: true, telefono: true, fecha_nacimiento: true } },
};

const prisma = {
  profesoras: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
};

describe("ProfesorRepository", () => {
  let repositorio: ProfesorRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    repositorio = new ProfesorRepository(prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("crear da de alta el perfil con los datos recibidos y la fecha de hoy en Argentina", async () => {
    await repositorio.crear({ id_usuario: 5, especialidad: "Posing" });

    expect(prisma.profesoras.create).toHaveBeenCalledWith({
      data: { id_usuario: 5, especialidad: "Posing", fecha_alta: HOY_EN_ARGENTINA },
      include: CON_NOMBRE,
    });
  });

  it("buscarPorId busca por id_profesora", async () => {
    await repositorio.buscarPorId(3);

    expect(prisma.profesoras.findUnique).toHaveBeenCalledWith({
      where: { id_profesora: 3 },
      include: CON_NOMBRE,
    });
  });

  it("buscarPorUsuarioId busca por la clave única id_usuario", async () => {
    await repositorio.buscarPorUsuarioId(5);

    expect(prisma.profesoras.findUnique).toHaveBeenCalledWith({
      where: { id_usuario: 5 },
      include: CON_NOMBRE,
    });
  });

  it("listar trae solo las profesoras sin fecha de baja", async () => {
    await repositorio.listar();

    expect(prisma.profesoras.findMany).toHaveBeenCalledWith({
      where: { fecha_baja: null },
      include: CON_NOMBRE,
      orderBy: { id_profesora: "asc" },
    });
  });

  it("listar con incluirBajas trae también las dadas de baja", async () => {
    await repositorio.listar({ incluirBajas: true });

    expect(prisma.profesoras.findMany).toHaveBeenCalledWith({
      where: undefined,
      include: CON_NOMBRE,
      orderBy: { id_profesora: "asc" },
    });
  });

  it("listar incluye contacto solo cuando se solicita", async () => {
    await repositorio.listar(undefined, true);

    expect(prisma.profesoras.findMany).toHaveBeenCalledWith({
      where: { fecha_baja: null },
      include: CON_DATOS_DE_CONTACTO,
      orderBy: { id_profesora: "asc" },
    });
  });

  it("darDeBaja registra la fecha de hoy en Argentina sin borrar el perfil", async () => {
    await repositorio.darDeBaja(3);

    expect(prisma.profesoras.update).toHaveBeenCalledWith({
      where: { id_profesora: 3 },
      data: { fecha_baja: HOY_EN_ARGENTINA },
      include: CON_NOMBRE,
    });
  });

  it("actualizar persiste solo los campos recibidos y trae el nombre asociado", async () => {
    await repositorio.actualizar(3, { especialidad: "Posing", fecha_baja: null });

    expect(prisma.profesoras.update).toHaveBeenCalledWith({
      where: { id_profesora: 3 },
      data: { especialidad: "Posing", fecha_baja: null },
      include: CON_NOMBRE,
    });
  });
});
