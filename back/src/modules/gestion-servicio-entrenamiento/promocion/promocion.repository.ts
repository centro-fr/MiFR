import type { Prisma, PrismaClient } from "@prisma/client";
import { enTransaccion } from "../../../shared/db/transaccion.js";
import { LIMITE_MAXIMO } from "../../../shared/utils/esquemas-paginacion.js";
import type {
  DatosPromocion,
  EstadoPromocion,
  FiltroPromociones,
  PromocionAplicable,
  PromocionGuardada,
  ResultadoGuardado,
} from "./promocion.types.js";

type Transaccion = Prisma.TransactionClient;

const CON_PLANES = {
  planes: { select: { plan: { select: { id_plan: true, nombre: true } } }, orderBy: { id_plan: "asc" } },
} satisfies Prisma.promocionesInclude;

type FilaConPlanes = Prisma.promocionesGetPayload<{ include: typeof CON_PLANES }>;

function aPromocion({ planes, valor, ...fila }: FilaConPlanes): PromocionGuardada {
  return { ...fila, valor: valor.toNumber(), planes: planes.map(({ plan }) => plan) };
}

const SELECCION_APLICABLE = {
  id_promocion: true,
  nombre: true,
  tipo_descuento: true,
  valor: true,
} satisfies Prisma.promocionesSelect;

function vigenteEl(fecha: Date): Prisma.promocionesWhereInput {
  return { activo: true, fecha_desde: { lte: fecha }, fecha_hasta: { gte: fecha } };
}

// El estado se deriva de las fechas y de activo, así que también se puede filtrar en la base.
function delEstado(estado: EstadoPromocion, hoy: Date): Prisma.promocionesWhereInput {
  switch (estado) {
    case "ACTIVA":
      return vigenteEl(hoy);
    case "PROGRAMADA":
      return { activo: true, fecha_desde: { gt: hoy } };
    case "VENCIDA":
      return { activo: true, fecha_hasta: { lt: hoy } };
    case "DESACTIVADA":
      return { activo: false };
  }
}

async function bloquearPlanes(transaccion: Transaccion, idsPlanes: number[]): Promise<void> {
  for (const idPlan of [...new Set(idsPlanes)].sort((a, b) => a - b)) {
    const clave = `promocion-plan:${idPlan}`;
    await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
  }
}

export class PromocionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(filtro: FiltroPromociones, hoy: Date): Promise<PromocionGuardada[]> {
    const filas = await this.prisma.promociones.findMany({
      where: {
        ...(filtro.estado === undefined ? {} : delEstado(filtro.estado, hoy)),
        ...(filtro.id_plan === undefined ? {} : { planes: { some: { id_plan: filtro.id_plan } } }),
      },
      include: CON_PLANES,
      orderBy: [{ fecha_desde: "desc" }, { id_promocion: "desc" }],
      take: filtro.limit ?? LIMITE_MAXIMO,
      skip: filtro.offset ?? 0,
    });
    return filas.map(aPromocion);
  }

  async buscarPorId(id: number): Promise<PromocionGuardada | null> {
    const fila = await this.prisma.promociones.findUnique({
      where: { id_promocion: id },
      include: CON_PLANES,
    });
    return fila ? aPromocion(fila) : null;
  }

  // Dos promociones activas no pueden superponerse en un mismo plan (decisión de SPRINT-4.md): la
  // superposición se comprueba y se guarda bajo el bloqueo de cada plan, así dos altas a la vez no
  // pasan las dos. Con idPromocion edita esa y la deja con exactamente esos planes.
  guardar(datos: DatosPromocion, idPromocion?: number): Promise<ResultadoGuardado> {
    const { ids_planes, ...columnas } = datos;
    return enTransaccion(this.prisma, async (transaccion) => {
      await bloquearPlanes(transaccion, ids_planes);
      const otra = { not: idPromocion };
      const superpuesta = await transaccion.promocion_planes.findFirst({
        where: {
          id_plan: { in: ids_planes },
          promocion: {
            id_promocion: otra,
            activo: true,
            fecha_desde: { lte: datos.fecha_hasta },
            fecha_hasta: { gte: datos.fecha_desde },
          },
        },
        select: { id_plan: true },
      });
      if (superpuesta) return { resultado: "superpuesta", id_plan: superpuesta.id_plan };

      const planes = ids_planes.map((id_plan) => ({ id_plan }));
      const fila =
        idPromocion === undefined
          ? await transaccion.promociones.create({
              data: { ...columnas, activo: true, planes: { create: planes } },
              include: CON_PLANES,
            })
          : await transaccion.promociones.update({
              where: { id_promocion: idPromocion },
              data: { ...columnas, planes: { deleteMany: {}, create: planes } },
              include: CON_PLANES,
            });
      return { resultado: "ok", promocion: aPromocion(fila) };
    });
  }

  // Solo desactiva una activa: dos pedidos seguidos no hacen nada dos veces. null si ya no lo estaba.
  async desactivar(id: number): Promise<PromocionGuardada | null> {
    return enTransaccion(this.prisma, async (transaccion) => {
      const { count } = await transaccion.promociones.updateMany({
        where: { id_promocion: id, activo: true },
        data: { activo: false },
      });
      if (count === 0) return null;
      return aPromocion(
        await transaccion.promociones.findUniqueOrThrow({ where: { id_promocion: id }, include: CON_PLANES }),
      );
    });
  }

  // Reactiva una promoción desactivada para volver a ofrecerla.
  async reactivar(id: number): Promise<PromocionGuardada | null> {
    return enTransaccion(this.prisma, async (transaccion) => {
      const { count } = await transaccion.promociones.updateMany({
        where: { id_promocion: id, activo: false },
        data: { activo: true },
      });
      if (count === 0) return null;
      return aPromocion(
        await transaccion.promociones.findUniqueOrThrow({ where: { id_promocion: id }, include: CON_PLANES }),
      );
    });
  }

  async vigenteParaPlan(idPlan: number, fecha: Date): Promise<PromocionAplicable | null> {
    const fila = await this.prisma.promociones.findFirst({
      where: { ...vigenteEl(fecha), planes: { some: { id_plan: idPlan } } },
      select: SELECCION_APLICABLE,
      orderBy: [{ fecha_desde: "desc" }, { id_promocion: "desc" }],
    });
    return fila ? { ...fila, valor: fila.valor.toNumber() } : null;
  }

  async buscarAplicable(
    idPromocion: number,
    idPlan: number,
    fecha: Date,
  ): Promise<PromocionAplicable | null> {
    const fila = await this.prisma.promociones.findFirst({
      where: { id_promocion: idPromocion, ...vigenteEl(fecha), planes: { some: { id_plan: idPlan } } },
      select: SELECCION_APLICABLE,
    });
    return fila ? { ...fila, valor: fila.valor.toNumber() } : null;
  }
}
