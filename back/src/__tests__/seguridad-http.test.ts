import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp, type AppDependencies } from "../app.js";

const app = createApp({} as AppDependencies);

describe("cabeceras de seguridad", () => {
  it("createApp no expone X-Powered-By", async () => {
    const respuesta = await request(app).get("/health");

    expect(respuesta.headers["x-powered-by"]).toBeUndefined();
  });

  it("createApp envía nosniff y protección contra clickjacking", async () => {
    const respuesta = await request(app).get("/health");

    expect(respuesta.headers["x-content-type-options"]).toBe("nosniff");
    expect(respuesta.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(respuesta.headers["content-security-policy"]).toContain("frame-ancestors 'self'");
  });

  it("createApp responde 400 ante un JSON malformado", async () => {
    const respuesta = await request(app)
      .post("/api/v1/auth/google")
      .set("Content-Type", "application/json")
      .send('{"id_token": ');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.code).toBe("JSON_INVALIDO");
  });
});
