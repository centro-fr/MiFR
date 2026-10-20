import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegistrarTarifaInput } from "../tarifa-honorario.schemas.js";
import type { TarifaHonorarioRepository } from "../tarifa-honorario.repository.js";
import { TarifaHonorarioService } from "../tarifa-honorario.service.js";
import type { TarifaHonorario } from "../tarifa-honorario.types.js";

const repositorio = { listar: vi.fn(), buscarPorId: vi.fn(), registrar: vi.fn(), cerrar: vi.fn() };
const profesoras = { buscarPorId: vi.fn() };
const planes = { buscarPorId: vi.fn() };

const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);

const NUEVA: RegistrarTarifaInput = {
  id_profesora: 10,
  concepto: "ALUMNO_A_CARGO",
  id_plan: null,
  tipo_valor: "MONTO_FIJO",
  valor: 6000,
  fecha_vigencia_desde: fecha("2026-11-01"),
};

const TARIFA: TarifaHonorario = {
  id_tarifa: 1,
  id_profesora: 10,
  concepto: "ALUMNO_A_CARGO",
  id_plan: null,
  tipo_valor: "MONTO_FIJO",
  valor: 6000,
  fecha_vigencia_desde: fecha("2026-11-01"),
  fecha_vigencia_hasta: null,
};

async function estado(promesa: Promise<unknown>): Promise<number | undefined> {
  return promesa.then(
    () => undefined,
    (error: { statusCode?: number; status?: number }) => error.statusCode ?? error.status,
  );
}

describe("TarifaHonorarioService", () => {
  let service: TarifaHonorarioService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-20T15:00:00Z"));
    profesoras.buscarPorId.mockResolvedValue({ id_profesora: 10 });
    planes.buscarPorId.mockResolvedValue({ id_plan: 7 });
    service = new TarifaHonorarioService(
      repositorio as unknown as TarifaHonorarioRepository,
      profesoras,
      planes,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("listar delega el filtro al repositorio", async () => {
    repositorio.listar.mockResolvedValue([TARIFA]);
    expect(await service.listar({ soloVigentes: true })).toEqual([TARIFA]);
    expect(repositorio.listar).toHaveBeenCalledWith({ soloVigentes: true });
  });

  describe("obtener", () => {
    it("devuelve la tarifa", async () => {
      repositorio.buscarPorId.mockResolvedValue(TARIFA);
      expect(await service.obtener(1)).toEqual(TARIFA);
    });

    it("responde 404 si no existe", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);
      expect(await estado(service.obtener(99))).toBe(404);
    });
  });

  describe("registrar", () => {
    it("registra una tarifa para todos los planes sin consultar planes", async () => {
      repositorio.registrar.mockResolvedValue(TARIFA);
      expect(await service.registrar(NUEVA)).toEqual(TARIFA);
      expect(planes.buscarPorId).not.toHaveBeenCalled();
    });

    it("valida el plan cuando la tarifa es de un plan", async () => {
      repositorio.registrar.mockResolvedValue(TARIFA);
      await service.registrar({ ...NUEVA, id_plan: 7 });
      expect(planes.buscarPorId).toHaveBeenCalledWith(7);
    });

    it("acepta que la vigencia empiece hoy", async () => {
      repositorio.registrar.mockResolvedValue(TARIFA);
      await service.registrar({ ...NUEVA, fecha_vigencia_desde: fecha("2026-10-20") });
      expect(repositorio.registrar).toHaveBeenCalled();
    });

    it("responde 400 si la vigencia empieza en el pasado", async () => {
      expect(await estado(service.registrar({ ...NUEVA, fecha_vigencia_desde: fecha("2026-10-19") }))).toBe(
        400,
      );
      expect(repositorio.registrar).not.toHaveBeenCalled();
    });

    it("responde 400 si la profesora no existe", async () => {
      profesoras.buscarPorId.mockResolvedValue(null);
      expect(await estado(service.registrar(NUEVA))).toBe(400);
      expect(repositorio.registrar).not.toHaveBeenCalled();
    });

    it("responde 400 si el plan no existe", async () => {
      planes.buscarPorId.mockResolvedValue(null);
      expect(await estado(service.registrar({ ...NUEVA, id_plan: 7 }))).toBe(400);
      expect(repositorio.registrar).not.toHaveBeenCalled();
    });

    it("responde 409 si el repositorio devuelve null", async () => {
      repositorio.registrar.mockResolvedValue(null);
      expect(await estado(service.registrar(NUEVA))).toBe(409);
    });
  });

  describe("cerrar", () => {
    it("cierra la vigencia", async () => {
      repositorio.buscarPorId.mockResolvedValue(TARIFA);
      repositorio.cerrar.mockResolvedValue({ ...TARIFA, fecha_vigencia_hasta: fecha("2026-12-31") });

      const tarifa = await service.cerrar(1, fecha("2026-12-31"));

      expect(repositorio.cerrar).toHaveBeenCalledWith(1, fecha("2026-12-31"));
      expect(tarifa.fecha_vigencia_hasta).toEqual(fecha("2026-12-31"));
    });

    it("acepta cerrar el mismo día en que empieza", async () => {
      repositorio.buscarPorId.mockResolvedValue(TARIFA);
      repositorio.cerrar.mockResolvedValue(TARIFA);
      await service.cerrar(1, fecha("2026-11-01"));
      expect(repositorio.cerrar).toHaveBeenCalled();
    });

    it("responde 404 si la tarifa no existe", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);
      expect(await estado(service.cerrar(99, fecha("2026-12-31")))).toBe(404);
    });

    it("responde 400 si el cierre está en el pasado", async () => {
      repositorio.buscarPorId.mockResolvedValue({ ...TARIFA, fecha_vigencia_desde: fecha("2026-01-01") });
      expect(await estado(service.cerrar(1, fecha("2026-10-19")))).toBe(400);
      expect(repositorio.cerrar).not.toHaveBeenCalled();
    });

    it("responde 400 si el cierre es anterior al inicio", async () => {
      repositorio.buscarPorId.mockResolvedValue(TARIFA);
      expect(await estado(service.cerrar(1, fecha("2026-10-31")))).toBe(400);
      expect(repositorio.cerrar).not.toHaveBeenCalled();
    });
  });
});
