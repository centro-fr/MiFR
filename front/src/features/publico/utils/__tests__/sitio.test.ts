import { describe, expect, it } from "vitest";
import { fichaDelCentro, urlDelSitio } from "../sitio";

describe("sitio", () => {
  it("urlDelSitio acepta solo un origen http(s) y le saca la barra final", () => {
    expect(urlDelSitio("https://www.ejemplo.com/")).toBe("https://www.ejemplo.com");
    expect(urlDelSitio(" http://localhost:5173 ")).toBe("http://localhost:5173");
    expect(urlDelSitio("https://www.ejemplo.com/otra-ruta")).toBeNull();
    expect(urlDelSitio("javascript:alert(1)")).toBeNull();
    expect(urlDelSitio("")).toBeNull();
  });

  it("fichaDelCentro describe el gimnasio con su dirección, ubicación y contacto", () => {
    const ficha = fichaDelCentro("https://www.ejemplo.com", "+54 9 3885 74-4444", "https://www.instagram.com/fr/");

    expect(ficha).toMatchObject({
      "@type": "ExerciseGym",
      name: "Centro de Entrenamiento FR",
      url: "https://www.ejemplo.com/",
      image: "https://www.ejemplo.com/og-portada.jpg",
      telephone: "+54 9 3885 74-4444",
      address: { streetAddress: "Sánchez de Bustamante 425", postalCode: "Y4610", addressLocality: "Perico" },
      geo: { latitude: -24.3808932, longitude: -65.1178121 },
      sameAs: ["https://www.instagram.com/fr/"],
    });
  });

  it("fichaDelCentro omite el teléfono y el Instagram si no están configurados", () => {
    const ficha = fichaDelCentro("https://www.ejemplo.com", undefined, null);

    expect(ficha).not.toHaveProperty("telephone");
    expect(ficha).not.toHaveProperty("sameAs");
  });
});
