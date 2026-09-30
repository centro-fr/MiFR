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
    <div className="flex w-full flex-col items-center justify-center overflow-y-auto bg-white px-8 py-10 lg:h-full lg:w-1/2 lg:px-12">
      <div className="flex w-full max-w-[440px] flex-col items-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-primary-dark to-primary text-2xl font-extrabold tracking-wider text-white shadow-xl ring-4 ring-pink-50">
          FR
        </div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-dark">MiFR</h2>
        <p className="mt-2 text-center text-sm font-bold uppercase tracking-widest text-slate-500">
          Centro de Entrenamiento FR
        </p>
        <div aria-hidden="true" className="my-5 h-0.5 w-12 rounded-full bg-slate-100" />

        {errorCode && !isLoading && (
          <div className="mb-5 w-full">
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
        />
        <p className="mt-4 text-center text-sm font-medium text-slate-500">
          {isLoading ? "Conectando con Google Identity Services..." : "Usá tu cuenta de Google"}
        </p>
        {showRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-[44px] w-full text-center text-sm font-semibold text-slate-600 hover:text-dark"
          >
            ← Volver al estado principal
          </button>
        )}
        {isAccessDenied && !isLoading && (
          <button
            type="button"
            onClick={onContact}
            className="mt-2 min-h-[44px] w-full text-center text-sm font-bold text-primary-dark hover:text-primary"
          >
            Contactar administración para solicitar acceso
          </button>
        )}

        <footer className="mt-5 border-t border-slate-100 pt-3 text-center">
          <p className="text-xs text-slate-500">
            <button type="button" onClick={() => onOpenLegal("terms")} className="min-h-[44px] font-medium hover:text-slate-700">Términos</button>
            {" · "}
            <button type="button" onClick={() => onOpenLegal("privacy")} className="min-h-[44px] font-medium hover:text-slate-700">Privacidad</button>
          </p>
        </footer>
      </div>
    </div>
  );
}
