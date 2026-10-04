import type { PrismaClient } from "@prisma/client";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { CrearProfesoraInput } from "./profesor.schemas.js";
import type { Profesora } from "./profesor.types.js";

export class ProfesorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  crear(input: CrearProfesoraInput): Promise<Profesora> {
    return this.prisma.profesoras.create({ data: { ...input, fecha_alta: fechaActualArgentina() } });
  }

  buscarPorId(id: number): Promise<Profesora | null> {
    return this.prisma.profesoras.findUnique({ where: { id_profesora: id } });
  }

  buscarPorUsuarioId(idUsuario: number): Promise<Profesora | null> {
    return this.prisma.profesoras.findUnique({ where: { id_usuario: idUsuario } });
  }

  listar(): Promise<Profesora[]> {
    return this.prisma.profesoras.findMany({
      where: { fecha_baja: null },
      orderBy: { id_profesora: "asc" },
    });
  }

  darDeBaja(id: number): Promise<Profesora> {
    return this.prisma.profesoras.update({
      where: { id_profesora: id },
      data: { fecha_baja: fechaActualArgentina() },
    });
  }
}
