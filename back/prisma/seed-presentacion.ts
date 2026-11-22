import { PrismaClient } from "@prisma/client";
import { construirSistema } from "../src/composicion.js";
import { JwtService } from "../src/modules/gestion-usuarios/sesion/jwt.service.js";
import type { IAutenticacionGoogleAuth } from "../src/modules/gestion-usuarios/sesion/interface/i-autenticacion-google-auth.js";
import { cargarCatalogoInsignias } from "../src/shared/db/catalogo-insignias.js";
import { cargarCatalogoSeguridad } from "../src/shared/db/catalogo-seguridad.js";
import { cargarParametrosIniciales } from "../src/shared/db/parametros-iniciales.js";
import { cargarPresentacion } from "../src/shared/db/presentacion/cargar.js";
import { ALUMNOS } from "../src/shared/db/presentacion/elenco.js";

// Carga en la base local el centro de la presentación (src/shared/db/presentacion/): meses de
// alumnos, cuotas, pagos, clases y asistencias, con las liquidaciones, las insignias y los avisos que
// generan los procesos de la API. Es solo para desarrollo y presentaciones: nunca contra Neon.
//
// Uso: pnpm --filter back db:seed:presentacion
// Parte de una base vacía (recién migrada). Si ya está cargada, no hace nada.

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "db"]);

function verificarBaseLocal(): void {
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (!HOSTS_LOCALES.has(host)) {
    console.error(`La presentación solo se carga en una base local, y DATABASE_URL apunta a "${host}".`);
    process.exit(1);
  }
}

// La carga no se superpone con otros datos: si la base ya tiene alumnos, o ya es la de la presentación
// (no se hace nada) o tiene otros (se avisa cómo vaciarla).
async function verificarBaseVacia(prisma: PrismaClient): Promise<"vacia" | "ya-cargada"> {
  if ((await prisma.alumnos.count()) === 0 && (await prisma.profesoras.count()) === 0) return "vacia";
  const testigo = await prisma.usuarios.findUnique({ where: { dni: ALUMNOS[0].dni } });
  if (testigo) return "ya-cargada";
  console.error(
    "La base ya tiene otros datos. Para cargar la presentación hay que vaciarla:\n" +
      "  con Docker:  docker compose --profile completo down -v  y volver a levantarlo\n" +
      "  sin Docker:  pnpm --filter back exec prisma migrate reset --skip-seed",
  );
  process.exit(1);
}

// La carga no inicia sesiones: Google y el JWT solo hacen falta para armar el sistema.
const sinGoogle: IAutenticacionGoogleAuth = {
  verificarToken: () => Promise.reject(new Error("La carga de la presentación no inicia sesiones")),
};

async function main(prisma: PrismaClient): Promise<void> {
  verificarBaseLocal();
  if ((await verificarBaseVacia(prisma)) === "ya-cargada") {
    console.log("La base ya tiene los datos de la presentación: no se cargó nada.");
    return;
  }

  await cargarCatalogoSeguridad(prisma);
  await cargarCatalogoInsignias(prisma);
  await cargarParametrosIniciales(prisma);
  const sistema = construirSistema({
    prisma,
    googleAuth: sinGoogle,
    jwtService: new JwtService("carga-de-la-presentacion-sin-sesiones", "1m"),
  });
  const resumen = await cargarPresentacion(prisma, sistema);

  console.log("Presentación cargada:");
  for (const [que, cuantos] of Object.entries(resumen)) console.log(`  ${que}: ${cuantos}`);
  console.log("Para entrar sin Google, LOGIN_DESARROLLO=true en back/.env y alguno de estos emails:");
  console.log("  marina.sosa@example.com (propietaria y profesora), lucia.gomez@example.com (profesora),");
  console.log("  camila.perez@example.com (alumna), mariana.lopez@example.com (tutora)");
}

const prisma = new PrismaClient();
main(prisma)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
