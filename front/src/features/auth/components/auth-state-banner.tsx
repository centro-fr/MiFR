import { AlertTriangle, XCircle } from "lucide-react";
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
      <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-rose-50 p-4 text-left">
        <span className="mt-0.5 shrink-0 rounded-lg bg-rose-100 p-1 text-primary-dark">
          <XCircle aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="text-xs">
          <p className="font-bold text-primary-dark">
            {code === "USUARIO_INACTIVO" ? "Cuenta inactiva" : "Acceso no habilitado"}
          </p>
          <p className="mt-0.5 leading-relaxed text-rose-900/80">
            {code === "USUARIO_INACTIVO"
              ? "Tu cuenta se encuentra inactiva o dada de baja. Contactá a la administración del centro."
              : "Tu cuenta no está registrada como socio o staff activo. Contactá al centro para solicitar el alta."}
          </p>
          <p className="pt-2">
            <span className="text-slate-500">¿Sos alumno o profe nuevo? </span>
            <button
              type="button"
              onClick={onContact}
              className="min-h-[44px] font-bold text-primary underline decoration-primary/40 hover:text-primary-dark"
            >
              Contactar administración MiFR
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
      <span className="mt-0.5 shrink-0 rounded-lg bg-amber-100 p-1 text-amber-700">
        <AlertTriangle aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="text-xs">
        <p className="font-bold text-amber-900">
          {code === "POPUP_BLOQUEADO" ? "Ventana bloqueada" : "Fallo de conexión"}
        </p>
        <p className="mt-0.5 leading-relaxed text-amber-800/80">
          {code === "POPUP_BLOQUEADO"
            ? "Tu navegador bloqueó la ventana de Google. Habilitá los popups para este sitio e intentá nuevamente."
            : "No pudimos completar el inicio de sesión. Por favor reintentá en unos momentos."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className={cn("mt-1 min-h-[44px] text-xs font-bold text-amber-900 underline hover:no-underline")}
        >
          Reintentar ahora
        </button>
      </div>
    </div>
  );
}
