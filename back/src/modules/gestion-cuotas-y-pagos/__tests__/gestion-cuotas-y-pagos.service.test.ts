import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { CuotaService } from "../cuota/cuota.service.js";
import { GestionCuotasYPagosService } from "../gestion-cuotas-y-pagos.service.js";
import type { PagoService } from "../pago/pago.service.js";

const solicitante: Solicitante = { idUsuario: 1, esPropietaria: true };
const cuota = { inscripcion: { id_inscripcion: 12 } };
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
  return {
    orden,
    cuotas: {
      prepararCobro: vi.fn(registrar("prepararCobro", cuota)),
      darAltaDefinitiva: vi.fn(registrar("darAltaDefinitiva")),
    },
    pagos: {
      prepararEfectivo: vi.fn(registrar("prepararEfectivo", datos)),
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
    );
  });

  it("el cobro en efectivo da el alta definitiva antes de guardar el pago", async () => {
    await expect(gestion.registrarCobroEfectivo(efectivo, solicitante)).resolves.toEqual({ id_pago: 7 });

    expect(mocks.orden).toEqual(["prepararCobro", "prepararEfectivo", "darAltaDefinitiva", "guardar"]);
    expect(mocks.cuotas.prepararCobro).toHaveBeenCalledWith(12);
    expect(mocks.cuotas.darAltaDefinitiva).toHaveBeenCalledWith(12);
    expect(mocks.pagos.guardar).toHaveBeenCalledWith(cuota, datos);
  });

  it("si el alta falla, por ejemplo sin cupo, no se guarda el pago", async () => {
    mocks.cuotas.darAltaDefinitiva.mockRejectedValue(new Error("sin cupo"));

    await expect(gestion.registrarCobroEfectivo(efectivo, solicitante)).rejects.toThrow("sin cupo");
    expect(mocks.pagos.guardar).not.toHaveBeenCalled();
  });

  it("la transferencia que informa el alumno queda pendiente: no da el alta", async () => {
    await gestion.informarTransferencia(transferencia, solicitante);

    expect(mocks.orden).toEqual(["prepararCobro", "prepararTransferencia", "guardar"]);
  });

  it("la transferencia que carga la propietaria da el alta antes de guardarse", async () => {
    await gestion.registrarTransferenciaRecibida(
      { ...transferencia, confirmar_monto_distinto: false },
      solicitante,
    );

    expect(mocks.orden).toEqual([
      "prepararCobro",
      "prepararTransferenciaRecibida",
      "darAltaDefinitiva",
      "guardar",
    ]);
  });

  it("aprobar valida, da el alta de la inscripción del pago y recién después confirma", async () => {
    await gestion.aprobarTransferencia(7, { confirmar_monto_distinto: false }, solicitante);

    expect(mocks.orden).toEqual(["prepararAprobacion", "darAltaDefinitiva", "confirmar"]);
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
