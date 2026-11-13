import type { Prisma, PrismaClient } from "@prisma/client";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { ActualizarProfesoraInput, CrearProfesoraInput } from "./profesor.schemas.js";
import type { Profesora } from "./profesor.types.js";

const CON_NOMBRE = {
  usuario: { select: { nombre: true, apellido: true } },
} satisfies Prisma.profesorasInclude;

const CON_DATOS_DE_CONTACTO = {
  usuario: { select: { nombre: true, apellido: true, email: true, telefono: true, fecha_nacimiento: true } },
} satisfies Prisma.profesorasInclude;

export class ProfesorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  crear(input: CrearProfesoraInput): Promise<Profesora> {
    return this.prisma.profesoras.create({
      data: { ...input, fecha_alta: fechaActualArgentina() },
      include: CON_NOMBRE,
    });
  }

  buscarPorId(id: number): Promise<Profesora | null> {
    return this.prisma.profesoras.findUnique({ where: { id_profesora: id }, include: CON_NOMBRE });
  }

  buscarPorUsuarioId(idUsuario: number): Promise<Profesora | null> {
    return this.prisma.profesoras.findUnique({ where: { id_usuario: idUsuario }, include: CON_NOMBRE });
  }

  listar(filtro?: { incluirBajas?: boolean }, incluirDatosContacto = false): Promise<Profesora[]> {
    return this.prisma.profesoras.findMany({
      where: filtro?.incluirBajas ? undefined : { fecha_baja: null },
      include: incluirDatosContacto ? CON_DATOS_DE_CONTACTO : CON_NOMBRE,
      orderBy: { id_profesora: "asc" },
    });
  }

  darDeBaja(id: number): Promise<Profesora> {
    return this.prisma.profesoras.update({
      where: { id_profesora: id },
      data: { fecha_baja: fechaActualArgentina() },
      include: CON_NOMBRE,
    });
  }

  actualizar(
    id: number,
    input: Pick<ActualizarProfesoraInput, "especialidad"> & { fecha_baja?: null },
  ): Promise<Profesora> {
    return this.prisma.profesoras.update({
      where: { id_profesora: id },
      data: input,
      include: CON_NOMBRE,
    });
  }
}
