import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import { validate } from "../validate.js";

const res = {} as Response;

describe("validate", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it("validate reemplaza body, params y query por la versión parseada", () => {
    const req = {
      body: { nombre: "  Ana " },
      params: { id: "5" },
      query: { pagina: "2" },
    } as unknown as Request;

    validate({
      body: z.object({ nombre: z.string().trim() }),
      params: z.object({ id: z.coerce.number() }),
      query: z.object({ pagina: z.coerce.number() }),
    })(req, res, next);

    expect(req.body).toEqual({ nombre: "Ana" });
    expect(req.params).toEqual({ id: 5 });
    expect(req.query).toEqual({ pagina: 2 });
    expect(next).toHaveBeenCalledOnce();
  });

  it("validate descarta los campos que no están en el schema", () => {
    const req = { body: { nombre: "Ana", admin: true } } as unknown as Request;

    validate({ body: z.object({ nombre: z.string() }) })(req, res, next);

    expect(req.body).toEqual({ nombre: "Ana" });
  });

  it("validate no toca lo que no tiene schema", () => {
    const req = { body: { a: 1 }, params: { id: "x" } } as unknown as Request;

    validate({ body: z.object({ a: z.number() }) })(req, res, next);

    expect(req.params).toEqual({ id: "x" });
  });

  it("validate lanza ZodError y no sigue si los datos son inválidos", () => {
    const req = { body: { nombre: 123 } } as unknown as Request;

    expect(() => validate({ body: z.object({ nombre: z.string() }) })(req, res, next)).toThrow(ZodError);
    expect(next).not.toHaveBeenCalled();
  });
});
