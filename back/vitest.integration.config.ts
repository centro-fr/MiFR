import { defineConfig } from "vitest/config";

// Tests de integración: la app real (composicion.ts) contra un Postgres real. La base se levanta
// con `docker compose --profile test up -d db-test`; ver .claude/skills/tests-integracion.
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.integration.test.ts"],
    globalSetup: ["src/__tests__/integracion/global-setup.ts"],
    // Todos los archivos comparten una sola base y la vacían entre tests: en paralelo se pisarían.
    fileParallelism: false,
    // El logger de peticiones y la auditoría escriben una línea por pedido: solo se muestran si el test falla.
    silent: "passed-only",
    testTimeout: 15_000,
    hookTimeout: 60_000,
  },
});
