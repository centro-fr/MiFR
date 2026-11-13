import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { AuthErrorCode, AuthUser } from "@/types/auth";

// Con Google llega el id_token; con el login de desarrollo, solo el email.
export type LoginVariables = { idToken: string } | { email: string };

function readErrorCode(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  const data = error.response?.data as { error?: { code?: string }; codigo?: string } | undefined;
  // Contrato real del back: { error: { code } }. Se mantiene "codigo" por compatibilidad con mocks viejos.
  return data?.error?.code ?? data?.codigo;
}

function mapLoginError(error: unknown): AuthErrorCode {
  if (isAxiosError(error)) {
    if (!error.response) return "RED_ERROR";
    const codigo = readErrorCode(error);
    if (codigo === "USUARIO_NO_REGISTRADO" || codigo === "ACCESO_NO_HABILITADO") return "ACCESO_NO_HABILITADO";
    if (codigo === "FORBIDDEN" || codigo === "USUARIO_INACTIVO") return "USUARIO_INACTIVO";
    if (codigo === "UNAUTHORIZED" || codigo === "INVALID_GOOGLE_TOKEN") return "INVALID_GOOGLE_TOKEN";
    if (error.response.status >= 500) return "ERROR_SERVIDOR";
    return "ERROR_SERVIDOR";
  }
  return "ERROR_SERVIDOR";
}

export function useLogin() {
  const { login, loginDesarrollo } = useAuth();
  return useMutation<AuthUser, AuthErrorCode, LoginVariables>({
    mutationFn: (variables) => ("email" in variables ? loginDesarrollo(variables.email) : login(variables.idToken)),
    retry: false,
  });
}

export { mapLoginError };
