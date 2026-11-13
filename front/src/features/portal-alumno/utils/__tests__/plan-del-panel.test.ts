import { describe, expect, it } from "vitest";
import type { PanelAlumno, PlanDelAlumno } from "../../schemas/panel-alumno";
import { etiquetaDelPlan, hayOtroPlanConAlerta, planAMostrar, vistaDelPlan } from "../plan-del-panel";

function plan(overrides: Partial<PlanDelAlumno> = {}): PlanDelAlumno {
  return {
    id_inscripcion: 1,
    nombre: "Plan Básico",
    tipo: "MENSUAL",
    clases_por_semana: 2,
    profesora: "Marina Sosa",
    actividades: ["Funcional"],
    estado_cuota: "AL_DIA",
    fecha_vencimiento: "2026-11-20",
    dias_restantes: 8,
    ...overrides,
  };
}

describe("planAMostrar", () => {
  it("devuelve el elegido si sigue vigente", () => {
    const p1 = plan({ id_inscripcion: 1, estado_cuota: "VENCIDA" });
    const p2 = plan({ id_inscripcion: 2, estado_cuota: "AL_DIA" });
    expect(planAMostrar([p1, p2], 2)?.id_inscripcion).toBe(2);
  });

  it("prioriza VENCIDA > POR_VENCER > AL_DIA cuando no hay elegido válido", () => {
    const alDia = plan({ id_inscripcion: 1, estado_cuota: "AL_DIA", fecha_vencimiento: "2026-11-05" });
    const enGracia = plan({ id_inscripcion: 2, estado_cuota: "POR_VENCER", fecha_vencimiento: "2026-11-15" });
    const vencida = plan({ id_inscripcion: 3, estado_cuota: "VENCIDA", fecha_vencimiento: "2026-11-20" });
    expect(planAMostrar([alDia, enGracia, vencida], 999)?.id_inscripcion).toBe(3);
    expect(planAMostrar([alDia, enGracia])?.id_inscripcion).toBe(2);
  });

  it("devuelve undefined sin planes", () => {
    expect(planAMostrar([])).toBeUndefined();
  });
});

describe("vistaDelPlan", () => {
  it("filtra próximas clases e historial por id_inscripcion", () => {
    const panel: PanelAlumno = {
      id_alumno: 3,
      alumno: { nombre: "Sofía", apellido: "Medina" },
      planes: [plan({ id_inscripcion: 10 }), plan({ id_inscripcion: 20, actividades: ["Pilates"] })],
      proximas_clases: [
        { id_horario: 1, id_inscripcion: 10, fecha: "2026-11-13", hora_inicio: "08:00", hora_fin: "09:00", actividad: "Funcional", profesora: "Marina", cupo_disponible: 10 },
        { id_horario: 2, id_inscripcion: 20, fecha: "2026-11-14", hora_inicio: "10:00", hora_fin: "11:00", actividad: "Pilates", profesora: "Lucía", cupo_disponible: 8 },
      ],
      historial_asistencias: [
        { id_clase: 101, id_inscripcion: 10, fecha: "2026-11-10", actividad: "Funcional", profesora: "Marina", estado: "PRESENTE" },
        { id_clase: 102, id_inscripcion: 20, fecha: "2026-11-11", actividad: "Pilates", profesora: "Lucía", estado: "AUSENTE" },
      ],
    };

    const vista = vistaDelPlan(panel, 20);
    expect(vista.plan?.id_inscripcion).toBe(20);
    expect(vista.proximas_clases).toHaveLength(1);
    expect(vista.proximas_clases[0].actividad).toBe("Pilates");
    expect(vista.historial_asistencias).toHaveLength(1);
    expect(vista.historial_asistencias[0].id_clase).toBe(102);
  });
});

describe("etiquetaDelPlan y hayOtroPlanConAlerta", () => {
  it("arma el título con actividades o fallback al nombre del plan", () => {
    expect(etiquetaDelPlan(plan({ actividades: ["Funcional"] }))).toBe("Funcional");
    expect(etiquetaDelPlan(plan({ actividades: ["Funcional", "GAP"] }))).toBe("Funcional + GAP");
    expect(etiquetaDelPlan(plan({ actividades: [], nombre: "Plan Libre" }))).toBe("Plan Libre");
  });

  it("detecta alerta solo en planes distintos al elegido", () => {
    const p1 = plan({ id_inscripcion: 1, estado_cuota: "VENCIDA" });
    const p2 = plan({ id_inscripcion: 2, estado_cuota: "AL_DIA" });
    expect(hayOtroPlanConAlerta([p1, p2], 1)).toBe(false);
    expect(hayOtroPlanConAlerta([p1, p2], 2)).toBe(true);
  });
});

