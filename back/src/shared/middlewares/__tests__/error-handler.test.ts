import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { z } from "../../utils/zod.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  UsuarioNoRegistradoError,
} from "../../errors/app-error.js";
import { errorHandler, notFoundHandler } from "../error-handler.js";

function crearResponse() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

const req = {} as Request;
const next = vi.fn() as NextFunction;

describe("errorHandler", () => {
  let res: ReturnType<typeof crearResponse>;

  beforeEach(() => {
    res = crearResponse();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("responde 400 VALIDATION_ERROR con el detalle por campo ante un ZodError", () => {
    const error = z.object({ email: z.string().email() }).safeParse({ email: "x" }).error;

    errorHandler(error, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fieldErrors.email).toBeDefined();
  });

  it.each([
    [new UnauthorizedError(), 401, "UNAUTHORIZED"],
    [new ForbiddenError(), 403, "FORBIDDEN"],
    [new UsuarioNoRegistradoError(), 403, "USUARIO_NO_REGISTRADO"],
    [new NotFoundError(), 404, "NOT_FOUND"],
    [new ConflictError(), 409, "CONFLICT"],
  ])("responde con el status y código del AppError (%s)", (error, status, code) => {
    errorHandler(error, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error: { code, message: error.message } });
  });

  it.each([
    ["entity.parse.failed", 400, "JSON_INVALIDO"],
    ["entity.too.large", 413, "CUERPO_DEMASIADO_GRANDE"],
  ])("responde el 4xx de express.json() para %s", (type, status, code) => {
    const error = Object.assign(new Error("detalle de body-parser"), { status, type });

    errorHandler(error, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json.mock.calls[0][0].error.code).toBe(code);
  });

  it("responde el status de otro error 4xx del cliente sin exponer su mensaje", () => {
    const error = Object.assign(new Error("charset no soportado: detalle interno"), { status: 415 });

    errorHandler(error, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "PETICION_INVALIDA", message: "La petición no se pudo procesar" },
    });
  });

  it("no toma como error del cliente un status 5xx", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("caído"), { status: 503 });

    errorHandler(error, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("responde 500 genérico ante un error inesperado y lo registra en consola", () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("detalle interno que no debe salir");

    errorHandler(error, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
    });
    expect(consola).toHaveBeenCalledWith(expect.stringContaining("INTERNAL_ERROR"), error);
  });

  it("registra el error inesperado con el método, la ruta y quién pidió", () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    const conContexto = { method: "POST", path: "/api/v1/alumnos", usuario: { id_usuario: 3 } } as Request;

    errorHandler(new Error("x"), conContexto, res as unknown as Response, next);

    expect(JSON.parse(consola.mock.calls[0][0] as string)).toEqual({
      error: "INTERNAL_ERROR",
      metodo: "POST",
      ruta: "/api/v1/alumnos",
      usuario: 3,
    });
  });

  it.each([
    ["P2002", 409, "CONFLICT"],
    ["P2025", 404, "NOT_FOUND"],
  ])("traduce el error %s de la base a %i sin exponer su detalle", (codigo, status, code) => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (dni)", {
      code: codigo,
      clientVersion: "6",
    });

    errorHandler(error, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json.mock.calls[0][0].error.code).toBe(code);
    expect(res.json.mock.calls[0][0].error.message).not.toContain("dni");
  });

  it("deja como error interno los demás errores conocidos de la base", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Prisma.PrismaClientKnownRequestError("Foreign key", {
      code: "P2003",
      clientVersion: "6",
    });

    errorHandler(error, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("notFoundHandler", () => {
  it("responde 404 con el método y la ruta pedida", () => {
    const res = crearResponse();

    notFoundHandler({ method: "DELETE", path: "/api/x" } as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "Ruta DELETE /api/x no encontrada" },
    });
  });
});
