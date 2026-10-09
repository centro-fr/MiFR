import { PrismaClient } from "@prisma/client";
import { cargarCatalogoSeguridad } from "../src/shared/db/catalogo-seguridad.js";
import {
  ACTIVIDADES_DEMO,
  ALUMNOS_DEMO,
  cargarDatosDemo,
  EMAIL_MULTIROL_DEMO,
  INSCRIPCIONES_DEMO,
  PLANES_DEMO,
} from "../src/shared/db/datos-demo.js";

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
  console.log(`Planes de prueba: ${PLANES_DEMO.map((p) => p.nombre).join(", ")}`);
  const nombre = (a: (typeof ALUMNOS_DEMO)[number]) => `${a.nombre} ${a.apellido}`;
  console.log(
    `Alumnos pre-inscriptos: ${ALUMNOS_DEMO.filter((a) => !a.activo)
      .map(nombre)
      .join(", ")}`,
  );
  console.log(
    `Alumnos activos: ${ALUMNOS_DEMO.filter((a) => a.activo)
      .map(nombre)
      .join(", ")}`,
  );
  console.log(
    `Inscripciones: ${INSCRIPCIONES_DEMO.map((i) => `${i.dniAlumno} en ${i.nombrePlan}`).join(", ")}`,
  );
}

const prisma = new PrismaClient();
main(prisma)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
