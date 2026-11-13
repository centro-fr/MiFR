import { beforeEach, describe, expect, it, vi } from "vitest";
import { GestionNotificacionesService } from "../gestion-notificaciones.service.js";
import type { NotificacionService } from "../notificacion/notificacion.service.js";
import type { PlanificadorNotificacionesService } from "../planificador-notificaciones/planificador-notificaciones.service.js";

const PAGINACION = { limit: 20, offset: 0 };

describe("GestionNotificacionesService", () => {
  let notificaciones: Record<
    "listarDeUsuario" | "marcarLeida" | "marcarTodasLeidas",
    ReturnType<typeof vi.fn>
  >;
  let planificador: { generarAvisosDelDia: ReturnType<typeof vi.fn> };
  let gestion: GestionNotificacionesService;

  beforeEach(() => {
    notificaciones = {
      listarDeUsuario: vi.fn().mockResolvedValue("pagina"),
      marcarLeida: vi.fn().mockResolvedValue("leida"),
      marcarTodasLeidas: vi.fn().mockResolvedValue({ marcadas: 2 }),
    };
    planificador = { generarAvisosDelDia: vi.fn().mockResolvedValue(0) };
    gestion = new GestionNotificacionesService(
      notificaciones as unknown as NotificacionService,
      planificador as unknown as PlanificadorNotificacionesService,
    );
  });

  it("listarNotificacionesPropias genera los avisos del día antes de listar las del usuario", async () => {
    await expect(gestion.listarNotificacionesPropias(7, PAGINACION)).resolves.toBe("pagina");

    expect(planificador.generarAvisosDelDia).toHaveBeenCalledWith();
    expect(notificaciones.listarDeUsuario).toHaveBeenCalledWith(7, PAGINACION);
    expect(planificador.generarAvisosDelDia.mock.invocationCallOrder[0]).toBeLessThan(
      notificaciones.listarDeUsuario.mock.invocationCallOrder[0],
    );
  });

  it("listarNotificacionesPropias lista igual si los avisos fallan, y deja el error en el log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    planificador.generarAvisosDelDia.mockRejectedValue(new Error("base caída"));

    await expect(gestion.listarNotificacionesPropias(7, PAGINACION)).resolves.toBe("pagina");
    expect(log).toHaveBeenCalledWith(expect.stringContaining("AVISOS_DE_CUOTA"), expect.any(Error));
    log.mockRestore();
  });

  it("marcarNotificacionLeida y marcarNotificacionesLeidas se delegan en Notificacion", async () => {
    await expect(gestion.marcarNotificacionLeida(3, 7)).resolves.toBe("leida");
    expect(notificaciones.marcarLeida).toHaveBeenCalledWith(3, 7);
    await expect(gestion.marcarNotificacionesLeidas(7)).resolves.toEqual({ marcadas: 2 });
    expect(notificaciones.marcarTodasLeidas).toHaveBeenCalledWith(7);
  });
});
