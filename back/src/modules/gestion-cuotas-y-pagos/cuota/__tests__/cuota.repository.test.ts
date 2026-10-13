import { Prisma, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CuotaRepository } from "../cuota.repository.js";

const prisma = {
  inscripciones: { findMany: vi.fn() },
  cuotas: { findMany: vi.fn() },
  pagos: { findFirst: vi.fn() },
  $queryRaw: vi.fn(),
};
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
        fecha_baja: null,
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
        fecha_baja: null,
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

  it("tuvoPagoConfirmado busca un pago confirmado en cualquier inscripción del alumno", async () => {
    prisma.pagos.findFirst.mockResolvedValueOnce({ id_pago: 7 }).mockResolvedValueOnce(null);

    await expect(repositorio.tuvoPagoConfirmado(5)).resolves.toBe(true);
    await expect(repositorio.tuvoPagoConfirmado(5)).resolves.toBe(false);
    expect(prisma.pagos.findFirst).toHaveBeenCalledWith({
      where: { estado: "CONFIRMADO", cuota: { inscripcion: { id_alumno: 5 } } },
      select: { id_pago: true },
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

  it("situacionParaAvisos trae las inscripciones activas de plan mensual con una cuota paga que vence hasta la fecha", async () => {
    prisma.inscripciones.findMany.mockResolvedValue([
      {
        id_inscripcion: 12,
        fecha_baja: null,
        plan: { tipo: "MENSUAL", dias_gracia: 5, nombre: "Intermedio" },
        alumno: {
          id_alumno: 4,
          id_usuario: 40,
          id_usuario_responsable: null,
          usuario: { nombre: "Ana", apellido: "López" },
        },
        cuotas: [
          { id_cuota: 3, numero_cuota: 1, fecha_vencimiento: VENCIMIENTO, pagos: [{ estado: "CONFIRMADO" }] },
        ],
      },
    ]);

    await expect(repositorio.situacionParaAvisos(VENCIMIENTO)).resolves.toEqual([
      {
        id_inscripcion: 12,
        tipo_plan: "MENSUAL",
        dias_gracia: 5,
        fecha_baja: null,
        nombre_plan: "Intermedio",
        alumno: {
          id_alumno: 4,
          id_usuario: 40,
          id_usuario_responsable: null,
          nombre: "Ana",
          apellido: "López",
        },
        cuotas: [
          { id_cuota: 3, numero_cuota: 1, fecha_vencimiento: VENCIMIENTO, estados_pagos: ["CONFIRMADO"] },
        ],
      },
    ]);
    expect(prisma.inscripciones.findMany.mock.calls[0][0].where).toEqual({
      estado: "ACTIVA",
      alumno: { estado: { not: "BAJA" } },
      plan: { tipo: "MENSUAL" },
      cuotas: {
        some: { fecha_vencimiento: { lte: VENCIMIENTO }, pagos: { some: { estado: "CONFIRMADO" } } },
      },
    });
  });

  it("cobradoEnPeriodo suma en la base los pagos confirmados del período, por inscripción", async () => {
    const desde = new Date("2026-10-01T03:00:00Z");
    const hasta = new Date("2026-11-01T03:00:00Z");
    prisma.$queryRaw.mockResolvedValue([{ id_inscripcion: 12, total: new Prisma.Decimal("55000.50") }]);

    await expect(repositorio.cobradoEnPeriodo([12, 13], desde, hasta)).resolves.toEqual(
      new Map([[12, 55000.5]]),
    );
    const [consulta, ...valores] = prisma.$queryRaw.mock.calls[0];
    expect(consulta.join("?")).toContain("p.estado = 'CONFIRMADO'");
    expect(consulta.join("?")).toContain("p.fecha_pago >= ?");
    expect(consulta.join("?")).toContain("p.fecha_pago < ?");
    expect(valores).toEqual([[12, 13], desde, hasta]);
  });

  it("situacionParaAvisos trae las inscripciones activas de plan mensual con una cuota paga que vence hasta la fecha", async () => {
    prisma.inscripciones.findMany.mockResolvedValue([
      {
        id_inscripcion: 12,
        fecha_baja: null,
        plan: { tipo: "MENSUAL", dias_gracia: 5, nombre: "Intermedio" },
        alumno: {
          id_alumno: 4,
          id_usuario: 40,
          id_usuario_responsable: null,
          usuario: { nombre: "Ana", apellido: "López" },
        },
        cuotas: [
          { id_cuota: 3, numero_cuota: 1, fecha_vencimiento: VENCIMIENTO, pagos: [{ estado: "CONFIRMADO" }] },
        ],
      },
    ]);

    await expect(repositorio.situacionParaAvisos(VENCIMIENTO)).resolves.toEqual([
      {
        id_inscripcion: 12,
        tipo_plan: "MENSUAL",
        dias_gracia: 5,
        fecha_baja: null,
        nombre_plan: "Intermedio",
        alumno: {
          id_alumno: 4,
          id_usuario: 40,
          id_usuario_responsable: null,
          nombre: "Ana",
          apellido: "López",
        },
        cuotas: [
          { id_cuota: 3, numero_cuota: 1, fecha_vencimiento: VENCIMIENTO, estados_pagos: ["CONFIRMADO"] },
        ],
      },
    ]);
    expect(prisma.inscripciones.findMany.mock.calls[0][0].where).toEqual({
      estado: "ACTIVA",
      alumno: { estado: { not: "BAJA" } },
      plan: { tipo: "MENSUAL" },
      cuotas: {
        some: { fecha_vencimiento: { lte: VENCIMIENTO }, pagos: { some: { estado: "CONFIRMADO" } } },
      },
    });
  });

  it("cobradoEnPeriodo suma en la base los pagos confirmados del período, por inscripción", async () => {
    const desde = new Date("2026-10-01T03:00:00Z");
    const hasta = new Date("2026-11-01T03:00:00Z");
    prisma.$queryRaw.mockResolvedValue([{ id_inscripcion: 12, total: new Prisma.Decimal("55000.50") }]);

    await expect(repositorio.cobradoEnPeriodo([12, 13], desde, hasta)).resolves.toEqual(
      new Map([[12, 55000.5]]),
    );
    const [consulta, ...valores] = prisma.$queryRaw.mock.calls[0];
    expect(consulta.join("?")).toContain("p.estado = 'CONFIRMADO'");
    expect(consulta.join("?")).toContain("p.fecha_pago >= ?");
    expect(consulta.join("?")).toContain("p.fecha_pago < ?");
    expect(valores).toEqual([[12, 13], desde, hasta]);
  });
});
