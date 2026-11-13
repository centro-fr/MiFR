import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../../../shared/errors/app-error.js";
import type { IEnvioPush } from "../../suscripcion-push/interface/i-envio-push.js";
import type { NotificacionRepository } from "../notificacion.repository.js";
import { NotificacionService } from "../notificacion.service.js";

function crearRepositorioMock() {
  return {
    registrar: vi.fn(),
    listarDeUsuario: vi.fn().mockResolvedValue({ datos: [], total: 0, no_leidas: 0 }),
    marcarLeida: vi.fn(),
    marcarTodasLeidas: vi.fn().mockResolvedValue(3),
  };
}

const AVISO = { id_usuario: 7, tipo: "CUOTA_VENCIDA" as const, id_cuota: 101, mensaje: "Tu cuota venció" };

describe("NotificacionService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let envioPush: { enviarAUsuario: ReturnType<typeof vi.fn> };
  let servicio: NotificacionService;

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    repositorio.registrar.mockImplementation(async (lista: unknown[]) => lista);
    envioPush = { enviarAUsuario: vi.fn().mockResolvedValue(undefined) };
    servicio = new NotificacionService(
      repositorio as unknown as NotificacionRepository,
      envioPush as unknown as IEnvioPush,
    );
  });

  it("registrar guarda las notificaciones con el instante actual y devuelve cuántas guardó", async () => {
    await expect(servicio.registrar([AVISO])).resolves.toBe(1);
    expect(repositorio.registrar).toHaveBeenCalledWith([AVISO], expect.any(Date));
  });

  it("registrar manda por push los avisos de cuota recién guardados, con el texto completo y su cuota", async () => {
    const porVencer = { ...AVISO, id_usuario: 8, tipo: "CUOTA_POR_VENCER" as const, id_cuota: 102 };

    await servicio.registrar([AVISO, porVencer]);

    expect(envioPush.enviarAUsuario).toHaveBeenCalledWith(7, {
      titulo: "Cuota vencida",
      cuerpo: "Tu cuota venció",
      url: "/app/inicio",
      etiqueta: "cuota-101",
    });
    expect(envioPush.enviarAUsuario).toHaveBeenCalledWith(
      8,
      expect.objectContaining({ titulo: "Cuota por vencer" }),
    );
  });

  it("registrar no manda push de la bienvenida ni de los avisos que ya existían", async () => {
    const bienvenida = { id_usuario: 9, tipo: "BIENVENIDA" as const, id_cuota: null, mensaje: "Hola" };
    repositorio.registrar.mockResolvedValue([bienvenida]);

    await expect(servicio.registrar([AVISO, bienvenida])).resolves.toBe(1);
    expect(envioPush.enviarAUsuario).not.toHaveBeenCalled();
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
});
