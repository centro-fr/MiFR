import type { ReactNode } from "react";
import { AuthStateBanner } from "@/features/auth/components/auth-state-banner";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import type { AuthErrorCode } from "@/types/auth";
import { cn } from "@/utils/cn";

interface AuthFormBlockProps {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onLogin: () => void;
  onRetry: () => void;
  onClear: () => void;
  onContact: () => void;
  overlay?: ReactNode;
  buttonClassName?: string;
  hintClassName?: string;
  actionClassName?: string;
}

// Bloque compartido mobile/desktop: banner + botón Google + acciones.
// Evita duplicar la lógica de isAccessDenied/showRetry en dos vistas.
export function AuthFormBlock({
  errorCode,
  isLoading,
  onLogin,
  onRetry,
  onClear,
  onContact,
  overlay,
  buttonClassName,
  hintClassName,
  actionClassName,
}: AuthFormBlockProps) {
  const isAccessDenied = errorCode === "ACCESO_NO_HABILITADO" || errorCode === "USUARIO_INACTIVO";
  const showRetry = errorCode !== null && !isLoading;

  return (
    <div className="w-full">
      {errorCode && !isLoading && (
        <div className="mb-4">
          <AuthStateBanner code={errorCode} onContact={onContact} onRetry={onRetry} />
        </div>
      )}
      <GoogleAuthButton
        isLoading={isLoading}
        onLogin={onLogin}
        onRetry={onRetry}
        hasError={errorCode !== null}
        isConnectionError={!isAccessDenied}
        overlay={overlay}
        className={buttonClassName}
      />
      <p className={cn("mt-4 text-center text-sm font-medium text-slate-600", hintClassName)}>
        {isLoading ? "Conectando con Google Identity Services..." : "Usá tu cuenta de Google"}
      </p>
      {showRetry && (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            "mt-3 min-h-[44px] w-full text-center text-sm font-semibold text-slate-600 hover:text-dark",
            actionClassName,
          )}
        >
          ← Cancelar y volver al inicio
        </button>
      )}
      {isAccessDenied && !isLoading && (
        <button
          type="button"
          onClick={onContact}
          className={cn(
            "mt-2 min-h-[44px] w-full text-center text-sm font-bold text-primary-dark hover:text-primary",
            actionClassName,
          )}
        >
          Contactar administración para solicitar acceso
        </button>
      )}
    </div>
  );
}
