import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CuotaRepository } from "../cuota.repository.js";

const prisma = { inscripciones: { findMany: vi.fn() } };
const VENCIMIENTO = new Date("2026-11-09T00:00:00Z");

describe("CuotaRepository", () => {
  let repositorio: CuotaRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repositorio = new CuotaRepository(prisma as unknown as PrismaClient);
  });

  it("situacionDeInscripciones trae en una consulta el plan y las cuotas con el estado de sus pagos", async () => {
    prisma.inscripciones.findMany.mockResolvedValue([
      {
        id_inscripcion: 12,
        plan: { tipo: "MENSUAL", dias_gracia: 5 },
        cuotas: [
          {
            id_cuota: 3,
            numero_cuota: 2,
            fecha_vencimiento: VENCIMIENTO,
            pagos: [{ estado: "RECHAZADO" }, { estado: "CONFIRMADO" }],
          },
        ],
      },
    ]);

    await expect(repositorio.situacionDeInscripciones([12, 13])).resolves.toEqual([
      {
        id_inscripcion: 12,
        tipo_plan: "MENSUAL",
        dias_gracia: 5,
        cuotas: [
          {
            id_cuota: 3,
            numero_cuota: 2,
            fecha_vencimiento: VENCIMIENTO,
            estados_pagos: ["RECHAZADO", "CONFIRMADO"],
          },
        ],
      },
    ]);
    expect(prisma.inscripciones.findMany).toHaveBeenCalledOnce();
    expect(prisma.inscripciones.findMany.mock.calls[0][0]).toMatchObject({
      where: { id_inscripcion: { in: [12, 13] } },
      select: { cuotas: { orderBy: { numero_cuota: "desc" } } },
    });
  });
});
