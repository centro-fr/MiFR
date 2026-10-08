import { PrismaClient } from "@prisma/client";
import { cargarCatalogoSeguridad } from "../src/shared/db/catalogo-seguridad.js";
import { ACTIVIDADES_DEMO, cargarDatosDemo, EMAIL_MULTIROL_DEMO } from "../src/shared/db/datos-demo.js";

// Carga en la base local los datos de prueba de src/shared/db/datos-demo.ts. Son para desarrollo:
// el seed principal (seed.ts) es el único que se corre contra la base publicada.
//
// Uso: pnpm --filter back db:seed:demo -- [email-del-usuario-multirol]
// El email opcional permite usar una cuenta de Google real para probar el login multi-rol.

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "db"]);

function verificarBaseLocal(): void {
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (!HOSTS_LOCALES.has(host)) {
    console.error(`Los datos de prueba solo se cargan en una base local, y DATABASE_URL apunta a "${host}".`);
    process.exit(1);
  }
}

async function main(prisma: PrismaClient): Promise<void> {
  verificarBaseLocal();
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const emailMultirol = args[0] ?? EMAIL_MULTIROL_DEMO;

  await cargarCatalogoSeguridad(prisma);
  const { idProfesora, horariosCreados } = await cargarDatosDemo(prisma, emailMultirol);

  console.log(
    `Profesoras de prueba: ${idProfesora.size} (multi-rol PROPIETARIA + PROFESORA: ${emailMultirol})`,
  );
  console.log(`Actividades de prueba: ${ACTIVIDADES_DEMO.map((a) => a.nombre).join(", ")}`);
  console.log(`Horarios nuevos: ${horariosCreados}`);
}

const prisma = new PrismaClient();
main(prisma)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
