import { Prisma, type PrismaClient } from "@prisma/client";
import type { ActualizarActividadInput, CrearActividadInput } from "./actividad.schemas.js";
import type { Actividad, FiltroActividad } from "./actividad.types.js";

export class ActividadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(input: CrearActividadInput): Promise<Actividad> {
    return this.prisma.actividades.create({
      data: {
        ...input,
        activo: true,
      },
    });
  }

  async listar(filtro: FiltroActividad): Promise<Actividad[]> {
    const where: Prisma.actividadesWhereInput = {
      ...(filtro.incluirBajas ? {} : { activo: true }),
    };

    if (filtro.busqueda) {
      where.OR = [
        { codigo: { contains: filtro.busqueda, mode: "insensitive" } },
        { nombre: { contains: filtro.busqueda, mode: "insensitive" } },
      ];
    }

    return this.prisma.actividades.findMany({
      where,
      orderBy: { nombre: "asc" },
    });
  }

  async buscarPorId(id: number): Promise<Actividad | null> {
    return this.prisma.actividades.findUnique({
      where: { id_actividad: id },
    });
  }

  async buscarPorCodigo(codigo: string): Promise<Actividad | null> {
    return this.prisma.actividades.findUnique({
      where: { codigo },
    });
  }

  async actualizar(
    id: number,
    input: Omit<ActualizarActividadInput, "reactivar"> & { activo?: boolean },
  ): Promise<Actividad> {
    return this.prisma.actividades.update({
      where: { id_actividad: id },
      data: input,
    });
  }

  bajaLogica(id: number): Promise<Actividad> {
    return this.prisma.actividades.update({
      where: { id_actividad: id },
      data: { activo: false },
    });
  }
}
