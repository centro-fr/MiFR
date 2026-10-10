import { Prisma, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CuotaRepository } from "../cuota.repository.js";

const prisma = { inscripciones: { findMany: vi.fn() }, cuotas: { findMany: vi.fn() } };
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

  it("historialDeAlumno trae las cuotas de todas sus inscripciones con el plan y los pagos, con tope", async () => {
    const fechaPago = new Date("2026-10-09T15:00:00Z");
    prisma.cuotas.findMany.mockResolvedValue([
      {
        id_cuota: 3,
        id_inscripcion: 12,
        numero_cuota: 2,
        fecha_vencimiento: VENCIMIENTO,
        monto: new Prisma.Decimal("30000.50"),
        inscripcion: { plan: { nombre: "Intermedio" } },
        pagos: [
          {
            id_pago: 7,
            forma_pago: "TRANSFERENCIA",
            estado: "RECHAZADO",
            monto: new Prisma.Decimal("30000.50"),
            fecha_pago: fechaPago,
            motivo_rechazo: "No figura",
          },
        ],
      },
    ]);

    await expect(repositorio.historialDeAlumno(5)).resolves.toEqual([
      {
        id_cuota: 3,
        id_inscripcion: 12,
        plan: "Intermedio",
        numero_cuota: 2,
        fecha_vencimiento: VENCIMIENTO,
        monto: 30000.5,
        pagos: [
          {
            id_pago: 7,
            forma_pago: "TRANSFERENCIA",
            estado: "RECHAZADO",
            monto: 30000.5,
            fecha_pago: fechaPago,
            motivo_rechazo: "No figura",
          },
        ],
      },
    ]);
    expect(prisma.cuotas.findMany.mock.calls[0][0]).toMatchObject({
      where: { inscripcion: { id_alumno: 5 } },
      orderBy: [{ fecha_generacion: "desc" }, { id_cuota: "desc" }],
      take: 100,
    });
  });
});
