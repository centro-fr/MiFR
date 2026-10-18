import { describe, expect, it, vi } from "vitest";
import type { DetectorInactividadService } from "../detector-inactividad/detector-inactividad.service.js";
import { ReportesService } from "../reportes.service.js";

describe("ReportesService", () => {
  it("pasa cada operación a DetectorInactividad", async () => {
    const detector = {
      listar: vi.fn().mockResolvedValue("pagina"),
      registrarSeguimiento: vi.fn().mockResolvedValue("marca"),
      quitarSeguimiento: vi.fn().mockResolvedValue(undefined),
    };
    const reportes = new ReportesService(detector as unknown as DetectorInactividadService);
    const filtro = { limit: 50, offset: 0 };

    await expect(reportes.listarAlumnosInactivos(filtro)).resolves.toBe("pagina");
    expect(detector.listar).toHaveBeenCalledWith(filtro);
    await expect(reportes.registrarSeguimientoInactividad(12, { estado: "GESTIONADO" }, 1)).resolves.toBe(
      "marca",
    );
    expect(detector.registrarSeguimiento).toHaveBeenCalledWith(12, "GESTIONADO", 1);
    await expect(reportes.quitarSeguimientoInactividad(12)).resolves.toBeUndefined();
    expect(detector.quitarSeguimiento).toHaveBeenCalledWith(12);
  });
});
