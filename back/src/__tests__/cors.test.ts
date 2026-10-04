import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp, type AppDependencies } from "../app.js";

const depsSinUso = {} as AppDependencies;
const FRONT = "https://mifr.netlify.app";

describe("CORS", () => {
  it("createApp habilita CORS para un origen de la lista", async () => {
    const app = createApp(depsSinUso, { origenesPermitidos: [FRONT] });

    const respuesta = await request(app).get("/health").set("Origin", FRONT);

    expect(respuesta.headers["access-control-allow-origin"]).toBe(FRONT);
  });

  it("createApp no habilita CORS para un origen que no está en la lista", async () => {
    const app = createApp(depsSinUso, { origenesPermitidos: [FRONT] });

    const respuesta = await request(app).get("/health").set("Origin", "https://otro-sitio.com");

    expect(respuesta.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("createApp acepta cualquier origen si no recibe la lista", async () => {
    const app = createApp(depsSinUso);

    const respuesta = await request(app).get("/health").set("Origin", "https://otro-sitio.com");

    expect(respuesta.headers["access-control-allow-origin"]).toBe("*");
  });
});
