import { PrismaClient } from "@prisma/client";
import { cargarCatalogoSeguridad } from "../../shared/db/catalogo-seguridad.js";

// Por defecto, la base del servicio db-test de docker-compose.yml. En CI se pasa por variable.
export const URL_BASE_DE_PRUEBA =
  process.env.DATABASE_URL_TEST ?? "postgresql://user:password@localhost:55433/mifr_test?schema=public";

// Los tests vacían todas las tablas: si la URL apunta por error a la base de desarrollo o a la
// publicada, se pierden los datos. Exigir el sufijo _test hace que ese error falle antes de tocar nada.
export function verificarBaseDePrueba(url: string = URL_BASE_DE_PRUEBA): void {
  const nombreDeLaBase = new URL(url).pathname.slice(1);
  if (!nombreDeLaBase.endsWith("_test")) {
    throw new Error(
      `Los tests de integración solo corren contra una base cuyo nombre termine en _test, y se recibió "${nombreDeLaBase}"`,
    );
  }
}

export function crearPrismaDePrueba(): PrismaClient {
  verificarBaseDePrueba();
  return new PrismaClient({ datasourceUrl: URL_BASE_DE_PRUEBA, log: ["error"] });
}

// Deja la base como recién sembrada: sin datos y con roles, permisos y la matriz inicial.
// Se trunca todo lo que exista en el esquema para no tener que mantener la lista de tablas a mano.
export async function reiniciarBase(prisma: PrismaClient): Promise<void> {
  const tablas = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  // Los nombres salen del catálogo de Postgres, no de una entrada externa.
  const lista = tablas.map(({ tablename }) => `"${tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${lista} RESTART IDENTITY CASCADE`);
  await cargarCatalogoSeguridad(prisma);
}
