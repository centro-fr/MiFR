import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SuscripcionPushRepository } from "../suscripcion-push.repository.js";

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/a";

describe("SuscripcionPushRepository", () => {
  let prisma: {
    suscripciones_push: Record<"upsert" | "deleteMany" | "findMany", ReturnType<typeof vi.fn>>;
  };
  let repositorio: SuscripcionPushRepository;

  beforeEach(() => {
    prisma = {
      suscripciones_push: {
        upsert: vi.fn().mockResolvedValue({ id_suscripcion: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    repositorio = new SuscripcionPushRepository(prisma as unknown as PrismaClient);
  });

  it("guardar crea la suscripción o, si el endpoint ya existe, le actualiza las claves y el dueño", async () => {
    await repositorio.guardar(7, { endpoint: ENDPOINT, keys: { p256dh: "p", auth: "a" } });

    const datos = { id_usuario: 7, clave_p256dh: "p", clave_auth: "a" };
    expect(prisma.suscripciones_push.upsert).toHaveBeenCalledWith({
      where: { endpoint: ENDPOINT },
      create: { endpoint: ENDPOINT, ...datos },
      update: datos,
    });
  });

  it("borrarDeUsuario borra solo si el dispositivo es de ese usuario", async () => {
    await repositorio.borrarDeUsuario(7, ENDPOINT);

    expect(prisma.suscripciones_push.deleteMany).toHaveBeenCalledWith({
      where: { id_usuario: 7, endpoint: ENDPOINT },
    });
  });

  it("listarDeUsuario trae las del usuario, las más nuevas primero y con tope", async () => {
    await repositorio.listarDeUsuario(7);

    expect(prisma.suscripciones_push.findMany).toHaveBeenCalledWith({
      where: { id_usuario: 7 },
      orderBy: { fecha_alta: "desc" },
      take: 20,
    });
  });

  it("borrar quita el dispositivo por su endpoint", async () => {
    await repositorio.borrar(ENDPOINT);

    expect(prisma.suscripciones_push.deleteMany).toHaveBeenCalledWith({ where: { endpoint: ENDPOINT } });
  });
});
