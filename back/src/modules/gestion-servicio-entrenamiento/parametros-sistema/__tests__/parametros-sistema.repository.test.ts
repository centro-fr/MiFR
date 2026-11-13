import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParametrosSistemaRepository } from "../parametros-sistema.repository.js";

const prisma = { parametros_sistema: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() } };

const SELECCION = { clave: true, valor: true, fecha_actualizacion: true };

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

  it("listar devuelve las filas con su clave, su valor y cuándo se actualizaron", async () => {
    const filas = [{ clave: "DIAS_RESERVA_PREINSCRIPCION", valor: "5", fecha_actualizacion: new Date() }];
    prisma.parametros_sistema.findMany.mockResolvedValue(filas);

    expect(await repositorio.listar()).toBe(filas);
    expect(prisma.parametros_sistema.findMany).toHaveBeenCalledWith({ select: SELECCION });
  });

  it("guardar crea la fila con el tipo y la descripción del catálogo, o cambia solo el valor si ya existe", async () => {
    const fila = { clave: "DIAS_RESERVA_PREINSCRIPCION", valor: "7", fecha_actualizacion: new Date() };
    prisma.parametros_sistema.upsert.mockResolvedValue(fila);

    expect(await repositorio.guardar("DIAS_RESERVA_PREINSCRIPCION", "7", "ENTERO", "Una descripción")).toBe(
      fila,
    );
    expect(prisma.parametros_sistema.upsert).toHaveBeenCalledWith({
      where: { clave: "DIAS_RESERVA_PREINSCRIPCION" },
      create: {
        clave: "DIAS_RESERVA_PREINSCRIPCION",
        valor: "7",
        tipo_dato: "ENTERO",
        descripcion: "Una descripción",
      },
      update: { valor: "7" },
      select: SELECCION,
    });
  });
});
