import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/db/client.js";
import type { ActualizarActividadInput, CrearActividadInput } from "./actividad.schemas.js";
import type { Actividad, FiltroActividad } from "./actividad.types.js";

export class ActividadRepository {
  async crear(input: CrearActividadInput): Promise<Actividad> {
    return prisma.actividades.create({
      data: {
        ...input,
        activo: true,
      },
    });
  }

  async listar(filtro: FiltroActividad): Promise<Actividad[]> {
    const where: Prisma.actividadesWhereInput = { activo: true };

    if (filtro.busqueda) {
      where.OR = [
        { codigo: { contains: filtro.busqueda, mode: "insensitive" } },
        { nombre: { contains: filtro.busqueda, mode: "insensitive" } },
      ];
    }

    return prisma.actividades.findMany({
      where,
      orderBy: { nombre: "asc" },
    });
  }

  async buscarPorId(id: number): Promise<Actividad | null> {
    return prisma.actividades.findUnique({
      where: { id_actividad: id },
    });
  }

  async buscarPorCodigo(codigo: string): Promise<Actividad | null> {
    return prisma.actividades.findUnique({
      where: { codigo },
    });
  }

  async actualizar(id: number, input: ActualizarActividadInput): Promise<Actividad> {
    return prisma.actividades.update({
      where: { id_actividad: id },
      data: input,
    });
  }

  async bajaLogica(id: number): Promise<Actividad> {
    return prisma.actividades.update({
      where: { id_actividad: id },
      data: { activo: false },
    });
  }
}
