import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/db/client.js";
import type { ActualizarHorarioInput, CrearHorarioInput } from "./horario.schemas.js";
import type { FiltroHorario, HorarioConDatos } from "./horario.types.js";

const CON_DATOS = { actividad: true, profesora: true } satisfies Prisma.horariosInclude;

interface CriterioSuperposicion {
  id_profesora: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
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
  crear(input: CrearHorarioInput): Promise<HorarioConDatos | null> {
    return prisma.$transaction(async (transaccion) => {
      await bloquearAgenda(transaccion, input.id_profesora, input.dia_semana);
      if (await existeSuperposicion(transaccion, input)) return null;

      return transaccion.horarios.create({
        data: {
          ...input,
          hora_inicio: convertirHora(input.hora_inicio),
          hora_fin: convertirHora(input.hora_fin),
        },
        include: CON_DATOS,
      });
    });
  }

  listar(filtro: FiltroHorario): Promise<HorarioConDatos[]> {
    return prisma.horarios.findMany({
      where: { fecha_baja: null, ...filtro },
      include: CON_DATOS,
      orderBy: [{ dia_semana: "asc" }, { hora_inicio: "asc" }],
    });
  }

  buscarPorId(id: number): Promise<HorarioConDatos | null> {
    return prisma.horarios.findUnique({ where: { id_horario: id }, include: CON_DATOS });
  }

  tieneActivosDeProfesora(idProfesora: number): Promise<boolean> {
    return prisma.horarios
      .count({ where: { id_profesora: idProfesora, fecha_baja: null } })
      .then((cantidad) => cantidad > 0);
  }

  actualizar(
    id: number,
    input: ActualizarHorarioInput,
    criterio: CriterioSuperposicion,
  ): Promise<HorarioConDatos | null> {
    return prisma.$transaction(async (transaccion) => {
      await bloquearAgenda(transaccion, criterio.id_profesora, criterio.dia_semana);
      if (await existeSuperposicion(transaccion, criterio, id)) return null;

      return transaccion.horarios.update({
        where: { id_horario: id },
        data: mapearHoras(input),
        include: CON_DATOS,
      });
    });
  }

  darDeBaja(id: number): Promise<HorarioConDatos> {
    return prisma.horarios.update({
      where: { id_horario: id },
      data: { fecha_baja: new Date() },
      include: CON_DATOS,
    });
  }
}
