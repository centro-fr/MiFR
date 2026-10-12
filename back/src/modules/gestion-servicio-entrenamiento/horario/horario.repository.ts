import { Prisma, type PrismaClient } from "@prisma/client";
import { enTransaccion } from "../../../shared/db/transaccion.js";
import type { ActualizarHorarioInput, CrearHorarioInput } from "./horario.schemas.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { FiltroHorario, HorarioConDatos } from "./horario.types.js";

const CON_DATOS = {
  actividad: true,
  profesora: { include: { usuario: { select: { nombre: true, apellido: true } } } },
} satisfies Prisma.horariosInclude;

interface CriterioSuperposicion {
  id_profesora: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

type Transaccion = Prisma.TransactionClient;

// La fachada cuenta los inscriptos antes de dar de baja para responder con un mensaje claro, pero entre
// ese conteo y la baja podía entrar una inscripción. Se vuelve a contar acá, con el mismo bloqueo que
// toma la inscripción: es la misma regla que IInfoInscripciones.contarInscriptosVigentes, repetida porque
// solo dentro del bloqueo el conteo es definitivo.
function contarInscriptosVigentes(transaccion: Transaccion, idsHorarios: number[]): Promise<number> {
  return transaccion.inscripcion_horarios.count({
    where: {
      id_horario: { in: idsHorarios },
      fecha_hasta: null,
      inscripcion: { estado: { in: ["PREINSCRIPTA", "ACTIVA"] }, alumno: { estado: { not: "BAJA" } } },
    },
  });
}

function convertirHora(hora: string): Date {
  const [horas, minutos] = hora.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, horas, minutos));
}

// La clave lleva el prefijo "agenda-profesora" para no chocar con otros advisory locks que se
// agreguen. Va con $executeRaw porque pg_advisory_xact_lock devuelve void y $queryRaw no puede
// deserializarlo.
async function bloquearAgenda(
  transaccion: Prisma.TransactionClient,
  idProfesora: number,
  diaSemana: number,
): Promise<void> {
  const clave = `agenda-profesora:${idProfesora}:${diaSemana}`;
  await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
}

async function existeSuperposicion(
  transaccion: Prisma.TransactionClient,
  criterio: CriterioSuperposicion,
  excluirId?: number,
): Promise<boolean> {
  const existente = await transaccion.horarios.findFirst({
    where: {
      id_profesora: criterio.id_profesora,
      dia_semana: criterio.dia_semana,
      fecha_baja: null,
      hora_inicio: { lt: convertirHora(criterio.hora_fin) },
      hora_fin: { gt: convertirHora(criterio.hora_inicio) },
      ...(excluirId === undefined ? {} : { id_horario: { not: excluirId } }),
    },
    select: { id_horario: true },
  });

  return existente !== null;
}

function mapearHoras(input: ActualizarHorarioInput): Prisma.horariosUncheckedUpdateInput {
  return {
    ...input,
    ...(input.hora_inicio ? { hora_inicio: convertirHora(input.hora_inicio) } : {}),
    ...(input.hora_fin ? { hora_fin: convertirHora(input.hora_fin) } : {}),
  };
}

export class HorarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  crear(input: CrearHorarioInput): Promise<HorarioConDatos | null> {
    return enTransaccion(this.prisma, async (transaccion) => {
      await bloquearAgenda(transaccion, input.id_profesora, input.dia_semana);
      if (await existeSuperposicion(transaccion, input)) return null;

      return transaccion.horarios.create({
        data: {
          ...input,
          hora_inicio: convertirHora(input.hora_inicio),
          hora_fin: convertirHora(input.hora_fin),
          fecha_alta: fechaActualArgentina(),
        },
        include: CON_DATOS,
      });
    });
  }

  listar(filtro: FiltroHorario): Promise<HorarioConDatos[]> {
    return this.prisma.horarios.findMany({
      where: { fecha_baja: null, ...filtro },
      include: CON_DATOS,
      orderBy: [{ dia_semana: "asc" }, { hora_inicio: "asc" }],
    });
  }

  listarActivosDelDia(diaSemana: number, fecha: Date): Promise<HorarioConDatos[]> {
    return this.prisma.horarios.findMany({
      where: { dia_semana: diaSemana, fecha_alta: { lte: fecha }, fecha_baja: null },
      include: CON_DATOS,
      orderBy: [{ hora_inicio: "asc" }, { id_horario: "asc" }],
    });
  }

  buscarPorId(id: number): Promise<HorarioConDatos | null> {
    return this.prisma.horarios.findUnique({ where: { id_horario: id }, include: CON_DATOS });
  }

  buscarPorIds(ids: number[]): Promise<HorarioConDatos[]> {
    return this.prisma.horarios.findMany({
      where: { id_horario: { in: ids } },
      include: CON_DATOS,
    });
  }

  tieneActivosDeProfesora(idProfesora: number): Promise<boolean> {
    return this.prisma.horarios
      .count({ where: { id_profesora: idProfesora, fecha_baja: null } })
      .then((cantidad) => cantidad > 0);
  }

  actualizar(
    id: number,
    input: ActualizarHorarioInput,
    criterio: CriterioSuperposicion,
  ): Promise<HorarioConDatos | null> {
    return enTransaccion(this.prisma, async (transaccion) => {
      await bloquearAgenda(transaccion, criterio.id_profesora, criterio.dia_semana);
      if (await existeSuperposicion(transaccion, criterio, id)) return null;

      return transaccion.horarios.update({
        where: { id_horario: id },
        data: mapearHoras(input),
        include: CON_DATOS,
      });
    });
  }

  // US-03: la baja de la actividad arrastra sus horarios activos. Toma el mismo bloqueo por horario
  // que la inscripción (en el mismo orden, para no trabarse con ella), así ninguna entra en un
  // horario que se está cerrando. Devuelve null, sin dar nada de baja, si alguno tiene inscriptos.
  darDeBajaDeActividad(idActividad: number): Promise<number | null> {
    return enTransaccion(this.prisma, async (transaccion) => {
      const activos = await transaccion.horarios.findMany({
        where: { id_actividad: idActividad, fecha_baja: null },
        select: { id_horario: true },
      });
      const claves = activos.map(({ id_horario }) => `inscripcion-horario:${id_horario}`).sort();
      for (const clave of claves) {
        await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
      }
      const ids = activos.map(({ id_horario }) => id_horario);
      if ((await contarInscriptosVigentes(transaccion, ids)) > 0) return null;
      const { count } = await transaccion.horarios.updateMany({
        where: { id_actividad: idActividad, fecha_baja: null },
        data: { fecha_baja: fechaActualArgentina() },
      });
      return count;
    });
  }

  // Devuelve null, sin darlo de baja, si tiene inscriptos.
  darDeBaja(id: number): Promise<HorarioConDatos | null> {
    return enTransaccion(this.prisma, async (transaccion) => {
      const clave = `inscripcion-horario:${id}`;
      await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
      if ((await contarInscriptosVigentes(transaccion, [id])) > 0) return null;
      return transaccion.horarios.update({
        where: { id_horario: id },
        data: { fecha_baja: fechaActualArgentina() },
        include: CON_DATOS,
      });
    });
  }
}
