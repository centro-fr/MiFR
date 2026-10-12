import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HorarioRespuesta } from "../../../gestion-servicio-entrenamiento/horario/horario.types.js";
import type { IInfoHorarios } from "../../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import { PanelDisponibilidadService } from "../panel-disponibilidad.service.js";

function horario(id: number, dia: number, idActividad = 3, nombre = "Funcional"): HorarioRespuesta {
  return {
    id_horario: id,
    id_actividad: idActividad,
    id_profesora: 8,
    dia_semana: dia,
    hora_inicio: new Date(Date.UTC(1970, 0, 1, 9, 0)),
    hora_fin: new Date(Date.UTC(1970, 0, 1, 10, 0)),
    cupo_maximo: null,
    fecha_alta: new Date("2026-09-30T00:00:00.000Z"),
    fecha_baja: null,
    actividad: {
      id_actividad: idActividad,
      codigo: nombre.toUpperCase(),
      nombre,
      descripcion: "Entrenamiento en circuito",
      modalidad: "GRUPAL",
      cupo_maximo: 12,
      requiere_medidas: false,
      activo: true,
    },
    profesora: {
      id_profesora: 8,
      id_usuario: 21,
      especialidad: "Funcional",
      fecha_alta: new Date("2026-09-30T00:00:00.000Z"),
      fecha_baja: null,
      usuario: { nombre: "Carla", apellido: "Ríos" },
    },
    cupo_maximo_efectivo: 12,
  };
}

describe("PanelDisponibilidadService", () => {
  let horarios: { listarVigentes: ReturnType<typeof vi.fn> };
  let servicio: PanelDisponibilidadService;

  beforeEach(() => {
    horarios = { listarVigentes: vi.fn() };
    servicio = new PanelDisponibilidadService(horarios as unknown as IInfoHorarios);
  });

  it("consultarActividades devuelve cada actividad con sus días y clases, sin horas, profesoras ni cupos", async () => {
    horarios.listarVigentes.mockResolvedValue([
      horario(1, 1),
      horario(2, 1, 5, "HIIT"),
      horario(3, 1),
      horario(4, 3),
      horario(5, 4, 5, "HIIT"),
    ]);

    await expect(servicio.consultarActividades()).resolves.toEqual({
      actividades: [
        {
          id_actividad: 3,
          nombre: "Funcional",
          descripcion: "Entrenamiento en circuito",
          modalidad: "GRUPAL",
          dias: [1, 3],
          clases_por_semana: 3,
        },
        {
          id_actividad: 5,
          nombre: "HIIT",
          descripcion: "Entrenamiento en circuito",
          modalidad: "GRUPAL",
          dias: [1, 4],
          clases_por_semana: 2,
        },
      ],
    });
  });

  it("consultarActividades no ofrece nada si no hay horarios vigentes", async () => {
    horarios.listarVigentes.mockResolvedValue([]);

    await expect(servicio.consultarActividades()).resolves.toEqual({ actividades: [] });
  });
});
