import { describe, expect, it } from "vitest";
import type { InscripcionConDatos } from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import { historialDelPanel, planDelPanel, proximasClases } from "../panel-alumno.js";

const LUNES = new Date("2026-10-12T00:00:00Z");

function horario(
  id: number,
  diaSemana: number,
  hora: string,
  cambios: {
    cupo?: number | null;
    baja?: Date;
    desde?: string;
    hasta?: string;
    cupoActividad?: number | null;
  } = {},
) {
  return {
    fecha_desde: new Date(`${cambios.desde ?? "2026-09-01"}T00:00:00Z`),
    fecha_hasta: cambios.hasta ? new Date(`${cambios.hasta}T00:00:00Z`) : null,
    horario: {
      id_horario: id,
      dia_semana: diaSemana,
      hora_inicio: new Date(`1970-01-01T${hora}:00Z`),
      hora_fin: new Date(`1970-01-01T${hora.slice(0, 2)}:59:00Z`),
      cupo_maximo: cambios.cupo ?? null,
      fecha_baja: cambios.baja ?? null,
      actividad: {
        nombre: "Funcional",
        cupo_maximo: cambios.cupoActividad === undefined ? 12 : cambios.cupoActividad,
      },
      profesora: { usuario: { nombre: "Lucía", apellido: "Gómez" } },
    },
  };
}

function inscripcion(horarios: ReturnType<typeof horario>[]): InscripcionConDatos {
  return {
    plan: { nombre: "Intermedio", tipo: "MENSUAL", clases_por_semana: 2 },
    profesora: { usuario: { nombre: "Lucía", apellido: "Gómez" } },
    horarios,
  } as unknown as InscripcionConDatos;
}

describe("proximasClases", () => {
  it("lista los horarios de los próximos días en orden, sin la clase de hoy que ya empezó", () => {
    // Lunes 12/10 a las 15:00 de Argentina (18:00 UTC): la de las 09:00 ya empezó.
    const ahora = new Date("2026-10-12T18:00:00Z");
    const clases = proximasClases(
      inscripcion([horario(1, 1, "09:00"), horario(2, 3, "18:00"), horario(3, 1, "19:00")]),
      LUNES,
      ahora,
      new Map(),
    );

    expect(clases.map(({ id_horario, fecha }) => `${id_horario} ${fecha}`)).toEqual([
      "3 2026-10-12",
      "2 2026-10-14",
      "1 2026-10-19",
      "3 2026-10-19",
      "2 2026-10-21",
    ]);
    expect(clases[0]).toMatchObject({
      hora_inicio: "19:00",
      actividad: "Funcional",
      profesora: "Lucía Gómez",
    });
  });

  it("no cuenta un horario dado de baja ni los días fuera de la vigencia de la inscripción", () => {
    const clases = proximasClases(
      inscripcion([
        horario(1, 1, "19:00", { baja: new Date("2026-10-01T00:00:00Z") }),
        horario(2, 2, "19:00", { hasta: "2026-10-13" }),
        horario(3, 4, "19:00", { desde: "2026-10-20" }),
      ]),
      LUNES,
      new Date("2026-10-12T13:00:00Z"),
      new Map(),
    );

    expect(clases.map(({ id_horario, fecha }) => `${id_horario} ${fecha}`)).toEqual([
      "2 2026-10-13",
      "3 2026-10-22",
    ]);
  });

  it("el cupo disponible es el del horario, o el de la actividad, menos los ocupados, y nunca negativo", () => {
    const clases = proximasClases(
      inscripcion([
        horario(1, 1, "19:00", { cupo: 4 }),
        horario(2, 2, "19:00"),
        horario(3, 3, "19:00", { cupo: 2 }),
        horario(4, 4, "19:00", { cupoActividad: null }),
      ]),
      LUNES,
      new Date("2026-10-12T13:00:00Z"),
      new Map([
        [1, 1],
        [2, 5],
        [3, 9],
      ]),
    );

    expect(clases.slice(0, 4).map(({ cupo_disponible }) => cupo_disponible)).toEqual([3, 7, 0, null]);
  });

  it("sin horarios no hay clases", () => {
    expect(proximasClases(inscripcion([]), LUNES, LUNES, new Map())).toEqual([]);
  });
});

describe("planDelPanel", () => {
  it("toma el plan, la profesora a cargo y la situación de la cuota", () => {
    expect(
      planDelPanel(inscripcion([]), {
        estado: "POR_VENCER",
        fecha_vencimiento: new Date("2026-10-10T00:00:00Z"),
        dias_restantes: -2,
        puede_asistir: true,
        tiene_pago_pendiente: false,
      }),
    ).toEqual({
      nombre: "Intermedio",
      tipo: "MENSUAL",
      clases_por_semana: 2,
      profesora: "Lucía Gómez",
      estado_cuota: "POR_VENCER",
      fecha_vencimiento: "2026-10-10",
      dias_restantes: -2,
    });
  });

  it("sin cuota paga no hay vencimiento, y sin situación no hay plan", () => {
    const pendiente = planDelPanel(inscripcion([]), {
      estado: "PENDIENTE_DE_PAGO",
      fecha_vencimiento: null,
      dias_restantes: null,
      puede_asistir: false,
      tiene_pago_pendiente: false,
    });

    expect(pendiente).toMatchObject({
      estado_cuota: "PENDIENTE_DE_PAGO",
      fecha_vencimiento: null,
      dias_restantes: null,
    });
    expect(planDelPanel(inscripcion([]), null)).toBeNull();
  });
});

describe("historialDelPanel", () => {
  it("convierte cada marca en presente o ausente, con el día y el nombre de quien dictó", () => {
    expect(
      historialDelPanel([
        {
          id_clase: 3,
          fecha_clase: new Date("2026-10-05T00:00:00Z"),
          actividad: "HIIT",
          profesora: { nombre: "Carla", apellido: "Ruiz" },
          asistio: false,
        },
      ]),
    ).toEqual([
      { id_clase: 3, fecha: "2026-10-05", actividad: "HIIT", profesora: "Carla Ruiz", estado: "AUSENTE" },
    ]);
  });
});
