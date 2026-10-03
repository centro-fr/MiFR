import { prisma } from "../../../shared/db/client.js";
import type { CrearProfesoraInput } from "./profesor.schemas.js";
import type { Profesora } from "./profesor.types.js";

export class ProfesorRepository {
  crear(input: CrearProfesoraInput): Promise<Profesora> {
    return prisma.profesoras.create({ data: input });
  }

  buscarPorId(id: number): Promise<Profesora | null> {
    return prisma.profesoras.findUnique({ where: { id_profesora: id } });
  }

  buscarPorUsuarioId(idUsuario: number): Promise<Profesora | null> {
    return prisma.profesoras.findUnique({ where: { id_usuario: idUsuario } });
  }

  listar(): Promise<Profesora[]> {
    return prisma.profesoras.findMany({
      where: { fecha_baja: null },
      orderBy: { id_profesora: "asc" },
    });
  }

  darDeBaja(id: number): Promise<Profesora> {
    return prisma.profesoras.update({
      where: { id_profesora: id },
      data: { fecha_baja: new Date() },
    });
  }
}
