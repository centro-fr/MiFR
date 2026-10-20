import { OpenApiGeneratorV3, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp, type AppDependencies } from "../app.js";
import { CONFIGURACION_DOCUMENTO_API, registrarDocumentacionApi } from "../openapi.js";
import type { DocumentoOpenApi } from "../shared/openapi/registro.js";

function generarDocumentoOpenApi(): DocumentoOpenApi {
  const registro = new OpenAPIRegistry();
  registrarDocumentacionApi(registro);
  return new OpenApiGeneratorV3(registro.definitions).generateDocument(CONFIGURACION_DOCUMENTO_API);
}

const OPERACIONES_ESPERADAS = [
  "post /auth/google",
  "get /auth/me",
  "post /auth/logout",
  "post /usuarios",
  "get /usuarios",
  "get /usuarios/{id}",
  "patch /usuarios/{id}",
  "delete /usuarios/{id}",
  "post /usuarios/{id}/roles",
  "delete /usuarios/{id}/roles/{rol}",
  "get /seguridad/matriz",
  "put /seguridad/matriz",
  "get /profesoras",
  "post /profesoras",
  "delete /profesoras/{id}",
  "get /alumnos",
  "post /alumnos",
  "get /alumnos/{id}",
  "patch /alumnos/{id}",
  "get /actividades",
  "post /actividades",
  "get /actividades/{id}",
  "patch /actividades/{id}",
  "delete /actividades/{id}",
  "get /horarios",
  "post /horarios",
  "get /horarios/{id}",
  "patch /horarios/{id}",
  "delete /horarios/{id}",
  "get /planes",
  "post /planes",
  "get /planes/{id}",
  "patch /planes/{id}",
  "delete /planes/{id}",
  "get /planes/{id}/precios",
  "post /planes/{id}/precios",
  "get /parametros",
  "get /parametros/datos-bancarios",
  "patch /parametros/{clave}",
  "get /inscripciones",
  "post /inscripciones",
  "get /inscripciones/{id}",
  "post /alumnos/{id}/baja",
  "post /alumnos/{id}/reactivar",
  "post /inscripciones/{id}/cambio-plan",
  "patch /inscripciones/{id}/horarios",
  "post /pagos/efectivo",
  "post /pagos/transferencia",
  "post /pagos/transferencia-recibida",
  "get /pagos/mis-transferencias",
  "get /pagos/transferencias",
  "post /preinscripciones",
  "get /resumen-diario",
  "get /notificaciones/mias",
  "post /notificaciones/{id}/leida",
  "post /notificaciones/leidas",
  "get /informes/alumnos-inactivos",
  "put /informes/alumnos-inactivos/{idInscripcion}/seguimiento",
  "delete /informes/alumnos-inactivos/{idInscripcion}/seguimiento",
  "get /reportes/cuotas-vencidas",
  "get /reportes/cobranza",
  "get /reportes/planes",
  "get /reportes/inscripciones",
  "post /pagos/{id}/aprobar",
  "post /pagos/{id}/rechazar",
  "get /pagos/{id}/comprobante",
  "get /promociones",
  "get /promociones/{id}",
  "post /promociones",
  "patch /promociones/{id}",
  "post /promociones/{id}/desactivar",
  "get /pagos/efectivo-pendiente",
  "get /pagos/rendiciones",
  "post /pagos/{id}/rendir",
  "post /pagos/rendir",
  "get /publico/actividades",
  "get /clases/hoy",
  "get /clases/{id}/asistencia",
  "put /clases/{id}/asistencia/{idAlumno}",
  "post /clases/{id}/asistencia/todos-presentes",
  "post /clases/{id}/cerrar",
  "get /clases",
  "post /clases/{id}/cancelar",
  "get /suplencias",
  "post /suplencias",
  "patch /suplencias/{idClase}",
  "delete /suplencias/{idClase}",
  "get /tarifas-honorario",
  "post /tarifas-honorario",
  "post /tarifas-honorario/{id}/cerrar",
    "post /liquidaciones",
  "get /liquidaciones",
  "get /liquidaciones/{id}",
  "post /liquidaciones/{id}/cerrar",
  "post /liquidaciones/{id}/pagar",
];

function listarOperaciones(documento: DocumentoOpenApi): string[] {
  return Object.entries(documento.paths).flatMap(([ruta, operaciones]) =>
    Object.keys(operaciones).map((metodo) => `${metodo} ${ruta}`),
  );
}

const depsSinUso = {} as AppDependencies;

describe("documentación OpenAPI", () => {
  it("registrarDocumentacionApi documenta todas las operaciones de la API v1", () => {
    const documento = generarDocumentoOpenApi();

    expect(listarOperaciones(documento).sort()).toEqual([...OPERACIONES_ESPERADAS].sort());
  });

  it("registrarDocumentacionApi documenta el login de desarrollo solo si está habilitado", () => {
    const registro = new OpenAPIRegistry();
    registrarDocumentacionApi(registro, { loginDesarrollo: true });
    const documento = new OpenApiGeneratorV3(registro.definitions).generateDocument(
      CONFIGURACION_DOCUMENTO_API,
    );

    expect(listarOperaciones(documento)).toContain("post /auth/desarrollo");
    expect(listarOperaciones(generarDocumentoOpenApi())).not.toContain("post /auth/desarrollo");
  });

  it("registrarDocumentacionApi exige el token Bearer en todo menos el login y el panel público", () => {
    const documento = generarDocumentoOpenApi();
    const sinSeguridad = Object.entries(documento.paths).flatMap(([ruta, operaciones]) =>
      Object.entries(operaciones as Record<string, { security?: unknown[] }>)
        .filter(([, operacion]) => !operacion.security?.length)
        .map(([metodo]) => `${metodo} ${ruta}`),
    );

    expect(sinSeguridad.sort()).toEqual(["get /publico/actividades", "post /auth/google"]);
  });

  it("createApp publica el documento y Swagger UI cuando recibe la documentación", async () => {
    const documento = generarDocumentoOpenApi();
    const app = createApp(depsSinUso, { documentacionApi: documento });

    const json = await request(app).get("/api/v1/docs/openapi.json");
    const ui = await request(app).get("/api/v1/docs/");

    expect(json.status).toBe(200);
    expect(json.body.info.title).toBe("MiFR API");
    expect(ui.status).toBe(200);
    expect(ui.text).toContain("swagger-ui");
  });

  it("createApp no publica la documentación si no la recibe", async () => {
    const app = createApp(depsSinUso);

    const respuesta = await request(app).get("/api/v1/docs/openapi.json");

    expect(respuesta.status).toBe(404);
  });
});
