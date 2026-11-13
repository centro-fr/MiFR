import { describe, expect, it } from "vitest";
import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";
import { diasDeLaSemana } from "@/features/asistencia/utils/semana";
import { temaDeModalidad } from "@/features/horarios/utils/tema-horario";
import type { DiaSemana, Horario } from "@/types/horarios";
import { armarTablero } from "../tablero-semanal";

const SEMANA = diasDeLaSemana("2026-10-19");
// Martes 20/10/2026, 18:30 en Argentina.
const AHORA = new Date("2026-10-20T21:30:00.000Z");

function horario(id: number, dia: DiaSemana, inicio: string, fin: string, tipo: "GRUPAL" | "PERSONALIZADA" = "PERSONALIZADA"): Horario {
  return {
    id: String(id),
    actividadId: "1",
    actividadNombre: tipo === "GRUPAL" ? "HIIT" : "Personalizado",
    actividadTipo: tipo,
    profesoraId: "7",
    profesoraNombre: "Marina Sosa",
    tema: temaDeModalidad(tipo),
    diaSemana: dia,
    horaInicio: inicio,
    horaFin: fin,
    cupoPropio: null,
    cupoMaximo: 4,
    inscriptos: 2,
  };
}

function claseDeHoy(idHorario: number, inicio: string, fin: string, inscriptos: number): ClaseDelDiaApi {
  return {
    id_clase: 500 + idHorario,
    id_horario: idHorario,
    fecha_clase: "2026-10-20T00:00:00.000Z",
    id_prof_dictante: 7,
    estado: "PROGRAMADA",
    fecha_cierre_asist: null,
    observaciones: null,
    inscriptos,
    cupo_disponible: 0,
    horario: {
      hora_inicio: `1970-01-01T${inicio}:00.000Z`,
      hora_fin: `1970-01-01T${fin}:00.000Z`,
      cupo_maximo: 4,
      actividad: { id_actividad: 1, nombre: "Personalizado", modalidad: "PERSONALIZADA", cupo_maximo: 4 },
    },
  };
}

describe("armarTablero", () => {
  const horarios = [
    horario(1, "LUNES", "15:00", "16:00"),
    horario(2, "MARTES", "18:00", "19:00"),
    horario(3, "MARTES", "19:00", "20:00", "GRUPAL"),
  ];

  it("arma las filas de la primera a la última hora y las columnas de lunes a viernes", () => {
    const tablero = armarTablero({ horarios, semana: SEMANA, hoy: "2026-10-20", clasesDeHoy: [], ahora: AHORA });
    expect(tablero.horas).toEqual(["15:00", "16:00", "17:00", "18:00", "19:00"]);
    expect(tablero.dias.map((d) => d.corto)).toEqual(["Lun", "Mar", "Mié", "Jue", "Vie"]);
    const lunes = tablero.bloques.find((b) => b.clave === "1-2026-10-19");
    expect(lunes).toMatchObject({ columna: 0, fila: 0, filas: 1, pasada: true, ocupacion: "2/4" });
  });

  it("marca la clase de hoy en curso, con sus inscriptos reales y el acceso a la asistencia", () => {
    const tablero = armarTablero({
      horarios,
      semana: SEMANA,
      hoy: "2026-10-20",
      clasesDeHoy: [claseDeHoy(2, "18:00", "19:00", 3)],
      ahora: AHORA,
    });
    const ahora = tablero.bloques.find((b) => b.clave === "2-2026-10-20");
    expect(ahora).toMatchObject({ columna: 1, fila: 3, ahora: true, pasada: false, ocupacion: "3/4", idClase: 502 });
    const despues = tablero.bloques.find((b) => b.clave === "3-2026-10-20");
    expect(despues).toMatchObject({ ahora: false, pasada: false, grupal: true, idClase: null });
  });

  it("agrega el sábado solo si tiene clases", () => {
    const tablero = armarTablero({
      horarios: [...horarios, horario(4, "SABADO", "09:00", "10:00")],
      semana: SEMANA,
      hoy: "2026-10-20",
      clasesDeHoy: [],
      ahora: AHORA,
    });
    expect(tablero.dias.map((d) => d.corto)).toContain("Sáb");
    expect(tablero.horas[0]).toBe("09:00");
  });
});
