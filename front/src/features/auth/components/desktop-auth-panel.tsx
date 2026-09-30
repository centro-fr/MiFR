import type { ReactNode } from "react";
import { AuthStateBanner } from "@/features/auth/components/auth-state-banner";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import type { AuthErrorCode } from "@/types/auth";

interface DesktopAuthPanelProps {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onLogin: () => void;
  onRetry: () => void;
  onContact: () => void;
  onOpenLegal: (type: "terms" | "privacy") => void;
  overlay?: ReactNode;
}

// Columna derecha 50%: bloque compacto y centrado a la misma altura visual
// que el hero izquierdo. Logo único (centrado) para evitar duplicación.
export function DesktopAuthPanel({ errorCode, isLoading, onLogin, onRetry, onContact, onOpenLegal, overlay }: DesktopAuthPanelProps) {
  const isAccessDenied = errorCode === "ACCESO_NO_HABILITADO" || errorCode === "USUARIO_INACTIVO";
  const showRetry = errorCode !== null && !isLoading;

  return (
    <div className="flex w-full flex-col items-center justify-center overflow-y-auto bg-white px-8 py-8 lg:h-full lg:w-1/2 lg:px-12">
      <div className="flex w-full max-w-[460px] flex-col items-center">
        <div className="mb-3 flex h-[120px] w-[120px] items-center justify-center rounded-[28px] bg-gradient-to-tr from-primary-dark to-primary text-[34px] font-extrabold tracking-wider text-white shadow-xl ring-4 ring-pink-50">
          FR
        </div>
        <h2 className="text-center text-[44px] font-extrabold leading-none tracking-tight text-dark">MiFR</h2>
        <p className="mt-2 text-center text-[15px] font-bold uppercase tracking-[0.18em] text-slate-700">
          Centro de Entrenamiento FR
        </p>
        <div aria-hidden="true" className="my-3 h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {errorCode && !isLoading && (
          <div className="mb-3 w-full">
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
          className="lg:h-[76px] lg:px-10 lg:text-lg"
        />
        <p className="mt-3 text-center text-[15px] font-medium text-slate-500">
          {isLoading ? "Conectando con Google Identity Services..." : "Usá tu cuenta de Google"}
        </p>
        {showRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 min-h-[44px] w-full text-center text-sm font-semibold text-slate-600 hover:text-dark"
          >
            ← Volver al estado principal
          </button>
        )}
        {isAccessDenied && !isLoading && (
          <button
            type="button"
            onClick={onContact}
            className="mt-1 min-h-[44px] w-full text-center text-sm font-bold text-primary-dark hover:text-primary"
          >
            Contactar administración para solicitar acceso
          </button>
        )}

        <footer className="mt-3 border-t border-slate-100 pt-2 text-center">
          <p className="text-[13px] text-slate-500">
            <button type="button" onClick={() => onOpenLegal("terms")} className="min-h-[44px] font-medium hover:text-slate-700">Términos</button>
            {" · "}
            <button type="button" onClick={() => onOpenLegal("privacy")} className="min-h-[44px] font-medium hover:text-slate-700">Privacidad</button>
          </p>
        </footer>
      </div>
    </div>
  );
}
