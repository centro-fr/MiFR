import { RotateCw } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/cn";

interface GoogleAuthButtonProps {
  isLoading: boolean;
  onLogin: () => void;
  onRetry: () => void;
  hasError: boolean;
  isConnectionError: boolean;
}

const BASE_CLASSES =
  "flex min-h-[48px] h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full border px-6 text-sm font-semibold transition-all duration-200 min-[390px]:min-h-[52px] min-[390px]:h-[52px] min-[390px]:text-[15px]";

export function GoogleAuthButton({ isLoading, onLogin, onRetry, hasError, isConnectionError }: GoogleAuthButtonProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Iniciando sesión"
        className={cn(BASE_CLASSES, "cursor-wait border-slate-200 bg-slate-100 text-slate-600 shadow-sm")}
      >
        <Spinner />
        <span>Iniciando sesión...</span>
      </div>
    );
  }

  if (hasError && !isConnectionError) {
    return (
      <button type="button" onClick={onRetry} className={cn(BASE_CLASSES, "border-slate-300 bg-white text-[#1f1f1f] shadow-google hover:bg-slate-50 hover:shadow-google-hover")}>
        <RotateCw aria-hidden="true" className="h-4 w-4 text-primary-dark" />
        <span>Volver a intentar</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={hasError ? onRetry : onLogin}
      className={cn(BASE_CLASSES, "border-slate-300 bg-white text-[#1f1f1f] shadow-google hover:bg-slate-50 hover:shadow-google-hover focus:outline-none focus:ring-2 focus:ring-primary/30")}
    >
      <GoogleIcon className="h-5 w-5 shrink-0" />
      <span>{hasError ? "Reintentar con Google" : "Iniciar sesión con Google"}</span>
    </button>
  );
}
