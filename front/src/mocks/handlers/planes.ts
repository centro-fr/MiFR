import { http, HttpResponse, delay } from "msw";
import { db } from "@/mocks/db";
import type { PlanMock } from "@/mocks/data/inscripciones";
import { verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de GET /planes (plan.routes.ts): por defecto solo los vigentes, con su precio vigente.
// El ABM de planes lo implementa otro equipo; acá alcanza con el listado.

function planConPrecio(plan: PlanMock) {
  const actividad = db.actividades.find((a) => a.id_actividad === plan.id_actividad_exclusiva);
  const precio = db.planPrecios.find((p) => p.id_plan === plan.id_plan && p.fecha_vigencia_hasta === null);
  return {
    ...plan,
    actividad_exclusiva: actividad
      ? { id_actividad: actividad.id_actividad, nombre: actividad.nombre, modalidad: actividad.modalidad }
      : null,
    precio_vigente: precio ?? null,
    precio_programado: null,
  };
}

export const planesHandlers = [
  http.get("*/api/v1/planes", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "PLANES_VER" });
    if (denegado) return denegado;

    const incluirBajas = new URL(request.url).searchParams.get("incluirBajas") === "true";
    const planes = db.planes.filter((plan) => incluirBajas || plan.fecha_baja === null);
    return HttpResponse.json(planes.map(planConPrecio));
  }),
];
