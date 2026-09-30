import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../async-handler.js";

const req = {} as Request;
const res = {} as Response;

describe("asyncHandler", () => {
  it("asyncHandler ejecuta el handler con req, res y next", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn() as NextFunction;

    asyncHandler(handler)(req, res, next);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith(req, res, next));

    expect(next).not.toHaveBeenCalled();
  });

  it("asyncHandler pasa a next el error de un handler que rechaza", async () => {
    const error = new Error("falló");
    const next = vi.fn() as NextFunction;

    asyncHandler(vi.fn().mockRejectedValue(error))(req, res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(error));
  });
});
