import { describe, expect, it } from "vitest";
import type { AlumnoResumen } from "@/features/alumnos/schemas/alumno";
import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";
import { clasesDeHoy, cuotasQueVencenHoy, estadoDeClase, horaActualArgentina } from "../dashboard";

function alumno(cambios: Partial<AlumnoResumen> & { vence?: string | null }): AlumnoResumen {
  const { vence = "2026-10-18", ...resto } = cambios;
  return {
    id_alumno: 1,
    nombre_completo: "Rocío Paredes",
    dni: null,
    telefono: null,
    estado: "ACTIVO",
    plan: "Básico",
    profesora: "Carla Ruiz",
    situacion_cuota: {
      estado: "POR_VENCER",
      fecha_vencimiento: vence,
      dias_restantes: 0,
      puede_asistir: true,
      tiene_pago_pendiente: false,
    },
    ...resto,
  };
}

function clase(cambios: Partial<ClaseDelDiaApi> = {}): ClaseDelDiaApi {
  return {
    id_clase: 1,
    id_horario: 1,
    fecha_clase: "2026-10-18T00:00:00.000Z",
    id_prof_dictante: 3,
    estado: "PROGRAMADA",
    fecha_cierre_asist: null,
    observaciones: null,
    horario: {
      hora_inicio: "1970-01-01T16:00:00.000Z",
      hora_fin: "1970-01-01T17:00:00.000Z",
      cupo_maximo: null,
      actividad: { id_actividad: 1, nombre: "HIIT", modalidad: "GRUPAL", cupo_maximo: 10 },
    },
    inscriptos: 8,
    cupo_disponible: 2,
    ...cambios,
  };
}

describe("dashboard", () => {
  it("cuotasQueVencenHoy toma solo los activos que vencen hoy, con su plan, profesora y precio", () => {
    const precios = new Map([["Básico", 25000]]);
    const cuotas = cuotasQueVencenHoy(
      [
        alumno({ id_alumno: 1, nombre_completo: "Rocío Paredes" }),
        alumno({ id_alumno: 2, nombre_completo: "Agustín Giménez", plan: "Intermedio" }),
        alumno({ id_alumno: 3, vence: "2026-10-19" }),
        alumno({ id_alumno: 4, estado: "BAJA" }),
      ],
      "2026-10-18",
      precios,
    );

    expect(cuotas).toEqual([
      { idAlumno: 2, alumno: "Agustín Giménez", detalle: "Intermedio · Carla Ruiz", monto: null },
      { idAlumno: 1, alumno: "Rocío Paredes", detalle: "Básico · Carla Ruiz", monto: 25000 },
    ]);
  });

  it("estadoDeClase la marca según la hora y su estado", () => {
    expect(estadoDeClase(clase(), "15:59")).toBe("Próxima");
    expect(estadoDeClase(clase(), "16:30")).toBe("En curso");
    expect(estadoDeClase(clase(), "17:00")).toBe("Terminada");
    expect(estadoDeClase(clase({ estado: "DICTADA" }), "10:00")).toBe("Terminada");
    expect(estadoDeClase(clase({ estado: "CANCELADA" }), "16:30")).toBe("Cancelada");
  });

  it("clasesDeHoy muestra la hora, la actividad, quién la da y su estado", () => {
    expect(clasesDeHoy([clase()], "16:30", () => "Lucía Gómez")).toEqual([
      { id: 1, hora: "16:00", actividad: "HIIT", profesora: "Lucía Gómez", estado: "En curso" },
    ]);
  });

  it("horaActualArgentina da la hora de Argentina", () => {
    expect(horaActualArgentina(new Date("2026-10-18T19:05:00.000Z"))).toBe("16:05");
  });
});
