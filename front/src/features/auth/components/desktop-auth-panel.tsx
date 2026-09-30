import { AuthStateBanner } from "@/features/auth/components/auth-state-banner";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import { TermsFooter } from "@/features/auth/components/terms-footer";
import type { AuthErrorCode } from "@/types/auth";

interface DesktopAuthPanelProps {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onLogin: () => void;
  onRetry: () => void;
  onContact: () => void;
  onOpenLegal: (type: "terms" | "privacy") => void;
}

const STATE_DESCRIPTIONS: Record<string, string> = {
  default: "Tu espacio para seguir entrenamientos, clases y tu progreso diario.",
  loading: "Verificando credenciales seguras con Google Identity Services...",
  access: "Revisá el estado de tu membresía o contactá al centro.",
  error: "Ocurrió un problema al conectar con el servidor de autenticación.",
};

export function DesktopAuthPanel({ errorCode, isLoading, onLogin, onRetry, onContact, onOpenLegal }: DesktopAuthPanelProps) {
  const isAccessDenied = errorCode === "ACCESO_NO_HABILITADO" || errorCode === "USUARIO_INACTIVO";
  const description = isLoading
    ? STATE_DESCRIPTIONS.loading
    : isAccessDenied
      ? STATE_DESCRIPTIONS.access
      : errorCode
        ? STATE_DESCRIPTIONS.error
        : STATE_DESCRIPTIONS.default;

  return (
    <div className="flex flex-col items-center justify-between bg-bg-light p-6 sm:p-10 lg:w-[46%] lg:p-12 xl:w-[44%]">
      <div className="flex w-full max-w-[420px] items-center justify-between pb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-dark/50">Portal de Acceso</span>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          SSO Google Identity
        </span>
      </div>

      <div className="my-auto flex w-full max-w-[420px] flex-col justify-center">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="group relative mb-4">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-primary to-primary-dark opacity-40 blur-xl transition-opacity group-hover:opacity-60"
            />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/30 bg-gradient-to-tr from-primary via-[#d81673] to-primary-dark text-2xl font-black tracking-tight text-white shadow-xl">
              MiFR
            </div>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-dark sm:text-3xl">MiFR</h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-primary">Gestión del Centro de Entrenamiento</p>
          <p aria-live="polite" className="mt-2 max-w-xs text-sm text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex w-full flex-col justify-center space-y-4">
          {errorCode && !isLoading && (
            <AuthStateBanner code={errorCode} onContact={onContact} onRetry={onRetry} />
          )}
          <GoogleAuthButton
            isLoading={isLoading}
            onLogin={onLogin}
            onRetry={onRetry}
            hasError={errorCode !== null}
            isConnectionError={!isAccessDenied}
          />
          {!errorCode && !isLoading && (
            <>
              <p className="text-center text-[14px] text-slate-500">Usá tu cuenta de Google</p>
              <p className="flex items-center justify-center gap-2 pt-4 text-xs text-slate-400">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
                Servidor conectado con Google Identity Cloud
              </p>
            </>
          )}
          {isLoading && (
            <>
              <p className="flex items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs text-primary-dark">
                <span aria-hidden="true" className="h-2 w-2 animate-ping rounded-full bg-primary" />
                <span className="font-medium">Conectando con Google Identity Services...</span>
              </p>
              <p className="text-center text-[14px] text-slate-500">Por favor espere mientras validamos sus credenciales.</p>
            </>
          )}
        </div>
      </div>

      <TermsFooter onOpenLegal={onOpenLegal} variant="desktop" />
    </div>
  );
}
