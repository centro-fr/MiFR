import { describe, expect, it } from "vitest";
import { listarNotificacionesQuerySchema, notificacionParamSchema } from "../notificacion.schemas.js";

describe("schemas de notificaciones", () => {
  it("notificacionParamSchema convierte el id", () => {
    expect(notificacionParamSchema.parse({ id: "12" })).toEqual({ id: 12 });
  });

  it.each(["0", "-1", "01", "1e1", "abc", " 7 ", "2147483648"])(
    "notificacionParamSchema rechaza %j",
    (id) => {
      expect(notificacionParamSchema.safeParse({ id }).success).toBe(false);
    },
  );

  it("listarNotificacionesQuerySchema toma 20 por página desde el principio por defecto", () => {
    expect(listarNotificacionesQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
    expect(listarNotificacionesQuerySchema.parse({ limit: "100", offset: "40" })).toEqual({
      limit: 100,
      offset: 40,
    });
  });

  it.each([{ limit: "0" }, { limit: "101" }, { limit: "-1" }, { offset: "1.5" }, { offset: "-0" }])(
    "listarNotificacionesQuerySchema rechaza %j",
    (query) => {
      expect(listarNotificacionesQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});
