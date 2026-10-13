import { isAxiosError } from "axios";
import { ZodError } from "zod";

/** El `code` de un error del back (por ejemplo "MONTO_DISTINTO"), o null si no vino del back. */
export function codigoDeErrorApi(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  const datos = error.response?.data as { error?: { code?: unknown } } | undefined;
  return typeof datos?.error?.code === "string" ? datos.error.code : null;
}

// El back responde los errores como { error: { code, message } } y el mensaje ya está
// pensado para mostrarse (por ejemplo, el 409 de una superposición de horarios).
export function mensajeDeErrorApi(error: unknown, mensajePorDefecto: string): string {
  // Una respuesta que no cumple el esquema Zod es un desfasaje entre front y back: se deja
  // el detalle en la consola para poder corregirlo, en lugar de esconderlo tras un mensaje genérico.
  if (error instanceof ZodError) {
    console.error("La respuesta de la API no cumple el contrato esperado", error.issues);
    return "La respuesta del servidor no tiene el formato esperado.";
  }
  if (!isAxiosError(error)) return mensajePorDefecto;
  if (!error.response) return "No se pudo conectar con el servidor. Revisá tu conexión.";
  if (error.response.status === 403) return "No tenés permisos para realizar esta acción.";

  interface DetalleErrorApi {
    formErrors?: string[];
    fieldErrors?: Record<string, string[]>;
  }

  interface RespuestaErrorApi {
    error?: {
      code?: string;
      message?: string;
      details?: DetalleErrorApi;
    };
  }

  const data = error.response.data as RespuestaErrorApi | undefined;
  if (data?.error?.details) {
    const { formErrors, fieldErrors } = data.error.details;
    const detallesCampos = fieldErrors
      ? Object.entries(fieldErrors)
          .flatMap(([campo, mensajes]) => (mensajes ?? []).map((m) => `${campo}: ${m}`))
          .filter(Boolean)
      : [];
    const todos = [...(formErrors ?? []), ...detallesCampos];
    if (todos.length > 0) {
      return todos.join(". ");
    }
  }

  return data?.error?.message ?? mensajePorDefecto;
}
