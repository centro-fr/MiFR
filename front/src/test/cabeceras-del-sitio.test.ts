import { describe, expect, it } from "vitest";
import nginx from "../../docker/nginx.conf?raw";
import netlify from "../../../netlify.toml?raw";

// docker compose sirve el front con nginx (front/docker/nginx.conf) para probar el sistema completo como
// se publica en Netlify. Si las cabeceras de seguridad difieren, la prueba local ya no dice nada de
// producción: una CSP que bloquea algo en Netlify pasaría inadvertida.

function cabecerasDeNetlify(): Map<string, string> {
  const bloque = netlify.slice(netlify.indexOf("[headers.values]"));
  const lineas = [...bloque.matchAll(/^\s*([A-Za-z-]+) = "(.*)"\s*$/gm)];
  return new Map(lineas.map(([, nombre, valor]) => [nombre, valor]));
}

function cabecerasDeNginx(): Map<string, string> {
  const lineas = [...nginx.matchAll(/^\s*add_header ([A-Za-z-]+) "(.*)" always;\s*$/gm)];
  return new Map(lineas.map(([, nombre, valor]) => [nombre, valor]));
}

describe("cabeceras de seguridad del sitio", () => {
  it("netlify.toml define las cabeceras de seguridad, incluida la Content-Security-Policy", () => {
    expect(cabecerasDeNetlify().get("Content-Security-Policy")).toContain("default-src 'self'");
  });

  it("el nginx de docker compose manda exactamente las mismas cabeceras que Netlify", () => {
    expect(cabecerasDeNginx()).toEqual(cabecerasDeNetlify());
  });
});
