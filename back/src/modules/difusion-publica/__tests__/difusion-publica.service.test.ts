import { describe, expect, it, vi } from "vitest";
import { DifusionPublicaService } from "../difusion-publica.service.js";
import type { PanelDisponibilidadService } from "../panel-disponibilidad/panel-disponibilidad.service.js";

describe("DifusionPublicaService", () => {
  it("consultarActividades pasa la consulta al panel", async () => {
    const panel = { consultarActividades: vi.fn().mockResolvedValue({ actividades: [] }) };
    const servicio = new DifusionPublicaService(panel as unknown as PanelDisponibilidadService);

    await expect(servicio.consultarActividades()).resolves.toEqual({ actividades: [] });
    expect(panel.consultarActividades).toHaveBeenCalledOnce();
  });
});
