import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import type { IUnidadDeTrabajo } from "../../../../shared/db/transaccion.js";
import type { Solicitante } from "../../../../shared/utils/solicitante.types.js";
import type { IInfoParametros } from "../../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IInfoAsistencia } from "../../asistencia/interface/i-info-asistencia.js";
import type { ClaseConDatos } from "../../clase/clase.types.js";
import type { IInfoClases } from "../../clase/interface/i-info-clases.js";
import { CierreAsistenciaService } from "../cierre-asistencia.service.js";

const PROFESORA: Solicitante = { idUsuario: 2, esPropietaria: false };

// Clase del 12/10 que termina a las 20:00 de Argentina, las 23:00 UTC. TIME llega el 1970-01-01.
function clase(id: number, estado = "PROGRAMADA", horaFin = "20:00") {
  return {
    id_clase: id,
    estado,
    fecha_clase: new Date("2026-10-12T00:00:00Z"),
    fecha_cierre_asist: null,
    horario: { hora_fin: new Date(`1970-01-01T${horaFin}:00Z`) },
  } as unknown as ClaseConDatos;
}

function crearMocks() {
  return {
    clases: {
      obtenerPara: vi.fn().mockResolvedValue(clase(20)),
      listarAbiertasHasta: vi.fn().mockResolvedValue([]),
      cerrar: vi.fn(async (id: number, _fecha: Date): Promise<ClaseConDatos | null> => clase(id, "DICTADA")),
    },
    asistencias: { tieneMarcasManuales: vi.fn(), completarAusentes: vi.fn(), completarPresentes: vi.fn() },
    parametros: { obtener: vi.fn().mockResolvedValue(0) },
    unidadDeTrabajo: { ejecutar: vi.fn(<T>(operacion: () => Promise<T>) => operacion()) },
  };
}

describe("CierreAsistenciaService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: CierreAsistenciaService;

  beforeEach(() => {
    mocks = crearMocks();
    servicio = new CierreAsistenciaService(
      mocks.clases as unknown as IInfoClases,
      mocks.asistencias as unknown as IInfoAsistencia,
      mocks.parametros as unknown as IInfoParametros,
      mocks.unidadDeTrabajo as unknown as IUnidadDeTrabajo,
    );
  });

  it("cerrarManualmente registra presentes a todos si la clase no tuvo marcas manuales (RN)", async () => {
    mocks.asistencias.tieneMarcasManuales.mockResolvedValue(false);
    const cerrada = await servicio.cerrarManualmente(20, PROFESORA);

    expect(mocks.clases.obtenerPara).toHaveBeenCalledWith(20, PROFESORA);
    expect(mocks.unidadDeTrabajo.ejecutar).toHaveBeenCalledTimes(1);
    const [, fechaCierre] = mocks.clases.cerrar.mock.calls[0]!;
    expect(mocks.asistencias.completarPresentes).toHaveBeenCalledWith(cerrada, fechaCierre);
    expect(mocks.asistencias.completarAusentes).not.toHaveBeenCalled();
    expect(cerrada.estado).toBe("DICTADA");
  });

  it("cerrarManualmente completa ausentes a los no marcados si la clase tuvo marcas manuales", async () => {
    mocks.asistencias.tieneMarcasManuales.mockResolvedValue(true);
    const cerrada = await servicio.cerrarManualmente(20, PROFESORA);

    const [, fechaCierre] = mocks.clases.cerrar.mock.calls[0]!;
    expect(mocks.asistencias.completarAusentes).toHaveBeenCalledWith(cerrada, fechaCierre);
    expect(mocks.asistencias.completarPresentes).not.toHaveBeenCalled();
    expect(cerrada.estado).toBe("DICTADA");
  });

  it("cerrarManualmente de una clase ya cerrada la devuelve sin volver a cerrar ni duplicar ausentes", async () => {
    const dictada = clase(20, "DICTADA");
    mocks.clases.obtenerPara.mockResolvedValue(dictada);

    await expect(servicio.cerrarManualmente(20, PROFESORA)).resolves.toBe(dictada);
    expect(mocks.clases.cerrar).not.toHaveBeenCalled();
    expect(mocks.asistencias.completarAusentes).not.toHaveBeenCalled();
  });

  it("cerrarManualmente rechaza una clase cancelada", async () => {
    mocks.clases.obtenerPara.mockResolvedValue(clase(20, "CANCELADA"));

    await expect(servicio.cerrarManualmente(20, PROFESORA)).rejects.toBeInstanceOf(ConflictError);
    expect(mocks.clases.cerrar).not.toHaveBeenCalled();
  });

  it("cerrarManualmente devuelve la clase como quedó si otro cierre se adelantó, sin completar ausentes", async () => {
    const yaCerrada = clase(20, "DICTADA");
    mocks.clases.cerrar.mockResolvedValue(null);
    mocks.clases.obtenerPara.mockResolvedValueOnce(clase(20)).mockResolvedValueOnce(yaCerrada);

    await expect(servicio.cerrarManualmente(20, PROFESORA)).resolves.toBe(yaCerrada);
    expect(mocks.asistencias.completarAusentes).not.toHaveBeenCalled();
  });

  it("cerrarManualmente no cierra una clase que el solicitante no puede ver", async () => {
    mocks.clases.obtenerPara.mockRejectedValue(new NotFoundError("Clase no encontrada"));

    await expect(servicio.cerrarManualmente(20, PROFESORA)).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.clases.cerrar).not.toHaveBeenCalled();
  });

  it("procesarCierresAutomaticos busca las abiertas hasta el día de Argentina", async () => {
    // 22:30 del 12/10 en Argentina, ya 13/10 en UTC.
    await servicio.procesarCierresAutomaticos(new Date("2026-10-13T01:30:00Z"));

    expect(mocks.parametros.obtener).toHaveBeenCalledWith("MINUTOS_CIERRE_ASISTENCIA");
    expect(mocks.clases.listarAbiertasHasta).toHaveBeenCalledWith(new Date("2026-10-12T00:00:00Z"));
  });

  it("procesarCierresAutomaticos cierra al terminar la clase, ni un minuto antes", async () => {
    mocks.clases.listarAbiertasHasta.mockResolvedValue([clase(20)]);

    await expect(servicio.procesarCierresAutomaticos(new Date("2026-10-12T22:59:59Z"))).resolves.toBe(0);
    await expect(servicio.procesarCierresAutomaticos(new Date("2026-10-12T23:00:00Z"))).resolves.toBe(1);
    expect(mocks.clases.cerrar).toHaveBeenCalledTimes(1);
    expect(mocks.clases.cerrar).toHaveBeenCalledWith(20, new Date("2026-10-12T23:00:00Z"));
  });

  it("procesarCierresAutomaticos espera además los MINUTOS_CIERRE_ASISTENCIA", async () => {
    mocks.parametros.obtener.mockResolvedValue(15);
    mocks.clases.listarAbiertasHasta.mockResolvedValue([clase(20)]);

    await expect(servicio.procesarCierresAutomaticos(new Date("2026-10-12T23:14:00Z"))).resolves.toBe(0);
    await expect(servicio.procesarCierresAutomaticos(new Date("2026-10-12T23:15:00Z"))).resolves.toBe(1);
  });

  it("procesarCierresAutomaticos cierra una clase de las 23:00, que termina al día siguiente en UTC", async () => {
    mocks.clases.listarAbiertasHasta.mockResolvedValue([clase(20, "PROGRAMADA", "23:00")]);

    await expect(servicio.procesarCierresAutomaticos(new Date("2026-10-13T01:59:00Z"))).resolves.toBe(0);
    await expect(servicio.procesarCierresAutomaticos(new Date("2026-10-13T02:00:00Z"))).resolves.toBe(1);
  });

  it("procesarCierresAutomaticos completa ausentes si hubo marcas a mano, o presentes si no hubo marcas", async () => {
    const ahora = new Date("2026-10-13T00:00:00Z");
    mocks.clases.listarAbiertasHasta.mockResolvedValue([clase(20), clase(21)]);
    mocks.asistencias.tieneMarcasManuales.mockImplementation(async (id: number) => id === 20);

    await expect(servicio.procesarCierresAutomaticos(ahora)).resolves.toBe(2);
    expect(mocks.asistencias.completarAusentes).toHaveBeenCalledTimes(1);
    expect(mocks.asistencias.completarAusentes).toHaveBeenCalledWith(clase(20, "DICTADA"), ahora);
    expect(mocks.asistencias.completarPresentes).toHaveBeenCalledTimes(1);
    expect(mocks.asistencias.completarPresentes).toHaveBeenCalledWith(clase(21, "DICTADA"), ahora);
  });

  it("procesarCierresAutomaticos no cuenta ni completa una clase que otro cierre ya cerró", async () => {
    mocks.clases.listarAbiertasHasta.mockResolvedValue([clase(20)]);
    mocks.clases.cerrar.mockResolvedValue(null);

    await expect(servicio.procesarCierresAutomaticos(new Date("2026-10-13T00:00:00Z"))).resolves.toBe(0);
    expect(mocks.asistencias.tieneMarcasManuales).not.toHaveBeenCalled();
    expect(mocks.asistencias.completarAusentes).not.toHaveBeenCalled();
  });

  it("procesarCierresAutomaticos usa la hora actual si no la recibe", async () => {
    await expect(servicio.procesarCierresAutomaticos()).resolves.toBe(0);
    expect(mocks.clases.listarAbiertasHasta).toHaveBeenCalledTimes(1);
  });
});
