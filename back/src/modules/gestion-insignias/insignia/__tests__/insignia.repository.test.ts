import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InsigniaRepository } from "../insignia.repository.js";

const FECHA = new Date("2026-10-12T21:00:00Z");

function crearPrismaMock() {
  return {
    insignias: { findMany: vi.fn().mockResolvedValue([]) },
    alumno_insignias: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

describe("InsigniaRepository", () => {
  let prisma: ReturnType<typeof crearPrismaMock>;
  let repositorio: InsigniaRepository;

  beforeEach(() => {
    prisma = crearPrismaMock();
    repositorio = new InsigniaRepository(prisma as unknown as PrismaClient);
  });

  it("listarCatalogo ordena por tipo y umbral", async () => {
    await repositorio.listarCatalogo();

    expect(prisma.insignias.findMany).toHaveBeenCalledWith({
      orderBy: [{ tipo: "asc" }, { valor_umbral: "asc" }],
    });
  });

  it("listarObtenidas trae las de los alumnos con su insignia, de la más vieja a la más nueva", async () => {
    await repositorio.listarObtenidas([5, 6]);

    expect(prisma.alumno_insignias.findMany).toHaveBeenCalledWith({
      where: { id_alumno: { in: [5, 6] } },
      include: { insignia: true },
      orderBy: { fecha_obtencion: "asc" },
    });
  });

  it("listarObtenidas no consulta la base sin alumnos", async () => {
    await expect(repositorio.listarObtenidas([])).resolves.toEqual([]);
    expect(prisma.alumno_insignias.findMany).not.toHaveBeenCalled();
  });

  it("otorgar ignora las ya otorgadas y devuelve cuántas eran nuevas", async () => {
    const insignias = [{ id_alumno: 5, id_insignia: 1, periodo: "", fecha_obtencion: FECHA }];

    await expect(repositorio.otorgar(insignias)).resolves.toBe(2);
    expect(prisma.alumno_insignias.createMany).toHaveBeenCalledWith({
      data: insignias,
      skipDuplicates: true,
    });
  });

  it("otorgar no consulta la base sin insignias", async () => {
    await expect(repositorio.otorgar([])).resolves.toBe(0);
    expect(prisma.alumno_insignias.createMany).not.toHaveBeenCalled();
  });

  it("fueOtorgadaEnPeriodo informa si alguien ya la recibió ese mes", async () => {
    await expect(repositorio.fueOtorgadaEnPeriodo(6, "2026-09")).resolves.toBe(false);
    expect(prisma.alumno_insignias.count).toHaveBeenCalledWith({
      where: { id_insignia: 6, periodo: "2026-09" },
    });

    prisma.alumno_insignias.count.mockResolvedValue(3);
    await expect(repositorio.fueOtorgadaEnPeriodo(6, "2026-09")).resolves.toBe(true);
  });
});
