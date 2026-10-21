import { describe, expect, it, vi } from "vitest";
import type { DetectorInactividadService } from "../detector-inactividad/detector-inactividad.service.js";
import type { GeneradorInformesService } from "../generador-informes/generador-informes.service.js";
import { ReportesService } from "../reportes.service.js";

describe("ReportesService", () => {
  it("pasa cada operación a DetectorInactividad y a GeneradorInformes", async () => {
    const detector = {
      listar: vi.fn().mockResolvedValue("pagina"),
      registrarSeguimiento: vi.fn().mockResolvedValue("marca"),
      quitarSeguimiento: vi.fn().mockResolvedValue(undefined),
    };
    const generador = {
      informeCuotasVencidas: vi.fn().mockResolvedValue("cuotas-vencidas"),
      informeCobranza: vi.fn().mockResolvedValue("cobranza"),
      estadisticasPlanes: vi.fn().mockResolvedValue("planes"),
      estadisticasInscripciones: vi.fn().mockResolvedValue("inscripciones"),
      informeAsistencia: vi.fn().mockResolvedValue("asistencia"),
      informeOcupacion: vi.fn().mockResolvedValue("ocupacion"),
    };
    const reportes = new ReportesService(
      detector as unknown as DetectorInactividadService,
      generador as unknown as GeneradorInformesService,
    );
    const filtro = { limit: 50, offset: 0 };

    await expect(reportes.listarAlumnosInactivos(filtro)).resolves.toBe("pagina");
    expect(detector.listar).toHaveBeenCalledWith(filtro);
    await expect(reportes.registrarSeguimientoInactividad(12, { estado: "GESTIONADO" }, 1)).resolves.toBe(
      "marca",
    );
    expect(detector.registrarSeguimiento).toHaveBeenCalledWith(12, "GESTIONADO", 1);
    await expect(reportes.quitarSeguimientoInactividad(12)).resolves.toBeUndefined();
    expect(detector.quitarSeguimiento).toHaveBeenCalledWith(12);

    await expect(reportes.informeCuotasVencidas(filtro)).resolves.toBe("cuotas-vencidas");
    expect(generador.informeCuotasVencidas).toHaveBeenCalledWith(filtro);

    await expect(reportes.informeCobranza(filtro)).resolves.toBe("cobranza");
    expect(generador.informeCobranza).toHaveBeenCalledWith(filtro);

    await expect(reportes.estadisticasPlanes({})).resolves.toBe("planes");
    expect(generador.estadisticasPlanes).toHaveBeenCalledWith({});

    await expect(reportes.estadisticasInscripciones({})).resolves.toBe("inscripciones");
    expect(generador.estadisticasInscripciones).toHaveBeenCalledWith({});

    const filtroAsistencia = { incluir_bajas: false, limit: 50, offset: 0 };
    await expect(reportes.informeAsistencia(filtroAsistencia)).resolves.toBe("asistencia");
    expect(generador.informeAsistencia).toHaveBeenCalledWith(filtroAsistencia);

    await expect(reportes.informeOcupacion({ modalidad: "GRUPAL" })).resolves.toBe("ocupacion");
    expect(generador.informeOcupacion).toHaveBeenCalledWith({ modalidad: "GRUPAL" });
  });
});
