import type { PrismaClient } from "@prisma/client";
import type { DatosSuscripcion, SuscripcionPush } from "./suscripcion-push.types.js";

// Una persona usa pocos dispositivos; el tope evita que una cuenta llegue a la tabla entera.
const DISPOSITIVOS_POR_USUARIO = 20;

export class SuscripcionPushRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // El endpoint es único: suscribir otra vez el mismo dispositivo actualiza sus claves y, si ahora lo
  // usa otra cuenta, le pasa la suscripción a esa cuenta.
  guardar(idUsuario: number, { endpoint, keys }: DatosSuscripcion): Promise<SuscripcionPush> {
    const datos = { id_usuario: idUsuario, clave_p256dh: keys.p256dh, clave_auth: keys.auth };
    return this.prisma.suscripciones_push.upsert({
      where: { endpoint },
      create: { endpoint, ...datos },
      update: datos,
    });
  }

  // Solo la del propio usuario: nadie da de baja el dispositivo de otro.
  async borrarDeUsuario(idUsuario: number, endpoint: string): Promise<void> {
    await this.prisma.suscripciones_push.deleteMany({ where: { id_usuario: idUsuario, endpoint } });
  }

  // Las más nuevas primero: si alguien superara el tope, los dispositivos viejos son los que quedan afuera.
  listarDeUsuario(idUsuario: number): Promise<SuscripcionPush[]> {
    return this.prisma.suscripciones_push.findMany({
      where: { id_usuario: idUsuario },
      orderBy: { fecha_alta: "desc" },
      take: DISPOSITIVOS_POR_USUARIO,
    });
  }

  async borrar(endpoint: string): Promise<void> {
    await this.prisma.suscripciones_push.deleteMany({ where: { endpoint } });
  }
}
