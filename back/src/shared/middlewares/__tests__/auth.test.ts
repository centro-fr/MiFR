import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../../errors/app-error.js";
import { requiereRol, requiereSesion } from "../auth.js";
import type { IAutenticacion } from "../../../modules/gestion-usuarios/sesion/interface/i-autenticacion.js";

function crearRequest(cambios: Partial<Request> = {}): Request {
  return { headers: {}, ...cambios } as Request;
}

const res = {} as Response;

describe("requiereSesion", () => {
  let autenticacion: IAutenticacion;
  let next: NextFunction;

  beforeEach(() => {
    autenticacion = {
      verificarToken: vi.fn().mockReturnValue({ usuarioId: 1, roles: ["PROPIETARIA"] }),
      iniciarSesion: vi.fn(),
    };
    next = vi.fn();
  });

  it("requiereSesion carga req.usuario con el id y los roles del JWT y sigue", () => {
    const req = crearRequest({ headers: { authorization: "Bearer token-valido" } });

    requiereSesion(autenticacion)(req, res, next);

    expect(autenticacion.verificarToken).toHaveBeenCalledWith("token-valido");
    expect(req.usuario).toEqual({ id_usuario: 1, roles: ["PROPIETARIA"] });
    expect(next).toHaveBeenCalledOnce();
  });

  it("requiereSesion lanza UnauthorizedError sin header Authorization", () => {
    expect(() => requiereSesion(autenticacion)(crearRequest(), res, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["Basic abc", "bearer token", "Token abc", "Bearer"])(
    "requiereSesion lanza UnauthorizedError con el header %j",
    (authorization) => {
      const req = crearRequest({ headers: { authorization } });

      expect(() => requiereSesion(autenticacion)(req, res, next)).toThrow(UnauthorizedError);
      expect(autenticacion.verificarToken).not.toHaveBeenCalled();
    },
  );

  it("requiereSesion propaga el error si el token es inválido", () => {
    vi.mocked(autenticacion.verificarToken).mockImplementation(() => {
      throw new UnauthorizedError("Token inválido o expirado");
    });
    const req = crearRequest({ headers: { authorization: "Bearer vencido" } });

    expect(() => requiereSesion(autenticacion)(req, res, next)).toThrow("Token inválido o expirado");
    expect(req.usuario).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requiereRol", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it("requiereRol deja pasar si el usuario tiene el rol", () => {
    const req = crearRequest({ usuario: { id_usuario: 1, roles: ["PROPIETARIA"] } });

    requiereRol("PROPIETARIA")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("requiereRol deja pasar si tiene alguno de los roles permitidos", () => {
    const req = crearRequest({ usuario: { id_usuario: 1, roles: ["PROFESORA"] } });

    requiereRol("PROPIETARIA", "PROFESORA")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("requiereRol deja pasar a un usuario multi-rol si uno de sus roles alcanza", () => {
    const req = crearRequest({ usuario: { id_usuario: 1, roles: ["ALUMNO", "PROPIETARIA"] } });

    requiereRol("PROPIETARIA")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("requiereRol lanza ForbiddenError si ninguno de sus roles alcanza", () => {
    const req = crearRequest({ usuario: { id_usuario: 1, roles: ["ALUMNO", "TUTOR"] } });

    expect(() => requiereRol("PROPIETARIA")(req, res, next)).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it("requiereRol lanza ForbiddenError si el usuario no tiene roles", () => {
    const req = crearRequest({ usuario: { id_usuario: 1, roles: [] } });

    expect(() => requiereRol("PROPIETARIA")(req, res, next)).toThrow(ForbiddenError);
  });

  it("requiereRol lanza UnauthorizedError si no pasó antes por requiereSesion", () => {
    expect(() => requiereRol("PROPIETARIA")(crearRequest(), res, next)).toThrow(UnauthorizedError);
  });
});
