import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { mensajeDeErrorApi } from "@/api/errores";

describe("mensajeDeErrorApi", () => {
  it("devuelve el mensaje por defecto si no es un error de Axios", () => {
    expect(mensajeDeErrorApi(new Error("fail"), "Error genérico")).toBe("Error genérico");
  });

  it("devuelve aviso de conexión si no hubo respuesta", () => {
    const error = new AxiosError("Network Error");
    expect(mensajeDeErrorApi(error, "Error genérico")).toBe(
      "No se pudo conectar con el servidor. Revisá tu conexión.",
    );
  });

  it("devuelve mensaje de permisos para status 403", () => {
    const error = new AxiosError("Forbidden", "403", undefined, undefined, {
      status: 403,
      statusText: "Forbidden",
      headers: {},
      config: {} as never,
      data: {},
    });
    expect(mensajeDeErrorApi(error, "Error genérico")).toBe(
      "No tenés permisos para realizar esta acción.",
    );
  });

  it("extrae el mensaje principal del backend si existe", () => {
    const error = new AxiosError("Conflict", "409", undefined, undefined, {
      status: 409,
      statusText: "Conflict",
      headers: {},
      config: {} as never,
      data: { error: { code: "CONFLICTO", message: "La profesora ya tiene un horario asignado" } },
    });
    expect(mensajeDeErrorApi(error, "Error genérico")).toBe(
      "La profesora ya tiene un horario asignado",
    );
  });

  it("extrae y concatena details.fieldErrors cuando el backend responde 400", () => {
    const error = new AxiosError("Bad Request", "400", undefined, undefined, {
      status: 400,
      statusText: "Bad Request",
      headers: {},
      config: {} as never,
      data: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Datos inválidos",
          details: {
            formErrors: [],
            fieldErrors: {
              codigo: ["El código solo puede tener letras sin acento"],
              nombre: ["El nombre debe contener al menos una letra"],
            },
          },
        },
      },
    });
    const mensaje = mensajeDeErrorApi(error, "Error genérico");
    expect(mensaje).toContain("codigo: El código solo puede tener letras sin acento");
    expect(mensaje).toContain("nombre: El nombre debe contener al menos una letra");
  });
});
