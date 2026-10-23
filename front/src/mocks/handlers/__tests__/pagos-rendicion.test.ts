import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { pagosHandlers } from "@/mocks/handlers/pagos";
import { MOCK_JWT } from "@/mocks/handlers/respuestas";
import { db } from "@/mocks/db";

import { notificacionesHandlers } from "@/mocks/handlers/notificaciones";

const server = setupServer(...pagosHandlers, ...notificacionesHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("pagos rendicion handlers", () => {
  it("GET /api/v1/notificaciones/mias", async () => {
    const res = await fetch("http://localhost:5173/api/v1/notificaciones/mias?limit=20&offset=0", {
      headers: { Authorization: `Bearer ${MOCK_JWT}` },
    });
    console.log("GET /notificaciones/mias status:", res.status);
    expect(res.status).toBe(200);
  });

  it("GET /api/v1/pagos/efectivo-pendiente", async () => {
    const res = await fetch("http://localhost:5173/api/v1/pagos/efectivo-pendiente", {
      headers: { Authorization: `Bearer ${MOCK_JWT}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profesoras.length).toBeGreaterThan(0);
  });

  it("POST /api/v1/pagos/102/rendir", async () => {
    const res = await fetch("http://localhost:5173/api/v1/pagos/102/rendir", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOCK_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ observaciones: "Entregado" }),
    });
    console.log("POST /102/rendir status:", res.status);
    const text = await res.text();
    console.log("POST /102/rendir body:", text);
    expect(res.status).toBe(200);
  });
});
