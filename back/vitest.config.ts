import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Interfaces y tipos no tienen código ejecutable, e index.ts es el composition root:
      // lo cubren las pruebas de punta a punta, no los tests unitarios.
      exclude: ["src/**/__tests__/**", "src/**/interface/**", "src/**/*.types.ts", "src/index.ts"],
      reporter: ["text-summary", "text"],
    },
  },
});
