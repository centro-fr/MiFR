import { http, HttpResponse, delay } from "msw";
import { db } from "@/mocks/db";

// Mock de /publico/actividades con las reglas de panel-disponibilidad.service.ts del back (US-32):
// sin sesión, las actividades con algún horario vigente, sus días y sus clases por semana. Ni horas,
// ni profesoras, ni cupos.

interface ActividadPublicaMock {
  id_actividad: number;
  nombre: string;
  descripcion: string | null;
  modalidad: "GRUPAL" | "PERSONALIZADA";
  dias: number[];
  clases_por_semana: number;
}

export const publicoHandlers = [
  http.get("*/api/v1/publico/actividades", async () => {
    await delay(300);
    const porActividad = new Map<number, ActividadPublicaMock>();
    const vigentes = db.horarios
      .filter((horario) => horario.fecha_baja === null)
      .sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio));
    for (const { id_actividad, dia_semana } of vigentes) {
      const actividad = db.actividades.find((a) => a.id_actividad === id_actividad)!;
      const publica = porActividad.get(id_actividad) ?? {
        id_actividad,
        nombre: actividad.nombre,
        descripcion: actividad.descripcion,
        modalidad: actividad.modalidad,
        dias: [],
        clases_por_semana: 0,
      };
      if (!publica.dias.includes(dia_semana)) publica.dias.push(dia_semana);
      publica.clases_por_semana += 1;
      porActividad.set(id_actividad, publica);
    }
    return HttpResponse.json(
      { actividades: [...porActividad.values()] },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  }),
];
