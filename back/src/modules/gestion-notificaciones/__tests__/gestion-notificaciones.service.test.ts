import { describe, expect, it, vi } from "vitest";
import { GestionNotificacionesService } from "../gestion-notificaciones.service.js";
import type { ResumenDiarioPropietariaService } from "../resumen-diario-propietaria/resumen-diario-propietaria.service.js";

describe("GestionNotificacionesService", () => {
  it("obtenerResumenDiario se delega en ResumenDiarioPropietaria", async () => {
    const resumenDiario = { obtener: vi.fn().mockResolvedValue("resumen") };
    const gestion = new GestionNotificacionesService(
      resumenDiario as unknown as ResumenDiarioPropietariaService,
    );

    await expect(gestion.obtenerResumenDiario()).resolves.toBe("resumen");
    expect(resumenDiario.obtener).toHaveBeenCalledWith();
  });
});
