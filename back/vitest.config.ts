import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Los de integración necesitan Postgres: corren aparte con vitest.integration.config.ts.
    exclude: [...configDefaults.exclude, "src/**/*.integration.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Interfaces y tipos no tienen código ejecutable. El composition root (index.ts y composicion.ts)
      // y la carga del catálogo de seguridad hablan con la base real: los cubren los de integración.
      exclude: [
        "src/**/__tests__/**",
        "src/**/interface/**",
        "src/**/*.types.ts",
        "src/index.ts",
        "src/composicion.ts",
        "src/shared/db/catalogo-seguridad.ts",
      ],
      reporter: ["text-summary", "text"],
    },
  },
});
