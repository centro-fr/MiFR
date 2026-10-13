import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error.js";
import type { IUnidadDeTrabajo } from "../../../../shared/db/transaccion.js";
import type { IInfoProfesores } from "../../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { IInfoClases } from "../../clase/interface/i-info-clases.js";
import type { SuplenciaRepository } from "../suplencia.repository.js";
import { SuplenciaService } from "../suplencia.service.js";

const HOY = new Date("2026-10-12T00:00:00Z");
const TITULAR = 8;
const SUPLENTE = 9;
const clase = { id_clase: 20, id_prof_dictante: TITULAR };
const suplencia = { id_clase: 20, id_prof_ausente: TITULAR, clase: { id_prof_dictante: SUPLENTE } };
const entrada = { id_horario: 4, fecha_clase: HOY, id_profesora_suplente: SUPLENTE, motivo: "Enfermedad" };

function crearMocks() {
  const pasos: string[] = [];
  return {
    pasos,
    repositorio: {
      listar: vi.fn().mockResolvedValue(["suplencia"]),
      buscarPorClase: vi.fn().mockResolvedValueOnce(null).mockResolvedValue(suplencia),
      crear: vi.fn(),
      actualizar: vi.fn(),
      eliminar: vi.fn(async () => {
        pasos.push("eliminar");
      }),
    },
    clases: {
      materializar: vi.fn().mockResolvedValue(clase),
      bloquearParaSuplencia: vi.fn(async () => {
        pasos.push("bloquear");
        return clase;
      }),
      cambiarDictante: vi.fn(async () => {
        pasos.push("cambiarDictante");
      }),
    },
    profesoras: { buscarPorId: vi.fn().mockResolvedValue({ id_profesora: SUPLENTE }) },
    unidadDeTrabajo: {
      ejecutar: vi.fn(async <T>(operacion: () => Promise<T>) => {
        pasos.push("transaccion");
        return operacion();
      }),
    },
  };
}

describe("SuplenciaService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: SuplenciaService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T15:00:00Z"));
    mocks = crearMocks();
    servicio = new SuplenciaService(
      mocks.repositorio as unknown as SuplenciaRepository,
      mocks.clases as unknown as IInfoClases,
      mocks.profesoras as unknown as IInfoProfesores,
      mocks.unidadDeTrabajo as unknown as IUnidadDeTrabajo,
    );
  });

  afterEach(() => vi.useRealTimers());

  it("listar se delega en el repositorio", async () => {
    const filtro = { limit: 50, offset: 0 };

    await expect(servicio.listar(filtro)).resolves.toEqual(["suplencia"]);
    expect(mocks.repositorio.listar).toHaveBeenCalledWith(filtro);
  });

  it("registrar guarda a la titular como ausente y deja a la suplente como dictante, bajo el bloqueo", async () => {
    const registrada = await servicio.registrar(entrada, 1);

    expect(mocks.clases.materializar).toHaveBeenCalledWith(4, HOY);
    expect(mocks.clases.bloquearParaSuplencia).toHaveBeenCalledWith(20);
    expect(mocks.repositorio.crear).toHaveBeenCalledWith({
      id_clase: 20,
      id_prof_ausente: TITULAR,
      motivo: "Enfermedad",
      id_usuario_registra: 1,
    });
    expect(mocks.clases.cambiarDictante).toHaveBeenCalledWith(20, SUPLENTE);
    expect(mocks.pasos).toEqual(["transaccion", "bloquear", "cambiarDictante"]);
    expect(registrada).toEqual({ suplencia, advertencia: null });
  });

  it("registrar guarda el motivo vacío como NULL", async () => {
    await servicio.registrar({ ...entrada, motivo: undefined }, 1);

    expect(mocks.repositorio.crear).toHaveBeenCalledWith(expect.objectContaining({ motivo: null }));
  });

  it("registrar advierte cuando la clase todavía no se dictó", async () => {
    const registrada = await servicio.registrar(
      { ...entrada, fecha_clase: new Date("2026-10-19T00:00:00Z") },
      1,
    );

    expect(registrada.advertencia).toContain("todavía no se dictó");
  });

  it("registrar rechaza una suplente que no es una profesora activa, sin tocar la clase", async () => {
    mocks.profesoras.buscarPorId.mockResolvedValue(null);

    await expect(servicio.registrar(entrada, 1)).rejects.toBeInstanceOf(ConflictError);
    expect(mocks.profesoras.buscarPorId).toHaveBeenCalledWith(SUPLENTE);
    expect(mocks.clases.materializar).not.toHaveBeenCalled();
  });

  it("registrar rechaza con 400 que la suplente sea la titular", async () => {
    await expect(
      servicio.registrar({ ...entrada, id_profesora_suplente: TITULAR }, 1),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mocks.repositorio.crear).not.toHaveBeenCalled();
  });

  it("registrar rechaza una clase que ya tiene suplencia", async () => {
    mocks.repositorio.buscarPorClase.mockReset().mockResolvedValue(suplencia);

    await expect(servicio.registrar(entrada, 1)).rejects.toThrow("La clase ya tiene una suplencia");
    expect(mocks.repositorio.crear).not.toHaveBeenCalled();
    expect(mocks.clases.cambiarDictante).not.toHaveBeenCalled();
  });

  it("registrar falla como error interno si la suplencia no aparece después de guardarla", async () => {
    mocks.repositorio.buscarPorClase.mockReset().mockResolvedValue(null);

    await expect(servicio.registrar(entrada, 1)).rejects.not.toBeInstanceOf(NotFoundError);
  });

  it("cambiar pone a la nueva suplente como dictante y registra quién y cuándo", async () => {
    mocks.repositorio.buscarPorClase.mockReset().mockResolvedValue(suplencia);

    await expect(servicio.cambiar(20, { id_profesora_suplente: 10, motivo: "Viaje" }, 1)).resolves.toBe(
      suplencia,
    );

    expect(mocks.profesoras.buscarPorId).toHaveBeenCalledWith(10);
    expect(mocks.clases.cambiarDictante).toHaveBeenCalledWith(20, 10);
    expect(mocks.repositorio.actualizar).toHaveBeenCalledWith(20, TITULAR, {
      motivo: "Viaje",
      id_usuario_registra: 1,
      fecha_registro: new Date("2026-10-12T15:00:00Z"),
    });
  });

  it("cambiar solo el motivo no toca la dictante ni valida profesoras", async () => {
    mocks.repositorio.buscarPorClase.mockReset().mockResolvedValue(suplencia);

    await servicio.cambiar(20, { motivo: null }, 1);

    expect(mocks.profesoras.buscarPorId).not.toHaveBeenCalled();
    expect(mocks.clases.cambiarDictante).not.toHaveBeenCalled();
    expect(mocks.repositorio.actualizar).toHaveBeenCalledWith(
      20,
      TITULAR,
      expect.objectContaining({ motivo: null }),
    );
  });

  it("cambiar sin motivo no lo pisa", async () => {
    mocks.repositorio.buscarPorClase.mockReset().mockResolvedValue(suplencia);

    await servicio.cambiar(20, { id_profesora_suplente: 10 }, 1);

    expect(mocks.repositorio.actualizar.mock.calls[0]?.[2]).not.toHaveProperty("motivo");
  });

  it("cambiar rechaza poner a la titular como suplente", async () => {
    mocks.repositorio.buscarPorClase.mockReset().mockResolvedValue(suplencia);
    mocks.profesoras.buscarPorId.mockResolvedValue({ id_profesora: TITULAR });

    await expect(servicio.cambiar(20, { id_profesora_suplente: TITULAR }, 1)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(mocks.clases.cambiarDictante).not.toHaveBeenCalled();
  });

  it("cambiar rechaza una suplente inactiva antes de bloquear", async () => {
    mocks.profesoras.buscarPorId.mockResolvedValue(null);

    await expect(servicio.cambiar(20, { id_profesora_suplente: 10 }, 1)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(mocks.unidadDeTrabajo.ejecutar).not.toHaveBeenCalled();
  });

  it("cambiar lanza NotFoundError si la clase no tiene suplencia", async () => {
    mocks.repositorio.buscarPorClase.mockReset().mockResolvedValue(null);

    await expect(servicio.cambiar(20, { motivo: "Viaje" }, 1)).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("eliminar devuelve la clase a la titular y borra la suplencia, bajo el bloqueo", async () => {
    mocks.repositorio.buscarPorClase.mockReset().mockResolvedValue(suplencia);

    await expect(servicio.eliminar(20)).resolves.toBe(suplencia);

    expect(mocks.clases.cambiarDictante).toHaveBeenCalledWith(20, TITULAR);
    expect(mocks.repositorio.eliminar).toHaveBeenCalledWith(20, TITULAR);
    expect(mocks.pasos).toEqual(["transaccion", "bloquear", "cambiarDictante", "eliminar"]);
  });

  it("eliminar lanza NotFoundError si la clase no tiene suplencia", async () => {
    mocks.repositorio.buscarPorClase.mockReset().mockResolvedValue(null);

    await expect(servicio.eliminar(20)).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.repositorio.eliminar).not.toHaveBeenCalled();
  });
});
