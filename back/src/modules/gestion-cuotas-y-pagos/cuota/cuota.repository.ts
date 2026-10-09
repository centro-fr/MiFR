import type { PrismaClient } from "@prisma/client";
import type { SituacionDeCuotas } from "./cuota.types.js";

export class CuotaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Una sola consulta para todas las inscripciones: la lista de asistencia y el listado de
  // alumnos la piden para muchas a la vez.
  async situacionDeInscripciones(idsInscripciones: number[]): Promise<SituacionDeCuotas[]> {
    const filas = await this.prisma.inscripciones.findMany({
      where: { id_inscripcion: { in: idsInscripciones } },
      select: {
        id_inscripcion: true,
        plan: { select: { tipo: true, dias_gracia: true } },
        cuotas: {
          select: {
            id_cuota: true,
            numero_cuota: true,
            fecha_vencimiento: true,
            pagos: { select: { estado: true } },
          },
          orderBy: { numero_cuota: "desc" },
        },
      },
    });
    return filas.map(({ id_inscripcion, plan, cuotas }) => ({
      id_inscripcion,
      tipo_plan: plan.tipo,
      dias_gracia: plan.dias_gracia,
      cuotas: cuotas.map(({ pagos, ...cuota }) => ({
        ...cuota,
        estados_pagos: pagos.map(({ estado }) => estado),
      })),
    }));
  }
}
