import { describe, expect, it, vi } from "vitest";
import { DifusionPublicaService } from "../difusion-publica.service.js";
import type { PanelDisponibilidadService } from "../panel-disponibilidad/panel-disponibilidad.service.js";

describe("DifusionPublicaService", () => {
  it("consultarDisponibilidad pasa la consulta al panel", async () => {
    const panel = { consultar: vi.fn().mockResolvedValue({ horarios: [] }) };
    const servicio = new DifusionPublicaService(panel as unknown as PanelDisponibilidadService);

    await expect(servicio.consultarDisponibilidad()).resolves.toEqual({ horarios: [] });
    expect(panel.consultar).toHaveBeenCalledOnce();
  });
});
