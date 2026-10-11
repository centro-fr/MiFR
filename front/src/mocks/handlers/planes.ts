import { http, HttpResponse, delay } from "msw";
import { db } from "@/mocks/db";
import { verificarAcceso } from "@/mocks/handlers/respuestas";
import type { Plan } from "@/types/plan";

export const planesHandlers = [
  http.get("*/api/v1/planes", async ({ request }) => {
    await delay(200);
    const denegado = verificarAcceso(request, { permiso: "PLANES_VER" });
    if (denegado) return denegado;

    const url = new URL(request.url);
    const incluirBajas = url.searchParams.get("incluirBajas") === "true";

    const planes = db.planes
      .filter((p) => incluirBajas || p.activo)
      .map((p): Plan => {
        const actividad = p.id_actividad_exclusiva
          ? db.actividades.find((a) => a.id_actividad === p.id_actividad_exclusiva)
          : null;

        return {
          id_plan: p.id_plan,
          tipo: p.tipo,
          nombre: p.nombre,
          descripcion: p.descripcion,
          clases_por_semana: p.clases_por_semana,
          dias_gracia: p.dias_gracia,
          id_actividad_exclusiva: p.id_actividad_exclusiva,
          profesora_unica: p.profesora_unica,
          activo: p.activo,
          actividad_exclusiva: actividad
            ? {
                id_actividad: actividad.id_actividad,
                nombre: actividad.nombre,
                modalidad: actividad.modalidad,
              }
            : null,
          precio_vigente: {
            id_precio: p.id_plan * 10,
            precio: p.precio,
            fecha_vigencia_desde: "2026-01-01T00:00:00.000Z",
            fecha_vigencia_hasta: null,
          },
        };
      });

    return HttpResponse.json(planes);
  }),
];
