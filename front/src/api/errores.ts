import { isAxiosError } from "axios";

// El back responde los errores como { error: { code, message } } y el mensaje ya está
// pensado para mostrarse (por ejemplo, el 409 de una superposición de horarios).
export function mensajeDeErrorApi(error: unknown, mensajePorDefecto: string): string {
  if (!isAxiosError(error)) return mensajePorDefecto;
  if (!error.response) return "No se pudo conectar con el servidor. Revisá tu conexión.";
  if (error.response.status === 403) return "No tenés permisos para realizar esta acción.";

  const data = error.response.data as { error?: { message?: string } } | undefined;
  return data?.error?.message ?? mensajePorDefecto;
}
