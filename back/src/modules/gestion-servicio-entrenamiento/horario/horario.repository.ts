import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/db/client.js";
import type { ActualizarHorarioInput, CrearHorarioInput } from "./horario.schemas.js";
import type { FiltroHorario, HorarioConDatos } from "./horario.types.js";

const CON_DATOS = { actividad: true, profesora: true } satisfies Prisma.horariosInclude;

function convertirHora(hora: string): Date {
  const [horas, minutos] = hora.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, horas, minutos));
}

function mapearHoras(input: ActualizarHorarioInput): Prisma.horariosUncheckedUpdateInput {
  return {
    ...input,
    ...(input.hora_inicio ? { hora_inicio: convertirHora(input.hora_inicio) } : {}),
    ...(input.hora_fin ? { hora_fin: convertirHora(input.hora_fin) } : {}),
  };
}

export class HorarioRepository {
  crear(input: CrearHorarioInput): Promise<HorarioConDatos> {
    return prisma.horarios.create({
      data: {
        ...input,
        hora_inicio: convertirHora(input.hora_inicio),
        hora_fin: convertirHora(input.hora_fin),
      },
      include: CON_DATOS,
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

  buscarSuperposicion(
    idProfesora: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    excluirId?: number,
  ): Promise<HorarioConDatos | null> {
    return prisma.horarios.findFirst({
      where: {
        id_profesora: idProfesora,
        dia_semana: diaSemana,
        fecha_baja: null,
        hora_inicio: { lt: convertirHora(horaFin) },
        hora_fin: { gt: convertirHora(horaInicio) },
        ...(excluirId === undefined ? {} : { id_horario: { not: excluirId } }),
      },
      include: CON_DATOS,
    });
  }

  tieneActivosDeActividad(idActividad: number): Promise<boolean> {
    return prisma.horarios
      .count({ where: { id_actividad: idActividad, fecha_baja: null } })
      .then((cantidad) => cantidad > 0);
  }

  tieneActivosDeProfesora(idProfesora: number): Promise<boolean> {
    return prisma.horarios
      .count({ where: { id_profesora: idProfesora, fecha_baja: null } })
      .then((cantidad) => cantidad > 0);
  }

  actualizar(id: number, input: ActualizarHorarioInput): Promise<HorarioConDatos> {
    return prisma.horarios.update({
      where: { id_horario: id },
      data: mapearHoras(input),
      include: CON_DATOS,
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
