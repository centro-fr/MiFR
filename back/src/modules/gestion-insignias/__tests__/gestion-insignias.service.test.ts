import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { CierreMensualInsigniasService } from "../cierre-mensual-insignias/cierre-mensual-insignias.service.js";
import { GestionInsigniasService } from "../gestion-insignias.service.js";
import type { InsigniaService } from "../insignia/insignia.service.js";

const ALUMNA: Solicitante = { idUsuario: 50, esPropietaria: false };

describe("GestionInsigniasService", () => {
  let insignias: { obtenerFicha: ReturnType<typeof vi.fn>; consultarRanking: ReturnType<typeof vi.fn> };
  let cierreMensual: { cerrarMesAnterior: ReturnType<typeof vi.fn> };
  let fachada: GestionInsigniasService;

  beforeEach(() => {
    insignias = {
      obtenerFicha: vi.fn().mockResolvedValue("ficha"),
      consultarRanking: vi.fn().mockResolvedValue("ranking"),
    };
    cierreMensual = { cerrarMesAnterior: vi.fn().mockResolvedValue(null) };
    fachada = new GestionInsigniasService(
      insignias as unknown as InsigniaService,
      cierreMensual as unknown as CierreMensualInsigniasService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("obtenerFichaInsignias cierra el mes pendiente antes de armar la ficha", async () => {
    await expect(fachada.obtenerFichaInsignias(5, ALUMNA)).resolves.toBe("ficha");

    expect(cierreMensual.cerrarMesAnterior).toHaveBeenCalled();
    expect(insignias.obtenerFicha).toHaveBeenCalledWith(5, ALUMNA);
    expect(cierreMensual.cerrarMesAnterior.mock.invocationCallOrder[0]).toBeLessThan(
      insignias.obtenerFicha.mock.invocationCallOrder[0],
    );
  });

  it("consultarRankingAsistencia cierra el mes pendiente y pasa el filtro y quién pide", async () => {
    const filtro = { limit: 50, offset: 0 };

    await expect(fachada.consultarRankingAsistencia(filtro, ALUMNA)).resolves.toBe("ranking");

    expect(cierreMensual.cerrarMesAnterior).toHaveBeenCalled();
    expect(insignias.consultarRanking).toHaveBeenCalledWith(filtro, ALUMNA);
  });

  it("si el cierre falla lo registra y responde igual con lo ya otorgado", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    cierreMensual.cerrarMesAnterior.mockRejectedValue(new Error("base caída"));

    await expect(fachada.obtenerFichaInsignias(5, ALUMNA)).resolves.toBe("ficha");
    expect(consola).toHaveBeenCalledWith(
      expect.stringContaining("CIERRE_MENSUAL_INSIGNIAS"),
      expect.any(Error),
    );
  });
});
