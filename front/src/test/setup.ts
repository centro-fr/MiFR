import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach } from "vitest";

// Para JSX transform en tests sin globals
globalThis.React = React;

// Con globals desactivado, Testing Library no registra su limpieza automática.
afterEach(() => {
  cleanup();
});
