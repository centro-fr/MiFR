import type { Prisma, PrismaClient, plan_precios } from "@prisma/client";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { ActualizarPlanInput, CrearPlanInput, RegistrarPrecioInput } from "./plan.schemas.js";
import type { FiltroPlan, Plan, PrecioPlan } from "./plan.types.js";

const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

// Solo hacen falta el precio que rige y los programados: los cerrados antes de hoy son historial
// y se piden aparte.
function conDatos(hoy: Date) {
  return {
    actividad_exclusiva: { select: { id_actividad: true, nombre: true, modalidad: true } },
    precios: {
      where: { OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: hoy } }] },
      orderBy: { fecha_vigencia_desde: "asc" },
    },
  } satisfies Prisma.planesInclude;
}

type PlanConDatos = Prisma.planesGetPayload<{ include: ReturnType<typeof conDatos> }>;

function aPrecioPlan(fila: plan_precios): PrecioPlan {
  return { ...fila, precio: fila.precio.toNumber() };
}

function aPlan({ precios, ...plan }: PlanConDatos, hoy: Date): Plan {
  const vigente = precios.find((precio) => precio.fecha_vigencia_desde <= hoy);
  const programado = precios.find((precio) => precio.fecha_vigencia_desde > hoy);
  return {
    ...plan,
    precio_vigente: vigente ? aPrecioPlan(vigente) : null,
    precio_programado: programado ? aPrecioPlan(programado) : null,
  };
}

// La clave lleva el prefijo "precios-plan" para no chocar con los otros advisory locks. Serializa
// dos actualizaciones del mismo plan, que si no podían dejar dos precios abiertos a la vez.
async function bloquearPreciosDelPlan(transaccion: Prisma.TransactionClient, idPlan: number): Promise<void> {
  const clave = `precios-plan:${idPlan}`;
  await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
}

export class PlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async crear({ precio, ...plan }: CrearPlanInput): Promise<Plan> {
    const hoy = fechaActualArgentina();
    const creado = await this.prisma.planes.create({
      data: {
        ...plan,
        fecha_alta: hoy,
        precios: { create: { precio, fecha_vigencia_desde: hoy } },
      },
      include: conDatos(hoy),
    });
    return aPlan(creado, hoy);
  }

  async listar(filtro: FiltroPlan): Promise<Plan[]> {
    const hoy = fechaActualArgentina();
    const where: Prisma.planesWhereInput = {
      ...(filtro.incluirBajas ? {} : { fecha_baja: null }),
      ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
      ...(filtro.id_actividad_exclusiva ? { id_actividad_exclusiva: filtro.id_actividad_exclusiva } : {}),
      ...(filtro.busqueda ? { nombre: { contains: filtro.busqueda, mode: "insensitive" } } : {}),
    };
    const planes = await this.prisma.planes.findMany({
      where,
      include: conDatos(hoy),
      orderBy: { nombre: "asc" },
    });
    return planes.map((plan) => aPlan(plan, hoy));
  }

  async buscarPorId(id: number): Promise<Plan | null> {
    const hoy = fechaActualArgentina();
    const plan = await this.prisma.planes.findUnique({ where: { id_plan: id }, include: conDatos(hoy) });
    return plan ? aPlan(plan, hoy) : null;
  }

  async existeVigenteConNombre(nombre: string, excluirId?: number): Promise<boolean> {
    const cantidad = await this.prisma.planes.count({
      where: {
        fecha_baja: null,
        nombre: { equals: nombre, mode: "insensitive" },
        ...(excluirId === undefined ? {} : { id_plan: { not: excluirId } }),
      },
    });
    return cantidad > 0;
  }

  async actualizar(id: number, input: ActualizarPlanInput): Promise<Plan> {
    const hoy = fechaActualArgentina();
    const plan = await this.prisma.planes.update({
      where: { id_plan: id },
      data: input,
      include: conDatos(hoy),
    });
    return aPlan(plan, hoy);
  }

  async darDeBaja(id: number): Promise<Plan> {
    const hoy = fechaActualArgentina();
    const plan = await this.prisma.planes.update({
      where: { id_plan: id },
      data: { fecha_baja: hoy },
      include: conDatos(hoy),
    });
    return aPlan(plan, hoy);
  }

  async listarPrecios(idPlan: number): Promise<PrecioPlan[]> {
    const precios = await this.prisma.plan_precios.findMany({
      where: { id_plan: idPlan },
      orderBy: { fecha_vigencia_desde: "desc" },
    });
    return precios.map(aPrecioPlan);
  }

  async precioVigente(idPlan: number, fecha: Date): Promise<PrecioPlan | null> {
    const precio = await this.prisma.plan_precios.findFirst({
      where: {
        id_plan: idPlan,
        fecha_vigencia_desde: { lte: fecha },
        OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: fecha } }],
      },
    });
    return precio ? aPrecioPlan(precio) : null;
  }

  // Los precios programados que empiezan desde la nueva fecha nunca rigieron (ninguna inscripción
  // los usa), así que el nuevo los reemplaza. El último que queda se cierra el día anterior.
  // Devuelve null si ya hay un precio que empezó esa misma fecha: hoy rige y no se puede cerrar
  // antes de su inicio.
  registrarPrecio(
    idPlan: number,
    { precio, fecha_vigencia_desde }: RegistrarPrecioInput,
  ): Promise<PrecioPlan | null> {
    const hoy = fechaActualArgentina();
    return this.prisma.$transaction(async (transaccion) => {
      await bloquearPreciosDelPlan(transaccion, idPlan);
      await transaccion.plan_precios.deleteMany({
        where: { id_plan: idPlan, fecha_vigencia_desde: { gte: fecha_vigencia_desde, gt: hoy } },
      });

      const ultimo = await transaccion.plan_precios.findFirst({
        where: { id_plan: idPlan },
        orderBy: { fecha_vigencia_desde: "desc" },
      });
      if (ultimo && ultimo.fecha_vigencia_desde >= fecha_vigencia_desde) return null;
      if (ultimo) {
        await transaccion.plan_precios.update({
          where: { id_plan_precio: ultimo.id_plan_precio },
          data: { fecha_vigencia_hasta: new Date(fecha_vigencia_desde.getTime() - UN_DIA_EN_MS) },
        });
      }

      const nuevo = await transaccion.plan_precios.create({
        data: { id_plan: idPlan, precio, fecha_vigencia_desde },
      });
      return aPrecioPlan(nuevo);
    });
  }
}
