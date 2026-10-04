import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import type { DocumentoOpenApi } from "./registro.js";

export function createDocumentacionRoutes(documento: DocumentoOpenApi): Router {
  const router = Router();

  router.get("/openapi.json", (_req, res) => res.json(documento));
  router.use("/", swaggerUi.serve, swaggerUi.setup(documento));

  return router;
}
