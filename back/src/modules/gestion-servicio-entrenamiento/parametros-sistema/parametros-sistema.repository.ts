import type { PrismaClient } from "@prisma/client";
import type { ClaveParametro, TipoDatoParametro } from "./parametros-sistema.types.js";

export interface FilaParametro {
  clave: string;
  valor: string;
  fecha_actualizacion: Date;
}

const SELECCION = { clave: true, valor: true, fecha_actualizacion: true } as const;

export class ParametrosSistemaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarValor(clave: ClaveParametro): Promise<string | null> {
    const parametro = await this.prisma.parametros_sistema.findUnique({
      where: { clave },
      select: { valor: true },
    });
    return parametro?.valor ?? null;
  }

  listar(): Promise<FilaParametro[]> {
    return this.prisma.parametros_sistema.findMany({ select: SELECCION });
  }

  // Un parámetro nuevo puede no tener fila todavía (el seed se corre a mano): se crea con el tipo y la
  // descripción del catálogo. Si ya la tiene, solo cambia el valor.
  guardar(
    clave: ClaveParametro,
    valor: string,
    tipo_dato: TipoDatoParametro,
    descripcion: string,
  ): Promise<FilaParametro> {
    return this.prisma.parametros_sistema.upsert({
      where: { clave },
      create: { clave, valor, tipo_dato, descripcion },
      update: { valor },
      select: SELECCION,
    });
  }
}
