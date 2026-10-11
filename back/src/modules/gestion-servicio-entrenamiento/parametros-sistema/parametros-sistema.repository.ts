import type { PrismaClient } from "@prisma/client";
import type { ClaveParametro } from "./parametros-sistema.types.js";

export class ParametrosSistemaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarValor(clave: ClaveParametro): Promise<string | null> {
    const parametro = await this.prisma.parametros_sistema.findUnique({
      where: { clave },
      select: { valor: true },
    });
    return parametro?.valor ?? null;
  }
}
