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

// jsdom no trae ResizeObserver y Radix lo usa en controles dentro de un <form> (el input oculto de
// RadioGroup, Select, Switch). Alcanza con uno que no observe nada: los tests no miden tamaños.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom no trae matchMedia. Sin media query que se cumpla, las pantallas se ven como en escritorio; un
// test que quiera la vista mobile la simula con su propio stub.
if (typeof window.matchMedia === "undefined") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
