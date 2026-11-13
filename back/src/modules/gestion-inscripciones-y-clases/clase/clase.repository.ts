import type { PrismaClient } from "@prisma/client";
import { clienteEnCurso } from "../../../shared/db/transaccion.js";
import {
  INCLUIR_DATOS_CLASE,
  type ClaseConDatos,
  type ClaseSuplida,
  type EstadoClase,
  type HorarioDeClase,
} from "./clase.types.js";

// Tope de clases que procesa una pasada del cierre automático: las que quedan las toma la siguiente.
const CIERRES_POR_PASADA = 500;

export class ClaseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // El único (id_horario, fecha_clase) hace que pedir las clases del día dos veces, o desde dos
  // pedidos a la vez, no las duplique.
  async crearDelDia(horarios: HorarioDeClase[], fecha: Date): Promise<void> {
    if (horarios.length === 0) return;
    await this.prisma.clases.createMany({
      data: horarios.map(({ id_horario, id_profesora }) => ({
        id_horario,
        id_prof_dictante: id_profesora,
        fecha_clase: fecha,
      })),
      skipDuplicates: true,
    });
  }

  listarPorFecha(fecha: Date, idProfesora?: number): Promise<ClaseConDatos[]> {
    return this.prisma.clases.findMany({
      where: {
        fecha_clase: fecha,
        ...(idProfesora === undefined ? {} : { id_prof_dictante: idProfesora }),
      },
      include: INCLUIR_DATOS_CLASE,
      orderBy: [{ horario: { hora_inicio: "asc" } }, { id_clase: "asc" }],
      take: 100,
    });
  }

  listarAbiertasHasta(fecha: Date): Promise<ClaseConDatos[]> {
    return this.prisma.clases.findMany({
      where: { fecha_clase: { lte: fecha }, estado: "PROGRAMADA" },
      include: INCLUIR_DATOS_CLASE,
      orderBy: [{ fecha_clase: "asc" }, { horario: { hora_fin: "asc" } }, { id_clase: "asc" }],
      take: CIERRES_POR_PASADA,
    });
  }

  buscarPorHorarioYFecha(idHorario: number, fecha: Date): Promise<ClaseConDatos | null> {
    return this.prisma.clases.findUnique({
      where: { id_horario_fecha_clase: { id_horario: idHorario, fecha_clase: fecha } },
      include: INCLUIR_DATOS_CLASE,
    });
  }

  buscarPorId(idClase: number): Promise<ClaseConDatos | null> {
    return this.prisma.clases.findUnique({ where: { id_clase: idClase }, include: INCLUIR_DATOS_CLASE });
  }

  // Bloquea la fila de la clase hasta el final de la transacción en curso: un marcado y el cierre
  // no pueden cruzarse.
  async bloquear(idClase: number): Promise<EstadoClase | null> {
    const filas = await clienteEnCurso(this.prisma).$queryRaw<{ estado: EstadoClase }[]>`
      SELECT estado FROM clases WHERE id_clase = ${idClase} FOR UPDATE
    `;
    return filas[0]?.estado ?? null;
  }

  async cancelar(idClase: number): Promise<void> {
    await clienteEnCurso(this.prisma).clases.updateMany({
      where: { id_clase: idClase, estado: "PROGRAMADA" },
      data: { estado: "CANCELADA" },
    });
  }

  async cambiarDictante(idClase: number, idProfesora: number): Promise<void> {
    await clienteEnCurso(this.prisma).clases.update({
      where: { id_clase: idClase },
      data: { id_prof_dictante: idProfesora },
    });
  }

  // Las canceladas no se dictaron: no se le paga a nadie por ellas.
  async listarSuplidasEnPeriodo(desde: Date, hasta: Date): Promise<ClaseSuplida[]> {
    const clases = await this.prisma.clases.findMany({
      where: {
        fecha_clase: { gte: desde, lte: hasta },
        estado: { not: "CANCELADA" },
        suplencias: { some: {} },
      },
      select: {
        id_clase: true,
        id_horario: true,
        fecha_clase: true,
        id_prof_dictante: true,
        horario: { select: { hora_inicio: true, hora_fin: true } },
        suplencias: { select: { id_prof_ausente: true } },
      },
      orderBy: [{ fecha_clase: "asc" }, { id_clase: "asc" }],
    });
    return clases.flatMap(({ horario, suplencias, id_prof_dictante, ...clase }) =>
      suplencias.map(({ id_prof_ausente }) => ({
        ...clase,
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
        id_prof_suplente: id_prof_dictante,
        id_prof_ausente,
      })),
    );
  }

  // Solo cierra una PROGRAMADA: si dos cierres se cruzan, el segundo no encuentra nada que cerrar.
  async cerrar(idClase: number, fechaCierre: Date): Promise<ClaseConDatos | null> {
    const cliente = clienteEnCurso(this.prisma);
    const { count } = await cliente.clases.updateMany({
      where: { id_clase: idClase, estado: "PROGRAMADA" },
      data: { estado: "DICTADA", fecha_cierre_asist: fechaCierre },
    });
    if (count === 0) return null;
    return cliente.clases.findUnique({ where: { id_clase: idClase }, include: INCLUIR_DATOS_CLASE });
  }
}
