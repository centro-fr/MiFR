import { PrismaClient } from "@prisma/client";

// Este singleton es la realización del componente "Persistencia" de la vista
// arquitectónica (CapaAdministracionDatos): Prisma Client ya expone IMaterializar
// (create/update/delete) e IDesmaterializar (findUnique/findFirst/findMany) sobre
// BaseDeDatos (Postgres). No se envuelve en interfaces propias porque Prisma
// cumple ese rol directamente; los repositorios de cada módulo lo consumen así.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
