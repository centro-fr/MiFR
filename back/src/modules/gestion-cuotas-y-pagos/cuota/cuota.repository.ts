import type { PrismaClient } from "@prisma/client";
import { LIMITE_MAXIMO } from "../../../shared/utils/esquemas-paginacion.js";
import type { CuotaDelHistorial, SituacionDeCuotas } from "./cuota.types.js";

export class CuotaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Una sola consulta para todas las inscripciones: la lista de asistencia y el listado de
  // alumnos la piden para muchas a la vez.
  async situacionDeInscripciones(idsInscripciones: number[]): Promise<SituacionDeCuotas[]> {
    const filas = await this.prisma.inscripciones.findMany({
      where: { id_inscripcion: { in: idsInscripciones } },
      select: {
        id_inscripcion: true,
        fecha_baja: true,
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
    return filas.map(({ id_inscripcion, fecha_baja, plan, cuotas }) => ({
      id_inscripcion,
      tipo_plan: plan.tipo,
      dias_gracia: plan.dias_gracia,
      fecha_baja,
      cuotas: cuotas.map(({ pagos, ...cuota }) => ({
        ...cuota,
        estados_pagos: pagos.map(({ estado }) => estado),
      })),
    }));
  }

  // De todas las inscripciones del alumno, de la cuota más nueva a la más vieja, con un tope como
  // todo listado: a una cuota por mes, cien cubren más de ocho años.
  async tuvoPagoConfirmado(idAlumno: number): Promise<boolean> {
    const pago = await this.prisma.pagos.findFirst({
      where: { estado: "CONFIRMADO", cuota: { inscripcion: { id_alumno: idAlumno } } },
      select: { id_pago: true },
    });
    return pago !== null;
  }

  async historialDeAlumno(idAlumno: number): Promise<CuotaDelHistorial[]> {
    const filas = await this.prisma.cuotas.findMany({
      where: { inscripcion: { id_alumno: idAlumno } },
      select: {
        id_cuota: true,
        id_inscripcion: true,
        numero_cuota: true,
        fecha_vencimiento: true,
        monto: true,
        inscripcion: { select: { plan: { select: { nombre: true } } } },
        pagos: {
          select: {
            id_pago: true,
            forma_pago: true,
            estado: true,
            monto: true,
            fecha_pago: true,
            motivo_rechazo: true,
          },
          orderBy: [{ fecha_pago: "asc" }, { id_pago: "asc" }],
        },
      },
      orderBy: [{ fecha_generacion: "desc" }, { id_cuota: "desc" }],
      take: LIMITE_MAXIMO,
    });
    return filas.map(({ inscripcion, monto, pagos, ...cuota }) => ({
      ...cuota,
      plan: inscripcion.plan.nombre,
      monto: monto.toNumber(),
      pagos: pagos.map((pago) => ({ ...pago, monto: pago.monto.toNumber() })),
    }));
  }
}
