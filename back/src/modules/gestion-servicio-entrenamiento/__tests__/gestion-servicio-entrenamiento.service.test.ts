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
  activo: false,
};

describe("GestionServicioEntrenamientoService", () => {
  let actividades: Pick<ActividadService, "darDeBaja">;
  let horarios: Pick<HorarioService, "tieneActivosDeActividad" | "darDeBaja">;
  let inscripciones: Pick<IInfoInscripciones, "contarInscriptosVigentesEnHorario">;
  let servicio: GestionServicioEntrenamientoService;

  beforeEach(() => {
    actividades = { darDeBaja: vi.fn() };
    horarios = {
      tieneActivosDeActividad: vi.fn().mockResolvedValue(false),
      darDeBaja: vi.fn().mockResolvedValue({ id_horario: 3 }),
    };
    inscripciones = { contarInscriptosVigentesEnHorario: vi.fn().mockResolvedValue(0) };
    servicio = new GestionServicioEntrenamientoService(
      actividades as ActividadService,
      horarios as HorarioService,
      {} as PlanService,
      inscripciones as IInfoInscripciones,
    );
  });

  it("darDeBajaActividad permite la baja si la actividad no tiene horarios activos", async () => {
    vi.mocked(actividades.darDeBaja).mockResolvedValue(actividadDadaDeBaja);

    await expect(servicio.darDeBajaActividad(1)).resolves.toEqual(actividadDadaDeBaja);
    expect(horarios.tieneActivosDeActividad).toHaveBeenCalledWith(1);
    expect(actividades.darDeBaja).toHaveBeenCalledWith(1);
  });

  it("darDeBajaActividad bloquea la baja si la actividad tiene horarios activos", async () => {
    vi.mocked(horarios.tieneActivosDeActividad).mockResolvedValue(true);

    await expect(servicio.darDeBajaActividad(1)).rejects.toThrow(ConflictError);
    expect(actividades.darDeBaja).not.toHaveBeenCalled();
  });

  it("darDeBajaHorario lanza ConflictError si el horario tiene alumnos inscriptos", async () => {
    vi.mocked(inscripciones.contarInscriptosVigentesEnHorario).mockResolvedValue(2);

    await expect(servicio.darDeBajaHorario(3)).rejects.toThrow(ConflictError);
    expect(horarios.darDeBaja).not.toHaveBeenCalled();
  });

  it("darDeBajaHorario da de baja el horario sin alumnos inscriptos", async () => {
    vi.mocked(horarios.darDeBaja).mockResolvedValue({ id_horario: 3 } as unknown as Awaited<
      ReturnType<HorarioService["darDeBaja"]>
    >);

    await expect(servicio.darDeBajaHorario(3)).resolves.toEqual({
      horario: { id_horario: 3 },
      advertencia: "El horario no tenía alumnos inscriptos.",
    });
    expect(inscripciones.contarInscriptosVigentesEnHorario).toHaveBeenCalledWith(3);
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
    contarInscriptosVigentesEnHorario: vi.fn().mockResolvedValue(0),
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
    ["listarHorarios", [{ id_actividad: 3 }], horarios.listar],
    ["obtenerHorarioPorId", [3], horarios.obtenerPorId],
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
