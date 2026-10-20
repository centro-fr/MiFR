import { describe, expect, it, vi } from "vitest";
import { GestionHonorariosService } from "../gestion-honorarios.service.js";
import type { LiquidacionService } from "../liquidacion/liquidacion.service.js";
import type { TarifaHonorarioService } from "../tarifa-honorario/tarifa-honorario.service.js";

const PERIODO = {
  periodo: "2026-10",
  desde: new Date("2026-10-01T00:00:00Z"),
  hasta: new Date("2026-10-31T00:00:00Z"),
};

function crearServicio() {
  const tarifas = { listar: vi.fn(), registrar: vi.fn(), cerrar: vi.fn() };
  const liquidaciones = {
    generar: vi.fn(),
    listar: vi.fn(),
    obtener: vi.fn(),
    cerrar: vi.fn(),
    pagar: vi.fn(),
  };
  const servicio = new GestionHonorariosService(
    tarifas as unknown as TarifaHonorarioService,
    liquidaciones as unknown as LiquidacionService,
  );
  return { servicio, tarifas, liquidaciones };
}

describe("GestionHonorariosService", () => {
  describe("tarifas", () => {
    it("listarTarifas delega en el componente con el filtro", async () => {
      const { servicio, tarifas } = crearServicio();
      const resultado = [{ id_tarifa: 1 }];
      tarifas.listar.mockResolvedValue(resultado);

      expect(await servicio.listarTarifas({ id_profesora: 3 })).toBe(resultado);
      expect(tarifas.listar).toHaveBeenCalledWith({ id_profesora: 3 });
    });

    it("registrarTarifa delega en el componente con el input", async () => {
      const { servicio, tarifas } = crearServicio();
      const input = { id_profesora: 3 } as never;
      const resultado = { id_tarifa: 2 };
      tarifas.registrar.mockResolvedValue(resultado);

      expect(await servicio.registrarTarifa(input)).toBe(resultado);
      expect(tarifas.registrar).toHaveBeenCalledWith(input);
    });

    it("cerrarTarifa delega en el componente con el id y la fecha", async () => {
      const { servicio, tarifas } = crearServicio();
      const fecha = new Date("2026-10-31T00:00:00Z");
      const resultado = { id_tarifa: 4 };
      tarifas.cerrar.mockResolvedValue(resultado);

      expect(await servicio.cerrarTarifa(4, fecha)).toBe(resultado);
      expect(tarifas.cerrar).toHaveBeenCalledWith(4, fecha);
    });
  });

  describe("liquidaciones", () => {
    it("generarLiquidaciones delega en el componente con el período", async () => {
      const { servicio, liquidaciones } = crearServicio();
      const resultado = { periodo: "2026-10" };
      liquidaciones.generar.mockResolvedValue(resultado);

      expect(await servicio.generarLiquidaciones(PERIODO)).toBe(resultado);
      expect(liquidaciones.generar).toHaveBeenCalledWith(PERIODO);
    });

    it("listarLiquidaciones delega en el componente con el período", async () => {
      const { servicio, liquidaciones } = crearServicio();
      const resultado = { periodo: "2026-10", liquidaciones: [] };
      liquidaciones.listar.mockResolvedValue(resultado);

      expect(await servicio.listarLiquidaciones(PERIODO)).toBe(resultado);
      expect(liquidaciones.listar).toHaveBeenCalledWith(PERIODO);
    });

    it("obtenerLiquidacion delega en el componente con el id", async () => {
      const { servicio, liquidaciones } = crearServicio();
      const resultado = { id_liquidacion: 5 };
      liquidaciones.obtener.mockResolvedValue(resultado);

      expect(await servicio.obtenerLiquidacion(5)).toBe(resultado);
      expect(liquidaciones.obtener).toHaveBeenCalledWith(5);
    });

    it("cerrarLiquidacion delega en el componente con el id", async () => {
      const { servicio, liquidaciones } = crearServicio();
      const resultado = { id_liquidacion: 5, estado: "CERRADA" };
      liquidaciones.cerrar.mockResolvedValue(resultado);

      expect(await servicio.cerrarLiquidacion(5)).toBe(resultado);
      expect(liquidaciones.cerrar).toHaveBeenCalledWith(5);
    });

    it("pagarLiquidacion delega en el componente con el id", async () => {
      const { servicio, liquidaciones } = crearServicio();
      const resultado = { id_liquidacion: 5, estado: "PAGADA" };
      liquidaciones.pagar.mockResolvedValue(resultado);

      expect(await servicio.pagarLiquidacion(5)).toBe(resultado);
      expect(liquidaciones.pagar).toHaveBeenCalledWith(5);
    });
  });
});