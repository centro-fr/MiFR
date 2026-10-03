import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../shared/errors/app-error.js";
import type { ActividadService } from "../actividad/actividad.service.js";
import type { Actividad } from "../actividad/actividad.types.js";
import type { HorarioService } from "../horario/horario.service.js";
import { GestionServicioEntrenamientoService } from "../gestion-servicio-entrenamiento.service.js";

const actividadDadaDeBaja: Actividad = {
  id_actividad: 1,
  codigo: "CROSSFIT",
  nombre: "Crossfit",
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
