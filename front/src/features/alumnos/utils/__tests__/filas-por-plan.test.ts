import { describe, expect, it } from "vitest";
import type { AlumnoResumen, InscripcionEnListado, SituacionCuota } from "@/features/alumnos/schemas/alumno";
import { claveDeFila, unaFilaPorPlan } from "../filas-por-plan";

function cuota(estado: SituacionCuota["estado"]): SituacionCuota {
  return { estado, fecha_vencimiento: null, dias_restantes: null, puede_asistir: true, tiene_pago_pendiente: false };
}

function inscripcion(cambios: Partial<InscripcionEnListado>): InscripcionEnListado {
  return { id_inscripcion: 3, id_plan: 2, plan: "Plan Intermedio", id_profesora: 1, profesora: "Lucía Gómez", situacion_cuota: cuota("AL_DIA"), ...cambios };
}

function alumno(cambios: Partial<AlumnoResumen>): AlumnoResumen {
  return {
    id_alumno: 3,
    nombre_completo: "Valentina Herrera",
    dni: null,
    telefono: null,
    estado: "ACTIVO",
    id_inscripcion: 3,
    plan: "Plan Intermedio",
    profesora: "Lucía Gómez",
    situacion_cuota: cuota("AL_DIA"),
    ...cambios,
  };
}

const SIN_FILTRO = { id_plan: "", id_profesora: "" };

const VALENTINA = alumno({
  inscripciones: [
    inscripcion({}),
    inscripcion({ id_inscripcion: 34, id_plan: 1, plan: "Plan Básico", id_profesora: 2, profesora: "Carla Ruiz", situacion_cuota: cuota("VENCIDA") }),
  ],
});

describe("unaFilaPorPlan", () => {
  it("muestra dos veces al alumno con dos planes, cada fila con el plan, la profesora y la cuota del suyo", () => {
    const filas = unaFilaPorPlan([VALENTINA], SIN_FILTRO);

    expect(filas).toHaveLength(2);
    expect(filas.map(({ id_inscripcion, plan, profesora }) => ({ id_inscripcion, plan, profesora }))).toEqual([
      { id_inscripcion: 34, plan: "Plan Básico", profesora: "Carla Ruiz" },
      { id_inscripcion: 3, plan: "Plan Intermedio", profesora: "Lucía Gómez" },
    ]);
    // La vencida va primero, como en el resto del listado.
    expect(filas.map((fila) => fila.situacion_cuota?.estado)).toEqual(["VENCIDA", "AL_DIA"]);
  });

  it("deja igual al alumno con un solo plan o sin ninguno", () => {
    const conUno = alumno({ id_alumno: 4, inscripciones: [inscripcion({ id_inscripcion: 4 })] });
    const sinPlan = alumno({ id_alumno: 5, id_inscripcion: null, plan: null, inscripciones: [] });

    expect(unaFilaPorPlan([conUno, sinPlan], SIN_FILTRO)).toEqual(expect.arrayContaining([conUno, sinPlan]));
    expect(unaFilaPorPlan([conUno, sinPlan], SIN_FILTRO)).toHaveLength(2);
  });

  it("con un filtro por plan o por profesora muestra solo la fila que coincide", () => {
    expect(unaFilaPorPlan([VALENTINA], { id_plan: "1", id_profesora: "" }).map((fila) => fila.id_inscripcion)).toEqual([34]);
    expect(unaFilaPorPlan([VALENTINA], { id_plan: "", id_profesora: "1" }).map((fila) => fila.id_inscripcion)).toEqual([3]);
  });

  it("si el filtro no coincide con ningún plan, muestra todos antes que esconder al alumno", () => {
    expect(unaFilaPorPlan([VALENTINA], { id_plan: "9", id_profesora: "" })).toHaveLength(2);
  });
});

describe("claveDeFila", () => {
  it("distingue las filas de un mismo alumno por su inscripción", () => {
    expect(claveDeFila({ id_alumno: 3, id_inscripcion: 34 })).toBe("3-34");
    expect(claveDeFila({ id_alumno: 3, id_inscripcion: null })).toBe("3-sin-inscripcion");
  });
});
