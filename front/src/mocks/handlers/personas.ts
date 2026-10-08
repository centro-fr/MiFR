import { http, HttpResponse, delay } from "msw";
import { db } from "@/mocks/db";
import { verificarAcceso } from "@/mocks/handlers/respuestas";
import { profesoraConNombre } from "@/mocks/handlers/serializar";

// Mock de GET /profesoras (profesor.routes.ts): solo las activas, con el nombre de su usuario.

export const personasHandlers = [
  http.get("*/api/v1/profesoras", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "HORARIOS_VER" });
    if (denegado) return denegado;
    return HttpResponse.json(db.profesoras.filter((p) => p.fecha_baja === null).map(profesoraConNombre));
  }),
];
