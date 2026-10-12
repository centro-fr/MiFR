import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IInfoInscripciones } from "../../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { HorarioRespuesta } from "../../../gestion-servicio-entrenamiento/horario/horario.types.js";
import type { IInfoHorarios } from "../../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import { PanelDisponibilidadService } from "../panel-disponibilidad.service.js";

const NUEVE = new Date(Date.UTC(1970, 0, 1, 9, 0));
const DIEZ = new Date(Date.UTC(1970, 0, 1, 10, 0));

function horario(id: number, cupo: number | null): HorarioRespuesta {
  return {
    id_horario: id,
    id_actividad: 3,
    id_profesora: 8,
    dia_semana: 1,
    hora_inicio: NUEVE,
    hora_fin: DIEZ,
    cupo_maximo: null,
    fecha_alta: new Date("2026-09-30T00:00:00.000Z"),
    fecha_baja: null,
    actividad: {
      id_actividad: 3,
      codigo: "FUNC",
      nombre: "Funcional",
      descripcion: "Entrenamiento en circuito",
      modalidad: "GRUPAL",
      cupo_maximo: cupo,
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
    cupo_maximo_efectivo: cupo,
  };
}

describe("PanelDisponibilidadService", () => {
  let horarios: { listarVigentes: ReturnType<typeof vi.fn> };
  let inscripciones: { contarLugaresOcupados: ReturnType<typeof vi.fn> };
  let servicio: PanelDisponibilidadService;

  beforeEach(() => {
    horarios = { listarVigentes: vi.fn().mockResolvedValue([horario(1, 10)]) };
    inscripciones = { contarLugaresOcupados: vi.fn().mockResolvedValue(new Map()) };
    servicio = new PanelDisponibilidadService(
      horarios as unknown as IInfoHorarios,
      inscripciones as unknown as IInfoInscripciones,
    );
  });

  it("consultar devuelve solo los datos públicos de cada horario, sin ids de profesora ni de usuario", async () => {
    inscripciones.contarLugaresOcupados.mockResolvedValue(new Map([[1, 4]]));

    await expect(servicio.consultar()).resolves.toEqual({
      horarios: [
        {
          id_horario: 1,
          dia_semana: 1,
          hora_inicio: NUEVE,
          hora_fin: DIEZ,
          actividad: {
            id_actividad: 3,
            nombre: "Funcional",
            descripcion: "Entrenamiento en circuito",
            modalidad: "GRUPAL",
          },
          profesora: { nombre: "Carla", apellido: "Ríos" },
          cupo_maximo: 10,
          cupo_disponible: 6,
          disponibilidad: "LIBRE",
        },
      ],
    });
    expect(inscripciones.contarLugaresOcupados).toHaveBeenCalledWith([1]);
  });

  it("consultar deja libre todo el cupo de un horario sin inscriptos", async () => {
    const { horarios: resultado } = await servicio.consultar();

    expect(resultado).toMatchObject([{ cupo_maximo: 10, cupo_disponible: 10, disponibilidad: "LIBRE" }]);
  });

  it("consultar marca CASI_LLENO desde el 60 % de ocupación (US-32)", async () => {
    horarios.listarVigentes.mockResolvedValue([horario(1, 10), horario(2, 10)]);
    inscripciones.contarLugaresOcupados.mockResolvedValue(
      new Map([
        [1, 5],
        [2, 6],
      ]),
    );

    const { horarios: resultado } = await servicio.consultar();

    expect(resultado.map(({ disponibilidad }) => disponibilidad)).toEqual(["LIBRE", "CASI_LLENO"]);
  });

  it("consultar marca COMPLETO sin lugares, aunque haya más ocupados que el cupo", async () => {
    horarios.listarVigentes.mockResolvedValue([horario(1, 2), horario(2, 2)]);
    inscripciones.contarLugaresOcupados.mockResolvedValue(
      new Map([
        [1, 2],
        [2, 3],
      ]),
    );

    const { horarios: resultado } = await servicio.consultar();

    expect(resultado).toMatchObject([
      { cupo_disponible: 0, disponibilidad: "COMPLETO" },
      { cupo_disponible: 0, disponibilidad: "COMPLETO" },
    ]);
  });

  it("consultar marca SIN_LIMITE un horario sin cupo, sin lugares disponibles", async () => {
    horarios.listarVigentes.mockResolvedValue([horario(1, null)]);
    inscripciones.contarLugaresOcupados.mockResolvedValue(new Map([[1, 30]]));

    const { horarios: resultado } = await servicio.consultar();

    expect(resultado).toMatchObject([
      { cupo_maximo: null, cupo_disponible: null, disponibilidad: "SIN_LIMITE" },
    ]);
  });

  it("consultar devuelve el cronograma vacío si no hay horarios vigentes", async () => {
    horarios.listarVigentes.mockResolvedValue([]);

    await expect(servicio.consultar()).resolves.toEqual({ horarios: [] });
    expect(inscripciones.contarLugaresOcupados).toHaveBeenCalledWith([]);
  });
});
