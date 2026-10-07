import type { ReactNode } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { buttonVariants, Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface GoogleAuthButtonProps {
  isLoading: boolean;
  onLogin: () => void;
  onRetry: () => void;
  hasError: boolean;
  isConnectionError: boolean;
  // Overlay del botón oficial de GIS (modo real): es el único interactivo
  // para que el tab vaya directo al botón de Google, sin doble parada.
  overlay?: ReactNode;
  className?: string;
}

const BASE_CLASSES =
  "flex h-[64px] min-h-[56px] w-full cursor-pointer items-center justify-center gap-3.5 rounded-2xl border px-8 text-[17px] font-semibold transition-all duration-200";

export function GoogleAuthButton({ isLoading, onLogin, onRetry, hasError, isConnectionError, overlay, className }: GoogleAuthButtonProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Iniciando sesión"
        className={cn(BASE_CLASSES, "cursor-wait border-slate-200 bg-slate-100 text-slate-600 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-slate-300")}
      >
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
        <span>Iniciando sesión...</span>
      </div>
    );
  }

  if (hasError && !isConnectionError) {
    return (
      <Button type="button" onClick={onRetry} className={cn(BASE_CLASSES, "[&_svg]:size-4 border-slate-300 bg-white text-[#1f1f1f] shadow-google hover:bg-slate-50 hover:shadow-google-hover dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15")}>
        <RotateCw aria-hidden="true" className="h-4 w-4 text-primary-dark" />
        <span>Volver a intentar</span>
      </Button>
    );
  }

  // Modo real (overlay): el visual no es focuseable, el interactivo es GIS.
  if (overlay) {
    return (
      <span className="relative block w-full">
        <span
          aria-hidden="true"
          className={cn(buttonVariants({ variant: "outline" }), BASE_CLASSES, "[&_svg]:size-5 border-slate-300 bg-white text-[#1f1f1f] shadow-google", className)}
        >
          <GoogleIcon className="h-5 w-5 shrink-0" />
          <span>{hasError ? "Reintentar con Google" : "Iniciar sesión con Google"}</span>
        </span>
        <span className="sr-only">Al activar, Google mostrará el selector de cuenta para iniciar sesión</span>
        {overlay}
      </span>
    );
  }

  return (
    <span className="relative block w-full">
      <Button
        type="button"
        onClick={hasError ? onRetry : onLogin}
        className={cn(BASE_CLASSES, "[&_svg]:size-5 border-slate-300 bg-white text-[#1f1f1f] shadow-google hover:bg-slate-50 hover:shadow-google-hover focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15", className)}
      >
        <GoogleIcon className="h-5 w-5 shrink-0" />
        <span>{hasError ? "Reintentar con Google" : "Iniciar sesión con Google"}</span>
      </Button>
    </span>
  );
}
