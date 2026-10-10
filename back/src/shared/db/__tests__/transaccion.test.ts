import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clienteEnCurso, enTransaccion, UnidadDeTrabajoPrisma } from "../transaccion.js";

const transaccion = { nombre: "transacción" };

function crearPrismaMock() {
  return {
    nombre: "cliente",
    $transaction: vi.fn((operacion: (tx: typeof transaccion) => unknown) => operacion(transaccion)),
  };
}

describe("transaccion", () => {
  let prisma: ReturnType<typeof crearPrismaMock>;

  beforeEach(() => {
    prisma = crearPrismaMock();
  });

  const cliente = () => prisma as unknown as PrismaClient;

  it("enTransaccion abre una transacción si no hay ninguna en curso", async () => {
    const resultado = await enTransaccion(cliente(), async (tx) => tx);

    expect(resultado).toBe(transaccion);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("enTransaccion se suma a la transacción en curso en lugar de abrir otra", async () => {
    await enTransaccion(cliente(), async () => {
      const interna = await enTransaccion(cliente(), async (tx) => tx);
      expect(interna).toBe(transaccion);
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("clienteEnCurso devuelve la transacción en curso, o el cliente si no hay ninguna", async () => {
    expect(clienteEnCurso(cliente())).toBe(prisma);
    await enTransaccion(cliente(), async () => {
      expect(clienteEnCurso(cliente())).toBe(transaccion);
    });
  });

  it("ejecutar de la unidad de trabajo corre todo en una transacción con límites más amplios", async () => {
    const unidad = new UnidadDeTrabajoPrisma(cliente());

    const resultado = await unidad.ejecutar(async () => {
      expect(clienteEnCurso(cliente())).toBe(transaccion);
      return "pago";
    });

    expect(resultado).toBe("pago");
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 5_000,
      timeout: 15_000,
    });
  });

  it("ejecutar deja salir el error de la operación para que la transacción se deshaga", async () => {
    const unidad = new UnidadDeTrabajoPrisma(cliente());

    await expect(unidad.ejecutar(() => Promise.reject(new Error("se cayó la base")))).rejects.toThrow(
      "se cayó la base",
    );
  });
});
