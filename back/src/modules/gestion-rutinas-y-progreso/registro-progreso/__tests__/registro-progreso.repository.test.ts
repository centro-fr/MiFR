import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistroProgresoRepository } from "../registro-progreso.repository.js";

const prisma = { registros_progreso: { create: vi.fn() } };
const FECHA = new Date("2026-10-10T00:00:00Z");

describe("RegistroProgresoRepository", () => {
  let repositorio: RegistroProgresoRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repositorio = new RegistroProgresoRepository(prisma as unknown as PrismaClient);
  });

  it("registrar crea el registro con sus medidas y crea el tipo de medida si todavía no existe", async () => {
    await repositorio.registrar({
      idAlumno: 5,
      idProfesora: 2,
      fecha: FECHA,
      medidas: [{ codigo: "PESO", unidad: "kg", valor: 62.5 }],
    });

    expect(prisma.registros_progreso.create).toHaveBeenCalledWith({
      data: {
        id_alumno: 5,
        id_profesora: 2,
        fecha: FECHA,
        medidas: {
          create: [
            {
              valor: 62.5,
              tipo_medida: {
                connectOrCreate: { where: { codigo: "PESO" }, create: { codigo: "PESO", unidad: "kg" } },
              },
            },
          ],
        },
      },
    });
  });
});
