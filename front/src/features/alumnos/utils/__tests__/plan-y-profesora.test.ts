import { describe, expect, it } from "vitest";
import {
  clasesRequeridasDelPlan,
  profesorasDelPlan,
  agruparHorariosPorActividad,
  actividadesDelPlan,
} from "../plan-y-profesora";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { PlanApiRespuesta } from "@/types/plan";

function mockHorario(
  id_horario: number,
  id_profesora: number,
  id_actividad: number,
  actividadNombre: string,
  dia_semana: number,
  hora_inicio = "09:00:00",
): HorarioApi {
  return {
    id_horario,
    id_profesora,
    id_actividad,
    dia_semana,
    hora_inicio,
    hora_fin: "10:00:00",
    cupo_maximo: 10,
    cupo_maximo_efectivo: 10,
    fecha_alta: "2026-01-01",
    fecha_baja: null,
    actividad: {
      id_actividad,
      codigo: `ACT_${id_actividad}`,
      nombre: actividadNombre,
      descripcion: null,
      modalidad: "GRUPAL",
      cupo_maximo: 10,
      requiere_medidas: false,
      activo: true,
    },
    profesora: {
      id_profesora,
      id_usuario: id_profesora,
      especialidad: "General",
      fecha_alta: "2026-01-01",
      fecha_baja: null,
      usuario: { nombre: "Profe", apellido: `${id_profesora}` },
    },
  };
}

const mockProfesoras: ProfesoraDatos[] = [
  { id: "1", idUsuario: 1, nombre: "María", apellido: "López" },
  { id: "2", idUsuario: 2, nombre: "Laura", apellido: "Gómez" },
];

describe("plan-y-profesora utils", () => {
  it("clasesRequeridasDelPlan calcula la cantidad de clases requeridas", () => {
    expect(clasesRequeridasDelPlan(null)).toBe(0);
    expect(clasesRequeridasDelPlan({ tipo: "CLASE_SUELTA", clases_por_semana: null, id_actividad_exclusiva: null })).toBe(1);
    expect(clasesRequeridasDelPlan({ tipo: "MENSUAL", clases_por_semana: 3, id_actividad_exclusiva: null })).toBe(3);
  });

  it("profesorasDelPlan no permite a una profesora que suma clases de distintas actividades sin alcanzar el plan en ninguna individual", () => {
    // María (id: 1) tiene:
    // - 1 horario de Funcional (actividad 10)
    // - 1 horario de Pilates (actividad 20)
    // Total de María: 2 horarios, pero en NINGUNA actividad llega a 2 de forma individual.
    const horarios: HorarioApi[] = [
      mockHorario(1, 1, 10, "Funcional", 1),
      mockHorario(2, 1, 20, "Pilates", 2),
    ];

    const plan2Dias: Pick<PlanApiRespuesta, "tipo" | "clases_por_semana" | "id_actividad_exclusiva"> = {
      tipo: "MENSUAL",
      clases_por_semana: 2,
      id_actividad_exclusiva: null,
    };

    const compatibles = profesorasDelPlan(mockProfesoras, horarios, plan2Dias);
    // María no debe estar disponible porque no tiene 2 clases en la misma actividad
    expect(compatibles.map((p) => p.id)).not.toContain("1");
  });

  it("profesorasDelPlan acepta a una profesora que tiene al menos una actividad con suficientes horarios", () => {
    // Laura (id: 2) tiene:
    // - 2 horarios de Funcional (actividad 10)
    // - 1 horario de Pilates (actividad 20)
    const horarios: HorarioApi[] = [
      mockHorario(3, 2, 10, "Funcional", 1),
      mockHorario(4, 2, 10, "Funcional", 3),
      mockHorario(5, 2, 20, "Pilates", 2),
    ];

    const plan2Dias: Pick<PlanApiRespuesta, "tipo" | "clases_por_semana" | "id_actividad_exclusiva"> = {
      tipo: "MENSUAL",
      clases_por_semana: 2,
      id_actividad_exclusiva: null,
    };

    const compatibles = profesorasDelPlan(mockProfesoras, horarios, plan2Dias);
    expect(compatibles.map((p) => p.id)).toContain("2");
  });

  it("agruparHorariosPorActividad agrupa por actividad y marca la viabilidad", () => {
    const horarios: HorarioApi[] = [
      mockHorario(1, 2, 10, "Funcional", 1, "09:00:00"),
      mockHorario(2, 2, 10, "Funcional", 3, "08:00:00"),
      mockHorario(3, 2, 20, "Pilates", 2, "10:00:00"),
    ];

    const plan2Dias: Pick<PlanApiRespuesta, "tipo" | "clases_por_semana" | "id_actividad_exclusiva"> = {
      tipo: "MENSUAL",
      clases_por_semana: 2,
      id_actividad_exclusiva: null,
    };

    const grupos = agruparHorariosPorActividad(horarios, plan2Dias, 2);
    expect(grupos).toHaveLength(2);

    const funcional = grupos.find((g) => g.id_actividad === 10)!;
    expect(funcional.viable).toBe(true);
    expect(funcional.horarios).toHaveLength(2);

    const pilates = grupos.find((g) => g.id_actividad === 20)!;
    expect(pilates.viable).toBe(false);
    expect(pilates.horarios).toHaveLength(1);
  });

  describe("actividadesDelPlan", () => {
    const planesMock = [
      { tipo: "MENSUAL" as const, clases_por_semana: 5, id_actividad_exclusiva: null },
      { tipo: "MENSUAL" as const, clases_por_semana: 2, id_actividad_exclusiva: null },
      { tipo: "MENSUAL" as const, clases_por_semana: 2, id_actividad_exclusiva: 99 }, // Plan exclusivo
    ];

    it("retorna lista vacia si no hay plan seleccionado", () => {
      const horarios: HorarioApi[] = [mockHorario(1, 1, 10, "Funcional", 1)];
      expect(actividadesDelPlan(horarios, planesMock, null)).toEqual([]);
    });

    it("filtra solo actividades con al menos 5 dias distintos para un plan de 5 dias", () => {
      const horarios: HorarioApi[] = [
        // Funcional con Profe 1 (5 dias distintos)
        mockHorario(1, 1, 10, "Funcional", 1),
        mockHorario(2, 1, 10, "Funcional", 2),
        mockHorario(3, 1, 10, "Funcional", 3),
        mockHorario(4, 1, 10, "Funcional", 4),
        mockHorario(5, 1, 10, "Funcional", 5),
        // Training con Profe 1 (solo 3 dias distintos)
        mockHorario(6, 1, 20, "Training", 1),
        mockHorario(7, 1, 20, "Training", 3),
        mockHorario(8, 1, 20, "Training", 5),
        // GAP con Profe 2 (2 dias distintos)
        mockHorario(9, 2, 30, "GAP", 2),
        mockHorario(10, 2, 30, "GAP", 4),
        // Actividad exclusiva (id 99)
        mockHorario(11, 2, 99, "Kid Fit", 1),
      ];

      const plan5Dias = planesMock[0];
      const resultado = actividadesDelPlan(horarios, planesMock, plan5Dias);

      expect(resultado).toEqual([{ id: 10, nombre: "Funcional" }]);
    });

    it("incluye actividades de mayor frecuencia para planes de menor frecuencia (ej: 2 dias)", () => {
      const horarios: HorarioApi[] = [
        mockHorario(1, 1, 10, "Funcional", 1),
        mockHorario(2, 1, 10, "Funcional", 2),
        mockHorario(3, 1, 10, "Funcional", 3),
        mockHorario(4, 1, 10, "Funcional", 4),
        mockHorario(5, 1, 10, "Funcional", 5),
        mockHorario(6, 1, 20, "Training", 1),
        mockHorario(7, 1, 20, "Training", 3),
        mockHorario(8, 2, 30, "GAP", 2),
        mockHorario(9, 2, 30, "GAP", 4),
        mockHorario(10, 2, 99, "Kid Fit", 1), // exclusiva de otro plan
      ];

      const plan2Dias = planesMock[1];
      const resultado = actividadesDelPlan(horarios, planesMock, plan2Dias);

      // Debe incluir Funcional, GAP y Training, pero excluir Kid Fit
      expect(resultado.map((a) => a.nombre)).toEqual(["Funcional", "GAP", "Training"]);
    });

    it("retorna exclusivamente la actividad exclusiva cuando el plan la define", () => {
      const horarios: HorarioApi[] = [
        mockHorario(1, 1, 10, "Funcional", 1),
        mockHorario(2, 2, 99, "Kid Fit", 1),
      ];

      const planExclusivo = planesMock[2];
      const resultado = actividadesDelPlan(horarios, planesMock, planExclusivo);

      expect(resultado).toEqual([{ id: 99, nombre: "Kid Fit" }]);
    });
  });
});

