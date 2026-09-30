import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { AuthErrorCode, AuthUser } from "@/types/auth";

interface LoginVariables {
  idToken: string;
}

function mapLoginError(error: unknown): AuthErrorCode {
  if (isAxiosError(error)) {
    if (!error.response) return "RED_ERROR";
    const codigo = error.response.data?.codigo as string | undefined;
    if (codigo === "ACCESO_NO_HABILITADO") return "ACCESO_NO_HABILITADO";
    if (codigo === "USUARIO_INACTIVO") return "USUARIO_INACTIVO";
    if (codigo === "INVALID_GOOGLE_TOKEN") return "INVALID_GOOGLE_TOKEN";
    if (error.response.status >= 500) return "RED_ERROR";
    return "RED_ERROR";
  }
  return "RED_ERROR";
}

export function useLogin() {
  const { login } = useAuth();
  return useMutation<AuthUser, AuthErrorCode, LoginVariables>({
    mutationFn: ({ idToken }) => login(idToken),
    retry: false,
  });
}

export { mapLoginError };
