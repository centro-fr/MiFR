import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { db } from "@/mocks/db";
import { rutinasSemilla } from "@/mocks/data/rutinas";
import { MOCK_JWT } from "@/mocks/handlers/respuestas";
import { rutinasHandlers } from "@/mocks/handlers/rutinas";

const server = setupServer(...rutinasHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

// La rutina 4 de la semilla rige del 2026-10-01 al 2026-12-15.
function editarRutina4(cuerpo: unknown) {
  return fetch("http://localhost:5173/api/v1/rutinas/4", {
    method: "PUT",
    headers: { Authorization: `Bearer ${MOCK_JWT}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

describe("PUT /rutinas/:id (mock)", () => {
  beforeEach(() => {
    db.rutinas = rutinasSemilla();
  });

  it("guarda la rutina completa como la manda el diálogo de edición", async () => {
    const respuesta = await editarRutina4({
      nombre: "Coordinación II",
      fecha_desde: "2026-10-01",
      fecha_hasta: null,
      contenido: {
        dias: [
          { nombre: "Día 1", ejercicios: [{ nombre: "Sentadilla", series: 3, repeticiones: "10", notas: null }] },
          { nombre: "Día 2", ejercicios: [{ nombre: "Remo", series: 4, repeticiones: "12", notas: null }] },
        ],
      },
      observaciones: null,
    });

    expect(respuesta.status).toBe(200);
    const rutina = db.rutinas.find((r) => r.id_rutina === 4);
    expect(rutina?.nombre).toBe("Coordinación II");
    expect(rutina?.fecha_hasta).toBeNull();
    expect(rutina?.contenido.dias.map((dia) => dia.nombre)).toEqual(["Día 1", "Día 2"]);
  });

  it("no toca lo que no viene en el pedido", async () => {
    const respuesta = await editarRutina4({ nombre: "Coordinación II" });

    expect(respuesta.status).toBe(200);
    expect(db.rutinas.find((r) => r.id_rutina === 4)?.fecha_hasta).toBe("2026-12-15");
  });

  it("rechaza con 400 una fecha de fin anterior al inicio guardado", async () => {
    const respuesta = await editarRutina4({ fecha_hasta: "2026-09-01" });

    expect(respuesta.status).toBe(400);
    expect(db.rutinas.find((r) => r.id_rutina === 4)?.fecha_hasta).toBe("2026-12-15");
  });
});
