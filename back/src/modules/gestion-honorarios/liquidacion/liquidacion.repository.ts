import type { Prisma, PrismaClient } from "@prisma/client";
import { enTransaccion } from "../../../shared/db/transaccion.js";
import type {
  BorradorLiquidacion,
  DetalleLiquidacion,
  EstadoLiquidacion,
  LiquidacionConProfesora,
  LiquidacionDetallada,
  ResultadoGuardado,
} from "./liquidacion.types.js";

const CON_PROFESORA = {
  profesora: {
    select: { id_profesora: true, usuario: { select: { nombre: true, apellido: true } } },
  },
} satisfies Prisma.liquidacionesInclude;

const CON_DETALLE = {
  ...CON_PROFESORA,
  detalles: {
    orderBy: { id_liq_detalle: "asc" },
    include: {
      inscripcion: {
        select: {
          alumno: {
            select: { id_alumno: true, usuario: { select: { nombre: true, apellido: true } } },
          },
        },
      },
      clase: {
        select: {
          fecha_clase: true,
          horario: {
            select: { hora_inicio: true, hora_fin: true, actividad: { select: { nombre: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.liquidacionesInclude;

type FilaConProfesora = Prisma.liquidacionesGetPayload<{ include: typeof CON_PROFESORA }>;
type FilaDetallada = Prisma.liquidacionesGetPayload<{ include: typeof CON_DETALLE }>;

function aLiquidacion({ monto_total, ...resto }: FilaConProfesora): LiquidacionConProfesora {
  return { ...resto, monto_total: monto_total.toNumber() };
}

function aDetalle(fila: FilaDetallada["detalles"][number]): DetalleLiquidacion {
  const { id_liq_detalle, id_tarifa, concepto, id_inscripcion, id_clase, inscripcion, clase } = fila;
  return {
    id_liq_detalle,
    id_tarifa,
    concepto,
    id_inscripcion,
    id_clase,
    monto: fila.monto.toNumber(),
    alumno: inscripcion && {
      id_alumno: inscripcion.alumno.id_alumno,
      nombre: inscripcion.alumno.usuario.nombre,
      apellido: inscripcion.alumno.usuario.apellido,
    },
    clase: clase && {
      fecha_clase: clase.fecha_clase,
      hora_inicio: clase.horario.hora_inicio,
      hora_fin: clase.horario.hora_fin,
      actividad: clase.horario.actividad.nombre,
    },
  };
}

// Serializa dos generaciones del mismo mes, que si no podían dejar dos liquidaciones de una misma
// profesora y período. El prefijo evita chocar con los otros advisory locks.
async function bloquearPeriodo(transaccion: Prisma.TransactionClient, desde: Date): Promise<void> {
  const clave = `liquidaciones-periodo:${desde.toISOString().slice(0, 10)}`;
  await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
}

export class LiquidacionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Crea el borrador de cada profesora o, si ya tiene uno, lo recalcula entero. Las que ya están
  // CERRADA o PAGADA son una foto: no se tocan y se informan.
  guardarBorradores(desde: Date, hasta: Date, borradores: BorradorLiquidacion[]): Promise<ResultadoGuardado> {
    const periodo = { periodo_desde: desde, periodo_hasta: hasta };
    return enTransaccion(this.prisma, async (transaccion) => {
      await bloquearPeriodo(transaccion, desde);
      const existentes = await transaccion.liquidaciones.findMany({ where: periodo });
      const porProfesora = new Map(existentes.map((fila) => [fila.id_profesora, fila]));
      const sin_recalcular: number[] = [];

      for (const { id_profesora, monto_total, detalles } of borradores) {
        const existente = porProfesora.get(id_profesora);
        if (existente && existente.estado !== "BORRADOR") {
          sin_recalcular.push(id_profesora);
        } else if (existente) {
          const { id_liquidacion } = existente;
          await transaccion.liquidacion_detalles.deleteMany({ where: { id_liquidacion } });
          await transaccion.liquidaciones.update({
            where: { id_liquidacion },
            data: { monto_total, fecha_liquidacion: new Date() },
          });
          await transaccion.liquidacion_detalles.createMany({
            data: detalles.map((detalle) => ({ ...detalle, id_liquidacion })),
          });
        } else {
          await transaccion.liquidaciones.create({
            data: { id_profesora, ...periodo, monto_total, estado: "BORRADOR", detalles: { create: detalles } },
          });
        }
      }

      const filas = await transaccion.liquidaciones.findMany({
        where: periodo,
        include: CON_PROFESORA,
        orderBy: { id_profesora: "asc" },
      });
      return { liquidaciones: filas.map(aLiquidacion), sin_recalcular };
    });
  }

  async listarPorPeriodo(desde: Date, hasta: Date): Promise<LiquidacionConProfesora[]> {
    const filas = await this.prisma.liquidaciones.findMany({
      where: { periodo_desde: desde, periodo_hasta: hasta },
      include: CON_PROFESORA,
      orderBy: { id_profesora: "asc" },
    });
    return filas.map(aLiquidacion);
  }

  async buscarPorId(id: number): Promise<LiquidacionDetallada | null> {
    const fila = await this.prisma.liquidaciones.findUnique({
      where: { id_liquidacion: id },
      include: CON_DETALLE,
    });
    if (!fila) return null;
    const { detalles, ...liquidacion } = fila;
    return { ...aLiquidacion(liquidacion), detalles: detalles.map(aDetalle) };
  }

  // El UPDATE vuelve a comprobar el estado de origen, así dos pedidos a la vez no cierran ni pagan
  // dos veces la misma liquidación. Devuelve false si ya no estaba en ese estado.
  async transicionar(id: number, desde: EstadoLiquidacion, hacia: EstadoLiquidacion): Promise<boolean> {
    const { count } = await this.prisma.liquidaciones.updateMany({
      where: { id_liquidacion: id, estado: desde },
      data: { estado: hacia },
    });
    return count > 0;
  }
}