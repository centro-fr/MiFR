import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Con globals desactivado, Testing Library no registra su limpieza automática.
afterEach(() => {
  cleanup();
});
