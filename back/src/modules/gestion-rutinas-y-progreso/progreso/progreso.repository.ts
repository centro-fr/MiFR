import type { Prisma, PrismaClient } from "@prisma/client";
import { clienteEnCurso } from "../../../shared/db/transaccion.js";
import type { NuevoRegistroDeProgreso, RegistroDeProgreso } from "./progreso.types.js";

const CON_MEDIDAS = {
  medidas: { include: { tipo_medida: true }, orderBy: { id_tipo_medida: "asc" } },
} satisfies Prisma.registros_progresoInclude;

type FilaConMedidas = Prisma.registros_progresoGetPayload<{ include: typeof CON_MEDIDAS }>;

function aRegistro(fila: FilaConMedidas): RegistroDeProgreso {
  return {
    id_registro: fila.id_registro,
    id_alumno: fila.id_alumno,
    id_profesora: fila.id_profesora,
    fecha: fila.fecha,
    observaciones: fila.observaciones,
    medidas: fila.medidas.map(({ tipo_medida, valor }) => ({
      codigo: tipo_medida.codigo,
      unidad: tipo_medida.unidad,
      valor: valor.toNumber(),
    })),
  };
}

export class ProgresoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // El registro y todas sus medidas se escriben juntos: si una falla, no queda ninguna. El tipo de
  // medida se crea la primera vez que se usa, así no depende de que alguien cargue antes el catálogo.
  async crear(nuevo: NuevoRegistroDeProgreso): Promise<RegistroDeProgreso> {
    const fila = await clienteEnCurso(this.prisma).registros_progreso.create({
      data: {
        id_alumno: nuevo.id_alumno,
        id_profesora: nuevo.id_profesora,
        fecha: nuevo.fecha,
        observaciones: nuevo.observaciones,
        medidas: {
          create: nuevo.medidas.map(({ codigo, unidad, valor }) => ({
            valor,
            tipo_medida: { connectOrCreate: { where: { codigo }, create: { codigo, unidad } } },
          })),
        },
      },
      include: CON_MEDIDAS,
    });
    return aRegistro(fila);
  }

  // De la medición más reciente a la más antigua (spec 09, RF-03).
  async listarDeAlumno(idAlumno: number): Promise<RegistroDeProgreso[]> {
    const filas = await this.prisma.registros_progreso.findMany({
      where: { id_alumno: idAlumno },
      orderBy: [{ fecha: "desc" }, { id_registro: "desc" }],
      include: CON_MEDIDAS,
    });
    return filas.map(aRegistro);
  }
}
