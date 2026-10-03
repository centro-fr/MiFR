import { AlertTriangle, Info, XCircle } from "lucide-react";
import type { AuthErrorCode } from "@/types/auth";
import { cn } from "@/utils/cn";

interface AuthStateBannerProps {
  code: AuthErrorCode;
  onContact: () => void;
  onRetry: () => void;
}

export function AuthStateBanner({ code, onContact, onRetry }: AuthStateBannerProps) {
  const isAccessDenied = code === "ACCESO_NO_HABILITADO" || code === "USUARIO_INACTIVO";

  if (isAccessDenied) {
    return (
      <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <div className="text-sm">
          <p className="font-bold text-amber-900">Acceso no habilitado</p>
          <p className="mt-0.5 leading-snug text-amber-800">
            Tu cuenta no está habilitada. Contactá al centro para solicitar acceso.
          </p>
          <p className="pt-2">
            <button
              type="button"
              onClick={onContact}
              className="min-h-[44px] font-bold text-amber-900 underline hover:no-underline"
            >
              Contactar administración MiFR
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (code === "POPUP_CANCELADO") {
    return (
      <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left shadow-sm">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
          <Info aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <div className="text-sm">
          <p className="font-bold text-slate-900">Inicio cancelado</p>
          <p className="mt-0.5 leading-snug text-slate-600">
            Cerraste la ventana de Google antes de terminar. Podés intentarlo de nuevo cuando quieras.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className={cn("mt-1 min-h-[44px] text-sm font-bold text-slate-900 underline hover:no-underline")}
          >
            Reintentar ahora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left shadow-sm">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
        <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
      <div className="text-sm">
        <p className="font-bold text-rose-900">No pudimos iniciar sesión</p>
        <p className="mt-0.5 leading-snug text-rose-800">
          {code === "POPUP_BLOQUEADO"
            ? "Tu navegador bloqueó la ventana de Google. Habilitá los popups para este sitio e intentá nuevamente."
            : "Verificá tu conexión o el bloqueo de ventanas emergentes."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className={cn("mt-1 min-h-[44px] text-sm font-bold text-rose-900 underline hover:no-underline")}
        >
          Reintentar ahora
        </button>
      </div>
    </div>
  );
}
