import type { PrismaClient } from "@prisma/client";
import { CATALOGO_PARAMETROS } from "../../modules/gestion-servicio-entrenamiento/parametros-sistema/parametros-sistema.catalogo.js";

// Carga los parámetros que todavía no existen con su valor inicial. Los que ya están no se tocan:
// volver a correr el seed no pisa lo que la propietaria haya configurado.
export async function cargarParametrosIniciales(prisma: PrismaClient): Promise<void> {
  await prisma.parametros_sistema.createMany({
    data: Object.entries(CATALOGO_PARAMETROS).map(([clave, { tipo_dato, valor_inicial, descripcion }]) => ({
      clave,
      tipo_dato,
      valor: valor_inicial,
      descripcion,
    })),
    skipDuplicates: true,
  });
}
