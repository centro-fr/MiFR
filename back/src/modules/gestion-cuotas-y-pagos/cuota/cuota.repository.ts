import { Prisma, type PrismaClient } from "@prisma/client";
import { LIMITE_MAXIMO } from "../../../shared/utils/esquemas-paginacion.js";
import type {
  CuotaDelHistorial,
  SituacionDeCuotas,
  SituacionParaAviso,
  SituacionParaInforme,
  SituacionParaResumen,
} from "./cuota.types.js";

const CUOTAS_CON_PAGOS = {
  select: {
    id_cuota: true,
    numero_cuota: true,
    fecha_vencimiento: true,
    pagos: { select: { estado: true } },
  },
  orderBy: { numero_cuota: "desc" },
} satisfies Prisma.inscripciones$cuotasArgs;

type CuotaConPagos = Prisma.cuotasGetPayload<typeof CUOTAS_CON_PAGOS>;

function conEstadosDePagos(cuotas: CuotaConPagos[]): SituacionDeCuotas["cuotas"] {
  return cuotas.map(({ pagos, ...cuota }) => ({
    ...cuota,
    estados_pagos: pagos.map(({ estado }) => estado),
  }));
}

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
        cuotas: CUOTAS_CON_PAGOS,
      },
    });
    return filas.map(({ id_inscripcion, fecha_baja, plan, cuotas }) => ({
      id_inscripcion,
      tipo_plan: plan.tipo,
      dias_gracia: plan.dias_gracia,
      fecha_baja,
      cuotas: conEstadosDePagos(cuotas),
    }));
  }

  // Las inscripciones activas de plan mensual con alguna cuota paga que vence hasta esa fecha: las
  // demás no tienen nada que avisar. No lleva tope: un tope dejaría avisos sin dar, y crece solo con
  // los alumnos activos.
  async situacionParaAvisos(venceHasta: Date): Promise<SituacionParaAviso[]> {
    const filas = await this.prisma.inscripciones.findMany({
      where: {
        estado: "ACTIVA",
        alumno: { estado: { not: "BAJA" } },
        plan: { tipo: "MENSUAL" },
        cuotas: {
          some: { fecha_vencimiento: { lte: venceHasta }, pagos: { some: { estado: "CONFIRMADO" } } },
        },
      },
      select: {
        id_inscripcion: true,
        fecha_baja: true,
        plan: { select: { tipo: true, dias_gracia: true, nombre: true } },
        alumno: {
          select: {
            id_alumno: true,
            id_usuario: true,
            id_usuario_responsable: true,
            usuario: { select: { nombre: true, apellido: true } },
          },
        },
        cuotas: CUOTAS_CON_PAGOS,
      },
      orderBy: { id_inscripcion: "asc" },
    });
    return filas.map(({ id_inscripcion, fecha_baja, plan, alumno, cuotas }) => ({
      id_inscripcion,
      tipo_plan: plan.tipo,
      dias_gracia: plan.dias_gracia,
      fecha_baja,
      nombre_plan: plan.nombre,
      alumno: {
        id_alumno: alumno.id_alumno,
        id_usuario: alumno.id_usuario,
        id_usuario_responsable: alumno.id_usuario_responsable,
        nombre: alumno.usuario.nombre,
        apellido: alumno.usuario.apellido,
      },
      cuotas: conEstadosDePagos(cuotas),
    }));
  }

  // US-26: las inscripciones activas de plan mensual, no bonificadas, con alguna cuota paga que ya
  // venció: entre ellas están todas las vencidas, y el service decide cuáles lo están. Sin tope por
  // lo mismo que los avisos: crece solo con los alumnos activos.
  async situacionParaResumen(hoy: Date): Promise<SituacionParaResumen[]> {
    const nombre = { select: { nombre: true, apellido: true } } as const;
    const filas = await this.prisma.inscripciones.findMany({
      where: {
        estado: "ACTIVA",
        sin_cargo: false,
        alumno: { estado: { not: "BAJA" } },
        plan: { tipo: "MENSUAL" },
        cuotas: { some: { fecha_vencimiento: { lt: hoy }, pagos: { some: { estado: "CONFIRMADO" } } } },
      },
      select: {
        id_inscripcion: true,
        id_plan: true,
        id_promocion: true,
        fecha_baja: true,
        plan: { select: { tipo: true, dias_gracia: true, nombre: true } },
        profesora: { select: { id_profesora: true, usuario: nombre } },
        alumno: { select: { id_alumno: true, usuario: nombre } },
        cuotas: CUOTAS_CON_PAGOS,
      },
      orderBy: { id_inscripcion: "asc" },
    });
    return filas.map(({ plan, profesora, alumno, cuotas, ...fila }) => ({
      ...fila,
      tipo_plan: plan.tipo,
      dias_gracia: plan.dias_gracia,
      nombre_plan: plan.nombre,
      profesora: { id_profesora: profesora.id_profesora, ...profesora.usuario },
      alumno: { id_alumno: alumno.id_alumno, ...alumno.usuario },
      cuotas: conEstadosDePagos(cuotas),
    }));
  }

  // US-34: igual que situacionParaResumen, pero incluye teléfono y email del alumno (o tutor responsable)
  // para la gestión de cobranza y contacto directo.
  async situacionParaInforme(hoy: Date): Promise<SituacionParaInforme[]> {
    const nombre = { select: { nombre: true, apellido: true } } as const;
    const contacto = { select: { nombre: true, apellido: true, telefono: true, email: true } } as const;
    const filas = await this.prisma.inscripciones.findMany({
      where: {
        estado: "ACTIVA",
        sin_cargo: false,
        alumno: { estado: { not: "BAJA" } },
        plan: { tipo: "MENSUAL" },
        cuotas: { some: { fecha_vencimiento: { lt: hoy }, pagos: { some: { estado: "CONFIRMADO" } } } },
      },
      select: {
        id_inscripcion: true,
        id_plan: true,
        id_promocion: true,
        fecha_baja: true,
        plan: { select: { tipo: true, dias_gracia: true, nombre: true } },
        profesora: { select: { id_profesora: true, usuario: nombre } },
        alumno: {
          select: {
            id_alumno: true,
            usuario: contacto,
            responsable: contacto,
          },
        },
        cuotas: CUOTAS_CON_PAGOS,
      },
      orderBy: { id_inscripcion: "asc" },
    });
    return filas.map(({ plan, profesora, alumno, cuotas, ...fila }) => ({
      ...fila,
      tipo_plan: plan.tipo,
      dias_gracia: plan.dias_gracia,
      nombre_plan: plan.nombre,
      profesora: { id_profesora: profesora.id_profesora, ...profesora.usuario },
      alumno: {
        id_alumno: alumno.id_alumno,
        nombre: alumno.usuario.nombre,
        apellido: alumno.usuario.apellido,
        telefono: alumno.usuario.telefono ?? alumno.responsable?.telefono ?? null,
        email: alumno.usuario.email ?? alumno.responsable?.email ?? null,
      },
      cuotas: conEstadosDePagos(cuotas),
    }));
  }

  // Suma en la base, de una consulta: una inscripción sin cobros en el período no figura.
  async cobradoEnPeriodo(idsInscripciones: number[], desde: Date, hasta: Date): Promise<Map<number, number>> {
    const filas = await this.prisma.$queryRaw<{ id_inscripcion: number; total: Prisma.Decimal }[]>`
      SELECT c.id_inscripcion, SUM(p.monto) AS total
      FROM pagos p
      JOIN cuotas c ON c.id_cuota = p.id_cuota
      WHERE p.estado = 'CONFIRMADO'
        AND c.id_inscripcion = ANY(${idsInscripciones})
        AND p.fecha_pago >= ${desde}
        AND p.fecha_pago < ${hasta}
      GROUP BY c.id_inscripcion`;
    return new Map(filas.map(({ id_inscripcion, total }) => [id_inscripcion, Number(total)]));
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
