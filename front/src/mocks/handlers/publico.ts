import { http, HttpResponse, delay } from "msw";
import { db } from "@/mocks/db";
import { ocupados } from "@/mocks/handlers/reglas-inscripcion";
import { horarioConDatos } from "@/mocks/handlers/serializar";

// Mock de /publico/disponibilidad con las reglas de panel-disponibilidad.service.ts del back (US-32):
// sin sesión, solo horarios vigentes y ningún dato de alumnos ni de cuentas.

const UMBRAL_CASI_LLENO = 0.6;

function disponibilidadDe(cupo: number | null, ocupadosDelHorario: number) {
  if (cupo === null) return "SIN_LIMITE";
  if (ocupadosDelHorario >= cupo) return "COMPLETO";
  return ocupadosDelHorario / cupo >= UMBRAL_CASI_LLENO ? "CASI_LLENO" : "LIBRE";
}

export const publicoHandlers = [
  http.get("*/api/v1/publico/disponibilidad", async () => {
    await delay(400);
    const horarios = db.horarios
      .filter((horario) => horario.fecha_baja === null)
      .sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio))
      .map((horario) => {
        const completo = horarioConDatos(horario);
        const cupo = completo.cupo_maximo_efectivo;
        const enUso = ocupados(horario.id_horario);
        return {
          id_horario: completo.id_horario,
          dia_semana: completo.dia_semana,
          hora_inicio: completo.hora_inicio,
          hora_fin: completo.hora_fin,
          actividad: {
            id_actividad: completo.actividad.id_actividad,
            nombre: completo.actividad.nombre,
            descripcion: completo.actividad.descripcion,
            modalidad: completo.actividad.modalidad,
          },
          profesora: completo.profesora.usuario,
          cupo_maximo: cupo,
          cupo_disponible: cupo === null ? null : Math.max(cupo - enUso, 0),
          disponibilidad: disponibilidadDe(cupo, enUso),
        };
      });
    return HttpResponse.json({ horarios }, { headers: { "Cache-Control": "public, max-age=60" } });
  }),
];
