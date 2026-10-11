import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../shared/errors/app-error.js";
import type { ActividadService } from "../actividad/actividad.service.js";
import type { Actividad } from "../actividad/actividad.types.js";
import type { HorarioService } from "../horario/horario.service.js";
import type { PlanService } from "../plan/plan.service.js";
import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import { GestionServicioEntrenamientoService } from "../gestion-servicio-entrenamiento.service.js";

const actividadDadaDeBaja: Actividad = {
  id_actividad: 1,
  codigo: "HIIT",
  nombre: "HIIT",
  descripcion: null,
  modalidad: "GRUPAL",
  cupo_maximo: 20,
  requiere_medidas: false,
  activo: false,
};

describe("GestionServicioEntrenamientoService", () => {
  let actividades: Pick<ActividadService, "darDeBaja" | "obtenerPorId">;
  let horarios: Pick<HorarioService, "darDeBajaDeActividad" | "darDeBaja" | "listar" | "obtenerPorId">;
  let inscripciones: Pick<IInfoInscripciones, "contarInscriptosVigentes" | "contarLugaresOcupados">;
  let servicio: GestionServicioEntrenamientoService;

  beforeEach(() => {
    actividades = { darDeBaja: vi.fn(), obtenerPorId: vi.fn().mockResolvedValue({ id_actividad: 1 }) };
    horarios = {
      darDeBajaDeActividad: vi.fn().mockResolvedValue(3),
      darDeBaja: vi.fn().mockResolvedValue({ id_horario: 3 }),
      listar: vi.fn().mockResolvedValue([
        { id_horario: 3, cupo_maximo_efectivo: 4 },
        { id_horario: 4, cupo_maximo_efectivo: 1 },
        { id_horario: 5, cupo_maximo_efectivo: null },
      ]),
      obtenerPorId: vi.fn().mockResolvedValue({ id_horario: 3, cupo_maximo_efectivo: 4 }),
    };
    inscripciones = {
      contarInscriptosVigentes: vi.fn().mockResolvedValue(new Map()),
      contarLugaresOcupados: vi.fn().mockResolvedValue(new Map()),
    };
    servicio = new GestionServicioEntrenamientoService(
      actividades as unknown as ActividadService,
      horarios as unknown as HorarioService,
      {} as PlanService,
      inscripciones as unknown as IInfoInscripciones,
    );
  });

  it("darDeBajaActividad da de baja la actividad junto con sus horarios sin alumnos", async () => {
    vi.mocked(actividades.darDeBaja).mockResolvedValue(actividadDadaDeBaja);

    await expect(servicio.darDeBajaActividad(1)).resolves.toEqual(actividadDadaDeBaja);
    expect(horarios.listar).toHaveBeenCalledWith({ id_actividad: 1 });
    expect(inscripciones.contarInscriptosVigentes).toHaveBeenCalledWith([3, 4, 5]);
    expect(horarios.darDeBajaDeActividad).toHaveBeenCalledWith(1);
    expect(actividades.darDeBaja).toHaveBeenCalledWith(1);
  });

  it("darDeBajaActividad bloquea la baja si algún horario tiene alumnos inscriptos", async () => {
    vi.mocked(inscripciones.contarInscriptosVigentes).mockResolvedValue(new Map([[4, 1]]));

    await expect(servicio.darDeBajaActividad(1)).rejects.toThrow("1 horario(s) con alumnos inscriptos");
    expect(horarios.darDeBajaDeActividad).not.toHaveBeenCalled();
    expect(actividades.darDeBaja).not.toHaveBeenCalled();
  });

  it("darDeBajaActividad no toca los horarios si la actividad no existe", async () => {
    vi.mocked(actividades.obtenerPorId).mockRejectedValue(new Error("no existe"));

    await expect(servicio.darDeBajaActividad(99)).rejects.toThrow("no existe");
    expect(horarios.darDeBajaDeActividad).not.toHaveBeenCalled();
  });

  it("darDeBajaHorario lanza ConflictError si el horario tiene alumnos inscriptos", async () => {
    vi.mocked(inscripciones.contarInscriptosVigentes).mockResolvedValue(new Map([[3, 2]]));

    await expect(servicio.darDeBajaHorario(3)).rejects.toThrow(ConflictError);
    expect(horarios.darDeBaja).not.toHaveBeenCalled();
  });

  it("listarHorarios suma a cada horario sus lugares ocupados y los que le quedan, en una consulta", async () => {
    vi.mocked(inscripciones.contarLugaresOcupados).mockResolvedValue(
      new Map([
        [3, 1],
        [4, 3],
        [5, 7],
      ]),
    );

    const horariosConOcupacion = await servicio.listarHorarios({});

    expect(inscripciones.contarLugaresOcupados).toHaveBeenCalledOnce();
    expect(inscripciones.contarLugaresOcupados).toHaveBeenCalledWith([3, 4, 5]);
    // Las pre-inscripciones con la reserva vencida no ocupan lugar, pero siguen impidiendo la baja.
    expect(inscripciones.contarInscriptosVigentes).not.toHaveBeenCalled();
    expect(
      horariosConOcupacion.map(({ inscriptos, cupo_disponible }) => [inscriptos, cupo_disponible]),
    ).toEqual([
      [1, 3],
      [3, 0],
      [7, null],
    ]);
  });

  it("obtenerHorarioPorId informa 0 inscriptos si no tiene ninguno", async () => {
    await expect(servicio.obtenerHorarioPorId(3)).resolves.toMatchObject({
      inscriptos: 0,
      cupo_disponible: 4,
    });
  });

  it("darDeBajaHorario da de baja el horario sin alumnos inscriptos", async () => {
    vi.mocked(horarios.darDeBaja).mockResolvedValue({ id_horario: 3 } as unknown as Awaited<
      ReturnType<HorarioService["darDeBaja"]>
    >);

    await expect(servicio.darDeBajaHorario(3)).resolves.toEqual({
      horario: { id_horario: 3 },
      advertencia: "El horario no tenía alumnos inscriptos.",
    });
    expect(inscripciones.contarInscriptosVigentes).toHaveBeenCalledWith([3]);
  });
});

describe("GestionServicioEntrenamientoService delega cada operación al componente dueño", () => {
  const actividades = {
    crear: vi.fn().mockResolvedValue("resultado"),
    listar: vi.fn().mockResolvedValue("resultado"),
    obtenerPorId: vi.fn().mockResolvedValue("resultado"),
    actualizar: vi.fn().mockResolvedValue("resultado"),
  };
  const horarios = {
    crear: vi.fn().mockResolvedValue("resultado"),
    listar: vi.fn().mockResolvedValue("resultado"),
    obtenerPorId: vi.fn().mockResolvedValue("resultado"),
    actualizar: vi.fn().mockResolvedValue("resultado"),
    darDeBaja: vi.fn().mockResolvedValue("resultado"),
  };
  const planes = {
    crear: vi.fn().mockResolvedValue("resultado"),
    listar: vi.fn().mockResolvedValue("resultado"),
    obtenerPorId: vi.fn().mockResolvedValue("resultado"),
    actualizar: vi.fn().mockResolvedValue("resultado"),
    darDeBaja: vi.fn().mockResolvedValue("resultado"),
    listarPrecios: vi.fn().mockResolvedValue("resultado"),
    registrarPrecio: vi.fn().mockResolvedValue("resultado"),
  };
  const inscripciones = {
    contarInscriptosVigentes: vi.fn().mockResolvedValue(new Map()),
    contarLugaresOcupados: vi.fn().mockResolvedValue(new Map()),
  };
  const servicio = new GestionServicioEntrenamientoService(
    actividades as unknown as ActividadService,
    horarios as unknown as HorarioService,
    planes as unknown as PlanService,
    inscripciones as unknown as IInfoInscripciones,
  );
  const cuerpo = { nombre: "X" };

  it.each([
    ["crearActividad", [cuerpo], actividades.crear],
    ["listarActividades", [{ busqueda: "yo" }], actividades.listar],
    ["obtenerActividadPorId", [3], actividades.obtenerPorId],
    ["actualizarActividad", [3, cuerpo], actividades.actualizar],
    ["crearHorario", [cuerpo], horarios.crear],
    ["actualizarHorario", [3, cuerpo], horarios.actualizar],
    ["crearPlan", [cuerpo], planes.crear],
    ["listarPlanes", [{ tipo: "MENSUAL" }], planes.listar],
    ["obtenerPlanPorId", [3], planes.obtenerPorId],
    ["actualizarPlan", [3, cuerpo], planes.actualizar],
    ["darDeBajaPlan", [3], planes.darDeBaja],
    ["listarPreciosPlan", [3], planes.listarPrecios],
    ["registrarPrecioPlan", [3, cuerpo], planes.registrarPrecio],
  ] as const)("%s", async (operacion, argumentos, destino) => {
    const metodo = servicio[operacion] as (...args: unknown[]) => Promise<unknown>;

    await expect(metodo.apply(servicio, [...argumentos])).resolves.toBe("resultado");
    expect(destino).toHaveBeenCalledWith(...argumentos);
  });
});
