import { describe, expect, it } from "vitest";
import { crearPendiente } from "@/features/alumnos/__tests__/pendiente-de-prueba";
import {
  FILTROS_INICIALES,
  filtrarPendientes,
  hayFiltrosActivos,
  planesDe,
  textoHorarios,
} from "@/features/alumnos/utils/pendientes-de-alta";

const AHORA = new Date("2026-10-10T15:00:00Z");

const SOFIA = crearPendiente();
const MATEO = crearPendiente({
  idInscripcion: "2",
  nombre: "Mateo",
  apellido: "Romero",
  dni: "52111222",
  tutor: { nombre: "Paula", apellido: "Romero", telefono: null },
  idPlan: "3",
  nombrePlan: "Personalizado 2 días",
  fechaPreInscripcion: "2026-09-20T15:00:00.000Z",
});
const PENDIENTES = [SOFIA, MATEO];

function filtrar(cambios: Partial<typeof FILTROS_INICIALES>) {
  return filtrarPendientes(PENDIENTES, { ...FILTROS_INICIALES, ...cambios }, AHORA).map((p) => p.nombre);
}

describe("filtrarPendientes", () => {
  it("sin filtros deja todas", () => {
    expect(filtrar({})).toEqual(["Sofía", "Mateo"]);
  });

  it("busca por nombre sin distinguir tildes ni mayúsculas", () => {
    expect(filtrar({ busqueda: "SOFIA" })).toEqual(["Sofía"]);
  });

  it("busca por el nombre del tutor", () => {
    expect(filtrar({ busqueda: "paula" })).toEqual(["Mateo"]);
  });

  // El DNI se guarda sin puntos: buscarlo con puntos también lo encuentra.
  it("busca por DNI con o sin puntos", () => {
    expect(filtrar({ busqueda: "52.111" })).toEqual(["Mateo"]);
  });

  it("filtra por plan", () => {
    expect(filtrar({ idPlan: "3" })).toEqual(["Mateo"]);
  });

  it("filtra por antigüedad de la pre-inscripción", () => {
    expect(filtrar({ periodo: "7" })).toEqual(["Sofía"]);
    expect(filtrar({ periodo: "30" })).toEqual(["Sofía", "Mateo"]);
  });
});

describe("hayFiltrosActivos", () => {
  it("una búsqueda solo con espacios no cuenta como filtro", () => {
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, busqueda: "  " })).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, idPlan: "1" })).toBe(true);
  });
});

describe("planesDe", () => {
  it("lista cada plan una sola vez, por nombre", () => {
    expect(planesDe([MATEO, SOFIA, SOFIA])).toEqual([
      { id: "1", nombre: "Básico" },
      { id: "3", nombre: "Personalizado 2 días" },
    ]);
  });
});

describe("textoHorarios", () => {
  it("agrupa los días que comparten franja horaria", () => {
    expect(textoHorarios(SOFIA.horarios)).toBe("Lun y Mié 18:00 a 19:00");
  });

  it("separa las franjas distintas", () => {
    const horarios = [
      { dia: "LUNES" as const, horaInicio: "18:00", horaFin: "19:00", actividad: "A" },
      { dia: "MIERCOLES" as const, horaInicio: "18:00", horaFin: "19:00", actividad: "A" },
      { dia: "VIERNES" as const, horaInicio: "19:00", horaFin: "20:00", actividad: "A" },
    ];

    expect(textoHorarios(horarios)).toBe("Lun y Mié 18:00 a 19:00 · Vie 19:00 a 20:00");
  });
});
