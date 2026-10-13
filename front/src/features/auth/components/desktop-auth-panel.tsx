import type { ReactNode } from "react";
import { LogoFr } from "@/components/marca/logo-fr";
import { AuthFormBlock } from "@/features/auth/components/auth-form-block";
import type { AuthErrorCode } from "@/types/auth";

interface DesktopAuthPanelProps {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onLogin: () => void;
  onRetry: () => void;
  onClear: () => void;
  overlay?: ReactNode;
}

// Columna derecha 50%: bloque compacto y centrado a la misma altura visual
// que el hero izquierdo. Logo único (centrado) para evitar duplicación.
export function DesktopAuthPanel({ errorCode, isLoading, onLogin, onRetry, onClear, overlay }: DesktopAuthPanelProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center overflow-y-auto bg-white px-8 py-8 lg:h-full lg:w-1/2 lg:px-12 dark:bg-surface-low">
      <div className="flex w-full max-w-[460px] flex-col items-center">
        <LogoFr className="mb-3 size-[120px] drop-shadow-xl" />
        <h2 className="text-center text-[44px] font-extrabold leading-none tracking-tight text-dark dark:text-white">MiFR</h2>
        <p className="mt-2 text-center text-[15px] font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">
          Centro de Entrenamiento FR
        </p>
        <div aria-hidden="true" className="my-3 h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <AuthFormBlock
          errorCode={errorCode}
          isLoading={isLoading}
          onLogin={onLogin}
          onRetry={onRetry}
          onClear={onClear}
          overlay={overlay}
          buttonClassName="lg:h-[76px] lg:px-10 lg:text-lg"
          hintClassName="text-[15px]"
        />
      </div>
    </div>
  );
}
