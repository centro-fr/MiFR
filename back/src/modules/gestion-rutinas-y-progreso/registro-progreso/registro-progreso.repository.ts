import type { PrismaClient } from "@prisma/client";
import { clienteEnCurso } from "../../../shared/db/transaccion.js";
import type { RegistroARegistrar } from "./registro-progreso.types.js";

export class RegistroProgresoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // El registro y sus medidas en una sola sentencia. El tipo de medida se crea la primera vez que
  // se usa, así no depende de que alguien haya cargado antes el catálogo de tipos_medida.
  async registrar({ idAlumno, idProfesora, fecha, medidas }: RegistroARegistrar): Promise<void> {
    await clienteEnCurso(this.prisma).registros_progreso.create({
      data: {
        id_alumno: idAlumno,
        id_profesora: idProfesora,
        fecha,
        medidas: {
          create: medidas.map(({ codigo, unidad, valor }) => ({
            valor,
            tipo_medida: { connectOrCreate: { where: { codigo }, create: { codigo, unidad } } },
          })),
        },
      },
    });
  }
}
