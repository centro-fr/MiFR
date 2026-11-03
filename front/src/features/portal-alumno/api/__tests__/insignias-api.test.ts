import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearSessionToken, setSessionToken } from "@/features/auth/api/session-token";
import { db } from "@/mocks/db";
import { insigniasHandlers } from "@/mocks/handlers/insignias";
import { MOCK_JWT } from "@/mocks/handlers/respuestas";
import { obtenerFichaInsignias } from "../insignias-api";

const server = setupServer(...insigniasHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => setSessionToken(MOCK_JWT));
afterEach(() => {
  server.resetHandlers();
  db.idUsuarioSesion = 3;
  clearSessionToken();
});
afterAll(() => server.close());

describe("obtenerFichaInsignias (US-31)", () => {
  it.each([
    ["alumno", 4, 4],
    ["tutor", 8, 12],
    ["propietaria", 3, 3],
  ])("resuelve la ficha para %s", async (_rol, idUsuario, idAlumno) => {
    db.idUsuarioSesion = idUsuario;

    const ficha = await obtenerFichaInsignias(idAlumno);

    expect(ficha.id_alumno).toBe(idAlumno);
    expect(ficha.insignias).toHaveLength(6);
  });

  it("rechaza consultar insignias de otro alumno", async () => {
    db.idUsuarioSesion = 4;

    await expect(obtenerFichaInsignias(3)).rejects.toMatchObject({
      response: { status: 403 },
    });
  });

  it("incluye insignias obtenidas y bloqueadas sin datos sensibles", async () => {
    const ficha = await obtenerFichaInsignias(3);

    expect(ficha.insignias.some((insignia) => insignia.obtenida)).toBe(true);
    expect(ficha.insignias.some((insignia) => !insignia.obtenida)).toBe(true);
    expect(JSON.stringify(ficha)).not.toContain("email");
    expect(JSON.stringify(ficha)).not.toContain("telefono");
  });
});
