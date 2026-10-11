import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParametrosSistemaRepository } from "../parametros-sistema.repository.js";

const prisma = { parametros_sistema: { findUnique: vi.fn() } };

describe("ParametrosSistemaRepository", () => {
  let repositorio: ParametrosSistemaRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repositorio = new ParametrosSistemaRepository(prisma as unknown as PrismaClient);
  });

  it("buscarValor devuelve el valor guardado de la clave", async () => {
    prisma.parametros_sistema.findUnique.mockResolvedValue({ valor: "5" });

    expect(await repositorio.buscarValor("DIAS_RESERVA_PREINSCRIPCION")).toBe("5");
    expect(prisma.parametros_sistema.findUnique).toHaveBeenCalledWith({
      where: { clave: "DIAS_RESERVA_PREINSCRIPCION" },
      select: { valor: true },
    });
  });

  it("buscarValor devuelve null si la clave no tiene fila", async () => {
    prisma.parametros_sistema.findUnique.mockResolvedValue(null);

    expect(await repositorio.buscarValor("DIAS_RESERVA_PREINSCRIPCION")).toBeNull();
  });
});
