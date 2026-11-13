import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificacionRepository } from "../notificacion.repository.js";

const AHORA = new Date("2026-10-18T12:00:00Z");
const AVISO = { id_usuario: 7, tipo: "CUOTA_VENCIDA" as const, id_cuota: 101, mensaje: "Tu cuota venció" };
const SELECCION = {
  id_notificacion: true,
  tipo: true,
  id_cuota: true,
  mensaje: true,
  fecha_generacion: true,
  leida: true,
};

describe("NotificacionRepository", () => {
  let prisma: {
    notificaciones: Record<
      "createManyAndReturn" | "findMany" | "count" | "updateMany" | "findUnique" | "create",
      ReturnType<typeof vi.fn>
    >;
    $transaction: ReturnType<typeof vi.fn>;
    $executeRaw: ReturnType<typeof vi.fn>;
  };
  let repositorio: NotificacionRepository;

  beforeEach(() => {
    prisma = {
      notificaciones: {
        createManyAndReturn: vi.fn().mockResolvedValue([AVISO]),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(2),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ id_notificacion: 3 }),
        create: vi.fn().mockResolvedValue({ id_notificacion: 1 }),
      },
      $transaction: vi.fn().mockImplementation((fn) => fn(prisma)),
      $executeRaw: vi.fn().mockResolvedValue(undefined),
    };
    repositorio = new NotificacionRepository(prisma as unknown as PrismaClient);
  });

  it("registrar las crea enviadas y sin leer, ignorando las que ya existían, y devuelve las que insertó", async () => {
    await expect(repositorio.registrar([AVISO], AHORA)).resolves.toEqual([AVISO]);
    expect(prisma.notificaciones.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        { ...AVISO, fecha_generacion: AHORA, fecha_envio: AHORA, estado_envio: "ENVIADA", leida: false },
      ],
      skipDuplicates: true,
      select: { id_usuario: true, tipo: true, id_cuota: true, mensaje: true },
    });
  });

  it("registrar sin notificaciones no consulta la base", async () => {
    await expect(repositorio.registrar([], AHORA)).resolves.toEqual([]);
    expect(prisma.notificaciones.createManyAndReturn).not.toHaveBeenCalled();
  });

  it("listarDeUsuario pagina las del usuario con las no leídas primero y cuenta el total y las no leídas", async () => {
    await expect(repositorio.listarDeUsuario(7, { limit: 20, offset: 40 })).resolves.toEqual({
      datos: [],
      total: 5,
      no_leidas: 2,
    });
    expect(prisma.notificaciones.findMany).toHaveBeenCalledWith({
      where: { id_usuario: 7 },
      select: SELECCION,
      orderBy: [{ leida: "asc" }, { fecha_generacion: "desc" }, { id_notificacion: "desc" }],
      take: 20,
      skip: 40,
    });
    expect(prisma.notificaciones.count).toHaveBeenNthCalledWith(1, { where: { id_usuario: 7 } });
    expect(prisma.notificaciones.count).toHaveBeenNthCalledWith(2, {
      where: { id_usuario: 7, leida: false },
    });
  });

  it("marcarLeida marca solo si es del usuario y devuelve la notificación", async () => {
    await expect(repositorio.marcarLeida(3, 7)).resolves.toEqual({ id_notificacion: 3 });
    expect(prisma.notificaciones.updateMany).toHaveBeenCalledWith({
      where: { id_notificacion: 3, id_usuario: 7 },
      data: { leida: true },
    });
    expect(prisma.notificaciones.findUnique).toHaveBeenCalledWith({
      where: { id_notificacion: 3 },
      select: SELECCION,
    });
  });

  it("marcarLeida devuelve null si no marcó ninguna", async () => {
    prisma.notificaciones.updateMany.mockResolvedValue({ count: 0 });

    await expect(repositorio.marcarLeida(3, 7)).resolves.toBeNull();
    expect(prisma.notificaciones.findUnique).not.toHaveBeenCalled();
  });

  it("marcarTodasLeidas marca las no leídas del usuario", async () => {
    prisma.notificaciones.updateMany.mockResolvedValue({ count: 4 });

    await expect(repositorio.marcarTodasLeidas(7)).resolves.toBe(4);
    expect(prisma.notificaciones.updateMany).toHaveBeenCalledWith({
      where: { id_usuario: 7, leida: false },
      data: { leida: true },
    });
  });
});
