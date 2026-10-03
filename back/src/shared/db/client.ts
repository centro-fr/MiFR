import type { Prisma } from "@prisma/client";

// PrismaClient es la realización del componente "Persistencia" de la vista arquitectónica
// (CapaAdministracionDatos): ya expone IMaterializar (create/update/delete) e IDesmaterializar
// (findUnique/findFirst/findMany) sobre BaseDeDatos (Postgres), así que no se envuelve en
// interfaces propias. Lo instancia index.ts una sola vez y cada repositorio lo recibe por constructor.
export function opcionesDelClientePrisma(entorno: string | undefined): Prisma.PrismaClientOptions {
  return { log: entorno === "development" ? ["warn", "error"] : ["error"] };
}
