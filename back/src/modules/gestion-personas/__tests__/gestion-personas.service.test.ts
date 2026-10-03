import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../shared/errors/app-error.js";
import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { ProfesorService } from "../profesor/profesor.service.js";
import { GestionPersonasService } from "../gestion-personas.service.js";

describe("GestionPersonasService", () => {
  let profesoras: Pick<ProfesorService, "darDeBaja">;
  let horarios: IInfoHorarios;
  let servicio: GestionPersonasService;

  beforeEach(() => {
    profesoras = { darDeBaja: vi.fn() };
    horarios = {
      tieneActivosDeProfesora: vi.fn().mockResolvedValue(false),
    };
    servicio = new GestionPersonasService(profesoras as ProfesorService, horarios);
  });

  it("darDeBajaProfesora permite la baja si no tiene horarios activos", async () => {
    profesoras.darDeBaja = vi.fn().mockResolvedValue({ id_profesora: 3 });

    await expect(servicio.darDeBajaProfesora(3)).resolves.toEqual({ id_profesora: 3 });
    expect(profesoras.darDeBaja).toHaveBeenCalledWith(3);
  });

  it("darDeBajaProfesora bloquea la baja si tiene horarios activos", async () => {
    vi.mocked(horarios.tieneActivosDeProfesora).mockResolvedValue(true);

    await expect(servicio.darDeBajaProfesora(3)).rejects.toThrow(ConflictError);
    expect(profesoras.darDeBaja).not.toHaveBeenCalled();
  });
});
