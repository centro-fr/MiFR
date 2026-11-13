import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../../../shared/errors/app-error.js";
import type { NotificacionRepository } from "../notificacion.repository.js";
import { NotificacionService } from "../notificacion.service.js";

function crearRepositorioMock() {
  return {
    registrar: vi.fn().mockResolvedValue(1),
    listarDeUsuario: vi.fn().mockResolvedValue({ datos: [], total: 0, no_leidas: 0 }),
    marcarLeida: vi.fn(),
    marcarTodasLeidas: vi.fn().mockResolvedValue(3),
    registrarResumenDiario: vi.fn().mockResolvedValue(true),
  };
}

const AVISO = { id_usuario: 7, tipo: "CUOTA_VENCIDA" as const, id_cuota: 101, mensaje: "Tu cuota venció" };

describe("NotificacionService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let servicio: NotificacionService;

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    servicio = new NotificacionService(repositorio as unknown as NotificacionRepository);
  });

  it("registrar guarda las notificaciones con el instante actual y devuelve cuántas guardó", async () => {
    await expect(servicio.registrar([AVISO])).resolves.toBe(1);
    expect(repositorio.registrar).toHaveBeenCalledWith([AVISO], expect.any(Date));
  });

  it("listarDeUsuario devuelve la página con su paginación", async () => {
    await expect(servicio.listarDeUsuario(7, { limit: 20, offset: 40 })).resolves.toEqual({
      datos: [],
      total: 0,
      no_leidas: 0,
      limit: 20,
      offset: 40,
    });
    expect(repositorio.listarDeUsuario).toHaveBeenCalledWith(7, { limit: 20, offset: 40 });
  });

  it("marcarLeida devuelve la notificación del usuario ya leída", async () => {
    repositorio.marcarLeida.mockResolvedValue({ id_notificacion: 3, leida: true });

    await expect(servicio.marcarLeida(3, 7)).resolves.toEqual({ id_notificacion: 3, leida: true });
    expect(repositorio.marcarLeida).toHaveBeenCalledWith(3, 7);
  });

  it("marcarLeida lanza NotFoundError si no existe o es de otra persona", async () => {
    repositorio.marcarLeida.mockResolvedValue(null);

    await expect(servicio.marcarLeida(3, 7)).rejects.toThrow(NotFoundError);
  });

  it("marcarTodasLeidas devuelve cuántas marcó", async () => {
    await expect(servicio.marcarTodasLeidas(7)).resolves.toEqual({ marcadas: 3 });
    expect(repositorio.marcarTodasLeidas).toHaveBeenCalledWith(7);
  });

  it("registrarResumenDiario delega al repositorio", async () => {
    const ahora = new Date();
    const hoy = new Date();
    await expect(servicio.registrarResumenDiario(7, "mensaje", ahora, hoy)).resolves.toBe(true);
    expect(repositorio.registrarResumenDiario).toHaveBeenCalledWith(7, "mensaje", ahora, hoy);
  });
});
