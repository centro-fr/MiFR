import { AuthStateBanner } from "@/features/auth/components/auth-state-banner";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import { TermsFooter } from "@/features/auth/components/terms-footer";
import type { AuthErrorCode } from "@/types/auth";
import { cn } from "@/utils/cn";

interface MobileAuthViewProps {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onLogin: () => void;
  onRetry: () => void;
  onContact: () => void;
  onOpenLegal: (type: "terms" | "privacy") => void;
}

const STATUS_BADGES: Record<string, { label: string; classes: string }> = {
  default: { label: "Acceso", classes: "bg-rose-50 text-primary" },
  loading: { label: "Validando", classes: "bg-blue-50 text-blue-600" },
  access: { label: "Sin Acceso", classes: "bg-rose-50 text-rose-600" },
  error: { label: "Error", classes: "bg-amber-50 text-amber-700" },
};

export function MobileAuthView({ errorCode, isLoading, onLogin, onRetry, onContact, onOpenLegal }: MobileAuthViewProps) {
  const isAccessDenied = errorCode === "ACCESO_NO_HABILITADO" || errorCode === "USUARIO_INACTIVO";
  const status = isLoading ? "loading" : isAccessDenied ? "access" : errorCode ? "error" : "default";
  const badge = STATUS_BADGES[status];

  return (
    <div className="flex min-h-dvh w-full flex-col bg-bg-light">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-primary-dark text-[10px] font-black text-white"
          >
            FR
          </span>
          <span className="text-sm font-extrabold text-dark">MiFR</span>
        </div>
        <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", badge.classes)}>
          {badge.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between px-6 py-6">
        <div className="flex flex-col items-center pt-6 text-center">
          <div className="relative mb-5">
            <div aria-hidden="true" className="absolute inset-0 rounded-3xl bg-primary opacity-40 blur-lg" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/30 bg-gradient-to-tr from-primary via-[#d81673] to-primary-dark text-2xl font-black tracking-tight text-white shadow-xl">
              MiFR
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-dark">MiFR</h1>
          <p className="mt-1 text-[11px] font-extrabold uppercase tracking-widest text-primary">Centro de Entrenamiento</p>
          <p aria-live="polite" className="mt-2.5 max-w-[280px] text-sm leading-relaxed text-slate-500">
            {isLoading
              ? "Verificando credenciales seguras con Google Identity Services..."
              : "Tu espacio para seguir entrenamientos, clases y tu progreso diario."}
          </p>
        </div>

        <div className="my-auto space-y-4 py-6">
          {errorCode && !isLoading && <AuthStateBanner code={errorCode} onContact={onContact} onRetry={onRetry} />}
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
              <p className="flex items-center justify-center gap-2 pt-3 text-xs text-slate-400">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
                Conexión segura SSL
              </p>
            </>
          )}
          {isLoading && (
            <>
              <p className="flex items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-2.5 text-xs text-primary-dark">
                <span aria-hidden="true" className="h-2 w-2 animate-ping rounded-full bg-primary" />
                <span className="font-medium">Autenticando usuario...</span>
              </p>
              <p className="text-center text-[14px] text-slate-400">Por favor espere unos segundos...</p>
            </>
          )}
          {isAccessDenied && !isLoading && (
            <p className="pt-2 text-center">
              <span className="text-xs text-slate-500">¿Sos nuevo en el centro? </span>
              <button
                type="button"
                onClick={onContact}
                className="mt-1 block min-h-[44px] w-full text-[13px] font-bold text-primary underline decoration-primary/40 hover:text-primary-dark"
              >
                Contactar administración MiFR
              </button>
            </p>
          )}
        </div>

        <TermsFooter onOpenLegal={onOpenLegal} variant="mobile" />
      </div>
    </div>
  );
}
