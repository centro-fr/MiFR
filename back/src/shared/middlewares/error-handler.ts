import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

// express.json() rechaza el cuerpo antes de llegar a la ruta con errores que traen un status 4xx
// y un type. Sin esto caían como error interno (500) aunque la culpa es del cliente.
const ERRORES_DEL_CUERPO: Record<string, { code: string; message: string }> = {
  "entity.parse.failed": { code: "JSON_INVALIDO", message: "El cuerpo de la petición no es un JSON válido" },
  "entity.too.large": {
    code: "CUERPO_DEMASIADO_GRANDE",
    message: "El cuerpo de la petición es demasiado grande",
  },
};

interface ErrorDelCliente {
  status: number;
  type?: string;
}

function esErrorDelCliente(err: unknown): err is ErrorDelCliente {
  if (typeof err !== "object" || err === null || !("status" in err)) return false;
  const { status } = err as { status: unknown };
  return typeof status === "number" && status >= 400 && status < 500;
}

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

  if (esErrorDelCliente(err)) {
    const conocido = err.type ? ERRORES_DEL_CUERPO[err.type] : undefined;
    res.status(err.status).json({
      error: conocido ?? { code: "PETICION_INVALIDA", message: "La petición no se pudo procesar" },
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
