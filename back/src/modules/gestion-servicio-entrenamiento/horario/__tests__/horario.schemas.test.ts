import { describe, expect, it } from "vitest";
import { actualizarHorarioSchema, crearHorarioSchema, listarHorarioQuerySchema } from "../horario.schemas.js";

const minimo = { id_actividad: 1, id_profesora: 1, dia_semana: 1, hora_inicio: "08:00", hora_fin: "09:00" };

describe("crearHorarioSchema", () => {
  it("acepta un horario válido", () => {
    expect(crearHorarioSchema.safeParse(minimo).success).toBe(true);
  });

  it.each([-0, 0, 8, 1.5, -1, "1", null])("rechaza el día de la semana %j", (dia_semana) => {
    expect(crearHorarioSchema.safeParse({ ...minimo, dia_semana }).success).toBe(false);
  });

  it("rechaza el domingo porque el centro no abre ese día", () => {
    const resultado = crearHorarioSchema.safeParse({ ...minimo, dia_semana: 7 });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.flatten().fieldErrors.dia_semana).toEqual(["El centro no abre los domingos"]);
  });

  it.each([1, 6])("acepta el día de la semana %j", (dia_semana) => {
    expect(crearHorarioSchema.safeParse({ ...minimo, dia_semana }).success).toBe(true);
  });

  it.each([-0, 0, -1, 2.5, "1"])("rechaza el id de actividad o de profesora %j", (id) => {
    expect(crearHorarioSchema.safeParse({ ...minimo, id_actividad: id }).success).toBe(false);
    expect(crearHorarioSchema.safeParse({ ...minimo, id_profesora: id }).success).toBe(false);
  });

  it.each([-0, 0, -5, 1.5, 32768])("rechaza el cupo máximo %j", (cupo_maximo) => {
    expect(crearHorarioSchema.safeParse({ ...minimo, cupo_maximo }).success).toBe(false);
  });

  it.each(["8:00", "08:0", "24:00", "08:60", "-0:00", "06:59", "23:01", "08:00:00", ""])(
    "rechaza la hora %j",
    (hora_inicio) => {
      expect(crearHorarioSchema.safeParse({ ...minimo, hora_inicio }).success).toBe(false);
    },
  );

  it("rechaza que la hora de fin no sea posterior a la de inicio", () => {
    expect(crearHorarioSchema.safeParse({ ...minimo, hora_fin: "08:00" }).success).toBe(false);
    expect(crearHorarioSchema.safeParse({ ...minimo, hora_fin: "07:30" }).success).toBe(false);
  });
});

describe("actualizarHorarioSchema", () => {
  it("aplica las mismas reglas numéricas que al crear", () => {
    expect(actualizarHorarioSchema.safeParse({ dia_semana: -0 }).success).toBe(false);
    expect(actualizarHorarioSchema.safeParse({ dia_semana: 7 }).success).toBe(false);
    expect(actualizarHorarioSchema.safeParse({ cupo_maximo: 0 }).success).toBe(false);
  });

  it("acepta quitar el cupo propio para heredar el de la actividad", () => {
    expect(actualizarHorarioSchema.parse({ cupo_maximo: null })).toEqual({ cupo_maximo: null });
  });
});

describe("listarHorarioQuerySchema", () => {
  it("convierte los filtros a número y rechaza los ids mal escritos", () => {
    expect(listarHorarioQuerySchema.parse({ id_actividad: "3" })).toEqual({ id_actividad: 3 });
    expect(listarHorarioQuerySchema.safeParse({ id_profesora: "-0" }).success).toBe(false);
    expect(listarHorarioQuerySchema.safeParse({ id_profesora: ["1", "2"] }).success).toBe(false);
  });
});
