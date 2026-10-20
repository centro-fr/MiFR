import type { PrismaClient } from "@prisma/client";
import { CATALOGO_INSIGNIAS } from "../../modules/gestion-insignias/insignia/insignia.catalogo.js";

// A diferencia de los parámetros, el catálogo no lo edita nadie desde la API: volver a cargarlo
// actualiza nombre, descripción y umbral para que un cambio en el código llegue a una base ya cargada.
export async function cargarCatalogoInsignias(prisma: PrismaClient): Promise<void> {
  for (const { codigo, ...datos } of CATALOGO_INSIGNIAS) {
    await prisma.insignias.upsert({ where: { codigo }, create: { codigo, ...datos }, update: datos });
  }
}
