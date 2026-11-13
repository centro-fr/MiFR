import { describe, expect, it } from "vitest";
import { bajaSuscripcionPushSchema, suscripcionPushSchema } from "../suscripcion-push.schemas.js";

// Claves con el largo real: p256dh son 65 bytes (87 caracteres en base64url) y auth 16 (22).
const P256DH = "B".repeat(87);
const AUTH = "a".repeat(22);

function suscripcion(endpoint: string, keys = { p256dh: P256DH, auth: AUTH }) {
  return { endpoint, keys };
}

describe("suscripcionPushSchema", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/c1KrmpTuRm0:APA91bH",
    "https://android.googleapis.com/gcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAAAB",
    "https://web.push.apple.com/QGuQyavXutnMH",
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAAB",
  ])("acepta el endpoint de un servicio de push: %s", (endpoint) => {
    expect(suscripcionPushSchema.safeParse(suscripcion(endpoint)).success).toBe(true);
  });

  it.each([
    ["por HTTP", "http://fcm.googleapis.com/fcm/send/a"],
    ["de otro host", "https://evil.example/fcm/send/a"],
    ["que imita al servicio", "https://fcm.googleapis.com.evil.example/a"],
    ["a una dirección interna", "https://127.0.0.1/admin"],
    ["al servidor de la base", "https://db:5432/"],
    ["con otro puerto", "https://fcm.googleapis.com:8443/a"],
    ["con credenciales", "https://usuario:clave@fcm.googleapis.com/a"],
    ["que no es una URL", "fcm.googleapis.com/a"],
    ["demasiado largo", `https://fcm.googleapis.com/${"a".repeat(1000)}`],
  ])("rechaza un endpoint %s", (_caso, endpoint) => {
    expect(suscripcionPushSchema.safeParse(suscripcion(endpoint)).success).toBe(false);
  });

  it.each([
    ["una p256dh corta", { p256dh: "B".repeat(20), auth: AUTH }],
    ["una auth corta", { p256dh: P256DH, auth: "a" }],
    ["claves que no son base64url", { p256dh: `${"B".repeat(86)}+`, auth: AUTH }],
    ["una p256dh más larga que la columna", { p256dh: "B".repeat(201), auth: AUTH }],
  ])("rechaza %s", (_caso, keys) => {
    expect(suscripcionPushSchema.safeParse(suscripcion("https://fcm.googleapis.com/a", keys)).success).toBe(
      false,
    );
  });

  it("rechaza una suscripción sin claves", () => {
    expect(suscripcionPushSchema.safeParse({ endpoint: "https://fcm.googleapis.com/a" }).success).toBe(false);
  });
});

describe("bajaSuscripcionPushSchema", () => {
  it("acepta el endpoint de un servicio de push y rechaza cualquier otra dirección", () => {
    expect(bajaSuscripcionPushSchema.safeParse({ endpoint: "https://fcm.googleapis.com/a" }).success).toBe(
      true,
    );
    expect(bajaSuscripcionPushSchema.safeParse({ endpoint: "https://evil.example/a" }).success).toBe(false);
  });
});
