import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Solo los fuentes: la exclusión por defecto de Vitest ya no deja afuera dist/, y un build viejo
    // correría sus tests compilados contra el código actual.
    include: ["src/**/*.test.ts"],
    // Los de integración necesitan Postgres: corren aparte con vitest.integration.config.ts.
    exclude: [...configDefaults.exclude, "src/**/*.integration.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Interfaces y tipos no tienen código ejecutable. El composition root (index.ts y composicion.ts)
      // y las cargas del catálogo de seguridad, del de insignias, de los parámetros iniciales y de los datos
      // demo hablan con la base real: los cubren los de integración.
      exclude: [
        "src/**/__tests__/**",
        "src/**/interface/**",
        "src/**/*.types.ts",
        "src/index.ts",
        "src/composicion.ts",
        "src/shared/db/catalogo-seguridad.ts",
        "src/shared/db/catalogo-insignias.ts",
        "src/shared/db/parametros-iniciales.ts",
        "src/shared/db/datos-demo.ts",
      ],
      reporter: ["text-summary", "text"],
      // La regla del proyecto es 100 %: el umbral hace que una baja falle el comando y no dependa de leer el reporte.
      thresholds: { 100: true },
    },
  },
});
