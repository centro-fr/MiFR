import { AlertTriangle, Info, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AuthErrorCode } from "@/types/auth";
import { cn } from "@/utils/cn";

interface AuthStateBannerProps {
  code: AuthErrorCode;
  onContact: () => void;
  onRetry: () => void;
}

// El cva de Alert posiciona el svg en absoluto; acá lo dejamos estático en un
// flex para preservar el diseño original (icono circular a la izquierda).
const CLASES_BASE =
  "flex items-start gap-3 rounded-2xl border p-4 text-left shadow-sm " +
  "[&>svg]:static [&>svg]:mt-0.5 [&>svg]:h-6 [&>svg]:w-6 [&>svg]:shrink-0 " +
  "[&>svg]:rounded-full [&>svg]:p-1.5 [&>svg~*]:pl-0";

function BotonBanner({ children, onClick, className }: { children: string; onClick: () => void; className?: string }) {
  return (
    <Button
      type="button"
      variant="link"
      onClick={onClick}
      className={cn("h-auto min-h-[44px] px-0 font-bold underline hover:no-underline", className)}
    >
      {children}
    </Button>
  );
}

export function AuthStateBanner({ code, onContact, onRetry }: AuthStateBannerProps) {
  const isAccessDenied = code === "ACCESO_NO_HABILITADO" || code === "USUARIO_INACTIVO";

  if (isAccessDenied) {
    return (
      <Alert aria-live="assertive" className={cn(CLASES_BASE, "border-amber-200 bg-amber-50 [&>svg]:bg-amber-100 [&>svg]:text-amber-800")}>
        <XCircle aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <AlertTitle className="text-sm font-bold leading-snug text-amber-900">Acceso no habilitado</AlertTitle>
          <AlertDescription className="text-sm text-amber-800">
            Tu cuenta no está habilitada. Contactá al centro para solicitar acceso.
            <br />
            <BotonBanner onClick={onContact} className="text-amber-900">
              Contactar administración MiFR
            </BotonBanner>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  if (code === "POPUP_CANCELADO") {
    return (
      <Alert aria-live="assertive" className={cn(CLASES_BASE, "border-slate-200 bg-slate-50 dark:border-white/15 dark:bg-white/5 [&>svg]:bg-slate-200 [&>svg]:text-slate-700")}>
        <Info aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <AlertTitle className="text-sm font-bold leading-snug text-slate-900 dark:text-white">Inicio cancelado</AlertTitle>
          <AlertDescription className="text-sm text-slate-600 dark:text-slate-400">
            Cerraste la ventana de Google antes de terminar. Podés intentarlo de nuevo cuando quieras.
            <br />
            <BotonBanner onClick={onRetry} className="text-slate-900 dark:text-white">
              Reintentar ahora
            </BotonBanner>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <Alert aria-live="assertive" className={cn(CLASES_BASE, "border-rose-200 bg-rose-50 [&>svg]:bg-rose-100 [&>svg]:text-rose-700")}>
      <AlertTriangle aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <AlertTitle className="text-sm font-bold leading-snug text-rose-900">No pudimos iniciar sesión</AlertTitle>
        <AlertDescription className="text-sm text-rose-800">
          {code === "POPUP_BLOQUEADO"
            ? "Tu navegador bloqueó la ventana de Google. Habilitá los popups para este sitio e intentá nuevamente."
            : "Verificá tu conexión o el bloqueo de ventanas emergentes."}
          <br />
          <BotonBanner onClick={onRetry} className="text-rose-900">
            Reintentar ahora
          </BotonBanner>
        </AlertDescription>
      </div>
    </Alert>
  );
}
