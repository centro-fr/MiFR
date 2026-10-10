import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IUnidadDeTrabajo } from "../../../shared/db/transaccion.js";
import { ForbiddenError, NotFoundError } from "../../../shared/errors/app-error.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { CuotaService } from "../cuota/cuota.service.js";
import { GestionCuotasYPagosService } from "../gestion-cuotas-y-pagos.service.js";
import type { PagoService } from "../pago/pago.service.js";

const solicitante: Solicitante = { idUsuario: 1, esPropietaria: true };
const alumna: Solicitante = { idUsuario: 30, esPropietaria: false };
const inscripcion = { id_inscripcion: 12 };
const cuota = { inscripcion };
const datos = { estado: "CONFIRMADO" };
const efectivo = { id_inscripcion: 12, monto: 30000, confirmar_monto_distinto: false };
const transferencia = { id_inscripcion: 12, monto: 30000, fecha_hora_transferencia: new Date() };

function crearMocks() {
  const orden: string[] = [];
  const registrar =
    (nombre: string, valor?: unknown) =>
    (..._args: unknown[]) => {
      orden.push(nombre);
      return Promise.resolve(valor);
    };
  const registrarSincronico =
    (nombre: string, valor?: unknown) =>
    (..._args: unknown[]) => {
      orden.push(nombre);
      return valor;
    };
  return {
    orden,
    // Marca en el orden qué pasos quedan dentro de la transacción; si la operación falla, no la confirma.
    unidadDeTrabajo: {
      ejecutar: vi.fn(async (operacion: () => Promise<unknown>) => {
        orden.push("abrir transacción");
        const resultado = await operacion();
        orden.push("confirmar transacción");
        return resultado;
      }),
    },
    cuotas: {
      buscarInscripcion: vi.fn(registrar("buscarInscripcion", inscripcion)),
      prepararCobro: vi.fn(registrar("prepararCobro", cuota)),
      darAltaDefinitiva: vi.fn(registrar("darAltaDefinitiva")),
    },
    pagos: {
      profesoraQueCobra: vi.fn(registrar("profesoraQueCobra", 7)),
      verificarTitular: vi.fn(registrarSincronico("verificarTitular")),
      prepararEfectivo: vi.fn(registrarSincronico("prepararEfectivo", datos)),
      prepararTransferencia: vi.fn(registrar("prepararTransferencia", datos)),
      prepararTransferenciaRecibida: vi.fn(registrar("prepararTransferenciaRecibida", datos)),
      guardar: vi.fn(registrar("guardar", { id_pago: 7 })),
      prepararAprobacion: vi.fn(registrar("prepararAprobacion", 12)),
      confirmar: vi.fn(registrar("confirmar", { id_pago: 7 })),
      rechazar: vi.fn().mockResolvedValue("rechazada"),
      listarTransferencias: vi.fn().mockResolvedValue("transferencias"),
      listarMisTransferencias: vi.fn().mockResolvedValue("mis transferencias"),
      obtenerComprobante: vi.fn().mockResolvedValue("comprobante"),
    },
  };
}

describe("GestionCuotasYPagosService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let gestion: GestionCuotasYPagosService;

  beforeEach(() => {
    mocks = crearMocks();
    gestion = new GestionCuotasYPagosService(
      mocks.cuotas as unknown as CuotaService,
      mocks.pagos as unknown as PagoService,
      mocks.unidadDeTrabajo as unknown as IUnidadDeTrabajo,
    );
  });

  it("el cobro en efectivo verifica quién cobra antes de preparar la cuota y guarda el alta y el pago en una transacción", async () => {
    await expect(gestion.registrarCobroEfectivo(efectivo, solicitante)).resolves.toEqual({ id_pago: 7 });

    expect(mocks.orden).toEqual([
      "buscarInscripcion",
      "profesoraQueCobra",
      "prepararCobro",
      "prepararEfectivo",
      "abrir transacción",
      "darAltaDefinitiva",
      "guardar",
      "confirmar transacción",
    ]);
    expect(mocks.cuotas.buscarInscripcion).toHaveBeenCalledWith(12);
    expect(mocks.cuotas.prepararCobro).toHaveBeenCalledWith(inscripcion);
    expect(mocks.pagos.prepararEfectivo).toHaveBeenCalledWith(cuota, efectivo, solicitante, 7);
    expect(mocks.cuotas.darAltaDefinitiva).toHaveBeenCalledWith(12);
    expect(mocks.pagos.guardar).toHaveBeenCalledWith(cuota, datos);
  });

  it("si quien cobra no es la profesora a cargo, no llega a mirar el estado de la inscripción", async () => {
    mocks.pagos.profesoraQueCobra.mockRejectedValue(new ForbiddenError());

    await expect(gestion.registrarCobroEfectivo(efectivo, solicitante)).rejects.toThrow(ForbiddenError);
    expect(mocks.cuotas.prepararCobro).not.toHaveBeenCalled();
  });

  it("si el alta falla, por ejemplo sin cupo, no se guarda el pago ni se confirma la transacción", async () => {
    mocks.cuotas.darAltaDefinitiva.mockRejectedValue(new Error("sin cupo"));

    await expect(gestion.registrarCobroEfectivo(efectivo, solicitante)).rejects.toThrow("sin cupo");
    expect(mocks.pagos.guardar).not.toHaveBeenCalled();
    expect(mocks.orden).not.toContain("confirmar transacción");
  });

  it("si el pago falla después del alta, el error sale de la transacción para que la deshaga", async () => {
    mocks.pagos.guardar.mockRejectedValue(new Error("se cayó la base"));

    await expect(gestion.registrarCobroEfectivo(efectivo, solicitante)).rejects.toThrow("se cayó la base");
    expect(mocks.orden.slice(-2)).toEqual(["abrir transacción", "darAltaDefinitiva"]);
  });

  it("la transferencia que informa el alumno verifica el titular primero y queda pendiente: no da el alta", async () => {
    await gestion.informarTransferencia(transferencia, alumna);

    expect(mocks.orden).toEqual([
      "buscarInscripcion",
      "verificarTitular",
      "prepararCobro",
      "prepararTransferencia",
      "guardar",
    ]);
    expect(mocks.unidadDeTrabajo.ejecutar).not.toHaveBeenCalled();
    expect(mocks.pagos.verificarTitular).toHaveBeenCalledWith(inscripcion, alumna);
  });

  it("a quien no es propietaria, una inscripción inexistente le responde igual que una ajena", async () => {
    mocks.cuotas.buscarInscripcion.mockResolvedValue(null);

    await expect(gestion.informarTransferencia(transferencia, alumna)).rejects.toThrow(ForbiddenError);
    expect(mocks.pagos.verificarTitular).not.toHaveBeenCalled();
  });

  it("a la propietaria una inscripción inexistente le responde 404", async () => {
    mocks.cuotas.buscarInscripcion.mockResolvedValue(null);

    await expect(gestion.registrarCobroEfectivo(efectivo, solicitante)).rejects.toThrow(NotFoundError);
  });

  it("la transferencia que carga la propietaria da el alta y se guarda en una transacción", async () => {
    await gestion.registrarTransferenciaRecibida(
      { ...transferencia, confirmar_monto_distinto: false },
      solicitante,
    );

    expect(mocks.orden).toEqual([
      "buscarInscripcion",
      "prepararCobro",
      "prepararTransferenciaRecibida",
      "abrir transacción",
      "darAltaDefinitiva",
      "guardar",
      "confirmar transacción",
    ]);
  });

  it("aprobar valida y después da el alta y confirma el pago en una transacción", async () => {
    await gestion.aprobarTransferencia(7, { confirmar_monto_distinto: false }, solicitante);

    expect(mocks.orden).toEqual([
      "prepararAprobacion",
      "abrir transacción",
      "darAltaDefinitiva",
      "confirmar",
      "confirmar transacción",
    ]);
    expect(mocks.cuotas.darAltaDefinitiva).toHaveBeenCalledWith(12);
    expect(mocks.pagos.confirmar).toHaveBeenCalledWith(7, solicitante);
  });

  it.each([
    ["rechazarTransferencia", [7, { motivo_rechazo: "No figura" }, solicitante], "rechazar", "rechazada"],
    ["listarTransferencias", [{ estado: "PENDIENTE" }], "listarTransferencias", "transferencias"],
    ["listarMisTransferencias", [solicitante], "listarMisTransferencias", "mis transferencias"],
    ["obtenerComprobante", [7, solicitante], "obtenerComprobante", "comprobante"],
  ] as const)("%s se delega en Pago", async (metodo, argumentos, destino, resultado) => {
    const llamar = gestion[metodo] as (...args: unknown[]) => Promise<unknown>;

    await expect(llamar.apply(gestion, [...argumentos])).resolves.toBe(resultado);
    expect(mocks.pagos[destino]).toHaveBeenCalledWith(...argumentos);
  });
});
