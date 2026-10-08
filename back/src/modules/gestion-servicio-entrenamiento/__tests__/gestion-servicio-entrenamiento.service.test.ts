import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../shared/errors/app-error.js";
import type { ActividadService } from "../actividad/actividad.service.js";
import type { Actividad } from "../actividad/actividad.types.js";
import type { HorarioService } from "../horario/horario.service.js";
import type { PlanService } from "../plan/plan.service.js";
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
  let horarios: Pick<HorarioService, "tieneActivosDeActividad">;
  let servicio: GestionServicioEntrenamientoService;

  beforeEach(() => {
    actividades = { darDeBaja: vi.fn() };
    horarios = { tieneActivosDeActividad: vi.fn().mockResolvedValue(false) };
    servicio = new GestionServicioEntrenamientoService(
      actividades as ActividadService,
      horarios as HorarioService,
      {} as PlanService,
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
  const servicio = new GestionServicioEntrenamientoService(
    actividades as unknown as ActividadService,
    horarios as unknown as HorarioService,
    planes as unknown as PlanService,
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
    ["darDeBajaHorario", [3], horarios.darDeBaja],
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
