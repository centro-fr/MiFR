import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useColorDeLaBarra } from "../use-color-de-la-barra";

describe("useColorDeLaBarra", () => {
  afterEach(() => document.head.querySelector('meta[name="theme-color"]')?.remove());

  it("pinta la barra mientras está montada y devuelve el color anterior al salir", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#f8fafc";
    document.head.append(meta);

    const { unmount } = renderHook(() => useColorDeLaBarra("#0f172a"));
    expect(meta.content).toBe("#0f172a");

    unmount();
    expect(meta.content).toBe("#f8fafc");
  });

  it("no hace nada si la página no tiene la etiqueta", () => {
    expect(() => renderHook(() => useColorDeLaBarra("#0f172a")).unmount()).not.toThrow();
  });
});
