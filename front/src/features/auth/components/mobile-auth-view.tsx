import type { ReactNode } from "react";
import { AuthStateBanner } from "@/features/auth/components/auth-state-banner";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import type { AuthErrorCode } from "@/types/auth";

interface MobileAuthViewProps {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onLogin: () => void;
  onRetry: () => void;
  onContact: () => void;
  onOpenLegal: (type: "terms" | "privacy") => void;
  overlay?: ReactNode;
}

// Réplica fiel de Stitch 5188 — Mobile 390px: header mínimo, logo centrado,
// botón Google 54px, banners ámbar/rosa, sin footers extensos.
export function MobileAuthView({ errorCode, isLoading, onLogin, onRetry, onContact, onOpenLegal, overlay }: MobileAuthViewProps) {
  const isAccessDenied = errorCode === "ACCESO_NO_HABILITADO" || errorCode === "USUARIO_INACTIVO";
  const showRetry = errorCode !== null && !isLoading;

  return (
    <div className="flex min-h-dvh w-full flex-col bg-white">
      {/* Header mínimo público: solo logo (Stitch) */}
      <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary-dark to-primary text-xs font-extrabold tracking-wider text-white shadow-sm"
          >
            FR
          </span>
          <span className="text-sm font-extrabold tracking-tight text-dark">MiFR</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Acceso</span>
      </header>

      {/* Contenido central */}
      <div className="flex flex-1 flex-col justify-center px-6 py-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-primary-dark via-primary to-[#FF4D9E] text-2xl font-extrabold tracking-wider text-white shadow-xl ring-4 ring-pink-50">
            FR
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-dark">MiFR</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Centro de Entrenamiento FR
          </p>
        </div>

        <div className="mx-auto mt-8 w-full max-w-[342px]">
          {errorCode && !isLoading && <div className="mb-4"><AuthStateBanner code={errorCode} onContact={onContact} onRetry={onRetry} /></div>}
          <GoogleAuthButton
            isLoading={isLoading}
            onLogin={onLogin}
            onRetry={onRetry}
            hasError={errorCode !== null}
            isConnectionError={!isAccessDenied}
            overlay={overlay}
          />
          <p className="mt-4 text-center text-xs font-medium text-slate-400">
            {isLoading ? "Conectando con Google Identity Services..." : "Usá tu cuenta de Google"}
          </p>
          {showRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 min-h-[44px] w-full text-center text-xs font-semibold text-slate-600 hover:text-dark"
            >
              ← Cancelar y volver al inicio
            </button>
          )}
          {isAccessDenied && !isLoading && (
            <button
              type="button"
              onClick={onContact}
              className="mt-2 min-h-[44px] w-full text-center text-xs font-bold text-primary-dark hover:text-primary"
            >
              Contactar administración para solicitar acceso
            </button>
          )}
        </div>
      </div>

      {/* Home indicator + legal mínimo (una línea, Stitch: sin footers extensos) */}
      <div className="flex justify-center bg-white pb-3">
        <div aria-hidden="true" className="h-1 w-32 rounded-full bg-slate-300" />
      </div>
      <footer className="border-t border-slate-100 px-6 py-3 text-center">
        <p className="text-[11px] text-slate-400">
          <button type="button" onClick={() => onOpenLegal("terms")} className="min-h-[44px] font-medium hover:text-slate-600">Términos</button>
          {" · "}
          <button type="button" onClick={() => onOpenLegal("privacy")} className="min-h-[44px] font-medium hover:text-slate-600">Privacidad</button>
        </p>
      </footer>
    </div>
  );
}
