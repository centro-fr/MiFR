import type { Prisma, PrismaClient } from "@prisma/client";
import { clienteEnCurso } from "../../../shared/db/transaccion.js";
import {
  INCLUIR_DATOS_SUPLENCIA,
  type CambiosSuplencia,
  type DatosSuplencia,
  type FiltroSuplencias,
  type SuplenciaConDatos,
} from "./suplencia.types.js";

export class SuplenciaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listar(filtro: FiltroSuplencias): Promise<SuplenciaConDatos[]> {
    return this.prisma.suplencias.findMany({
      where: condicionesDe(filtro),
      include: INCLUIR_DATOS_SUPLENCIA,
      orderBy: [{ clase: { fecha_clase: "desc" } }, { id_clase: "desc" }],
      take: filtro.limit,
      skip: filtro.offset,
    });
  }

  // Lee con la transacción en curso: después del bloqueo de la clase, ve la suplencia que dejó el
  // pedido anterior.
  buscarPorClase(idClase: number): Promise<SuplenciaConDatos | null> {
    return clienteEnCurso(this.prisma).suplencias.findFirst({
      where: { id_clase: idClase },
      include: INCLUIR_DATOS_SUPLENCIA,
    });
  }

  async crear(datos: DatosSuplencia): Promise<void> {
    await clienteEnCurso(this.prisma).suplencias.create({ data: datos });
  }

  async actualizar(idClase: number, idProfAusente: number, cambios: CambiosSuplencia): Promise<void> {
    await clienteEnCurso(this.prisma).suplencias.update({
      where: { id_clase_id_prof_ausente: { id_clase: idClase, id_prof_ausente: idProfAusente } },
      data: cambios,
    });
  }

  async eliminar(idClase: number, idProfAusente: number): Promise<void> {
    await clienteEnCurso(this.prisma).suplencias.delete({
      where: { id_clase_id_prof_ausente: { id_clase: idClase, id_prof_ausente: idProfAusente } },
    });
  }
}

function condicionesDe({
  desde,
  hasta,
  id_profesora,
  id_actividad,
}: FiltroSuplencias): Prisma.suplenciasWhereInput {
  const clase: Prisma.clasesWhereInput = {};
  if (desde !== undefined || hasta !== undefined) clase.fecha_clase = { gte: desde, lte: hasta };
  if (id_actividad !== undefined) clase.horario = { id_actividad };
  return {
    clase,
    ...(id_profesora === undefined
      ? {}
      : { OR: [{ id_prof_ausente: id_profesora }, { clase: { id_prof_dictante: id_profesora } }] }),
  };
}
