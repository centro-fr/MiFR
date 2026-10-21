import type { Prisma, PrismaClient, tarifas_honorario } from "@prisma/client";
import { enTransaccion } from "../../../shared/db/transaccion.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { RegistrarTarifaInput } from "./tarifa-honorario.schemas.js";
import type { FiltroTarifa, TarifaHonorario } from "./tarifa-honorario.types.js";

const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

function aTarifa(fila: tarifas_honorario): TarifaHonorario {
  return { ...fila, valor: fila.valor.toNumber() };
}

// Serializa dos altas del mismo alcance (profesora, concepto y plan), que si no podían dejar dos
// tarifas abiertas a la vez. El prefijo evita chocar con los otros advisory locks.
async function bloquearAlcance(
  transaccion: Prisma.TransactionClient,
  { id_profesora, concepto, id_plan }: Pick<RegistrarTarifaInput, "id_profesora" | "concepto" | "id_plan">,
): Promise<void> {
  const clave = `tarifas-honorario:${id_profesora}:${concepto}:${id_plan ?? "todos"}`;
  await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
}

export class TarifaHonorarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(filtro: FiltroTarifa): Promise<TarifaHonorario[]> {
    const hoy = fechaActualArgentina();
    const where: Prisma.tarifas_honorarioWhereInput = {
      ...(filtro.id_profesora ? { id_profesora: filtro.id_profesora } : {}),
      ...(filtro.soloVigentes
        ? { OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: hoy } }] }
        : {}),
    };
    const filas = await this.prisma.tarifas_honorario.findMany({
      where,
      orderBy: [{ id_profesora: "asc" }, { concepto: "asc" }, { fecha_vigencia_desde: "desc" }],
    });
    return filas.map(aTarifa);
  }

  async buscarPorId(id: number): Promise<TarifaHonorario | null> {
    const fila = await this.prisma.tarifas_honorario.findUnique({ where: { id_tarifa: id } });
    return fila ? aTarifa(fila) : null;
  }

  // Las programadas que empiezan desde la nueva fecha nunca rigieron, así que la nueva las reemplaza,
  // salvo las que ya usa una liquidación (la del mes en curso busca la tarifa al último día del mes):
  // esas no se borran. La tarifa abierta del mismo alcance se cierra el día anterior.
  // Devuelve null si queda una que empieza en esa fecha o después: no se puede cerrar antes de su inicio.
  registrar(input: RegistrarTarifaInput): Promise<TarifaHonorario | null> {
    const hoy = fechaActualArgentina();
    const { id_profesora, concepto, id_plan, fecha_vigencia_desde } = input;
    const alcance = { id_profesora, concepto, id_plan };
    return enTransaccion(this.prisma, async (transaccion) => {
      await bloquearAlcance(transaccion, alcance);
      await transaccion.tarifas_honorario.deleteMany({
        where: {
          ...alcance,
          fecha_vigencia_desde: { gte: fecha_vigencia_desde, gt: hoy },
          detalles: { none: {} },
        },
      });

      const pisada = await transaccion.tarifas_honorario.findFirst({
        where: { ...alcance, fecha_vigencia_desde: { gte: fecha_vigencia_desde } },
      });
      if (pisada) return null;

      await transaccion.tarifas_honorario.updateMany({
        where: {
          ...alcance,
          fecha_vigencia_desde: { lt: fecha_vigencia_desde },
          OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: fecha_vigencia_desde } }],
        },
        data: { fecha_vigencia_hasta: new Date(fecha_vigencia_desde.getTime() - UN_DIA_EN_MS) },
      });

      const nueva = await transaccion.tarifas_honorario.create({ data: input });
      return aTarifa(nueva);
    });
  }

  async cerrar(id: number, fechaHasta: Date): Promise<TarifaHonorario> {
    const fila = await this.prisma.tarifas_honorario.update({
      where: { id_tarifa: id },
      data: { fecha_vigencia_hasta: fechaHasta },
    });
    return aTarifa(fila);
  }
}
