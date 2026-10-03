import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: err.flatten() },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } });
}

export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: `Ruta ${req.method} ${req.path} no encontrada` } });
}
