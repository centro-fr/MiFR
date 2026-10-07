import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { URL_BASE_DE_PRUEBA, verificarBaseDePrueba } from "./base-de-prueba.js";

// Se aplica con `migrate deploy`, igual que en producción, y no con `db push`: los CHECK de las
// migraciones están escritos en SQL y `db push` no los crearía, así que la base de prueba sería otra.
export default function aplicarMigraciones(): void {
  verificarBaseDePrueba();

  // Se invoca el CLI con el mismo node que corre los tests: no depende de npx ni del shell de cada sistema.
  const cliDePrisma = join(
    dirname(createRequire(import.meta.url).resolve("prisma/package.json")),
    "build/index.js",
  );
  try {
    execFileSync(process.execPath, [cliDePrisma, "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: URL_BASE_DE_PRUEBA },
      stdio: "pipe",
    });
  } catch (error) {
    const salida = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
    throw new Error(
      `No se pudieron aplicar las migraciones en la base de prueba. ¿Está levantada? ` +
        `(docker compose --profile test up -d db-test)\n${salida}`,
    );
  }
}
