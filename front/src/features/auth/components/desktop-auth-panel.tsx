import type { ReactNode } from "react";
import { AuthFormBlock } from "@/features/auth/components/auth-form-block";
import type { AuthErrorCode } from "@/types/auth";

interface DesktopAuthPanelProps {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onLogin: () => void;
  onRetry: () => void;
  onClear: () => void;
  onContact: () => void;
  onOpenLegal: (type: "terms" | "privacy") => void;
  overlay?: ReactNode;
}

// Columna derecha 50%: bloque compacto y centrado a la misma altura visual
// que el hero izquierdo. Logo único (centrado) para evitar duplicación.
export function DesktopAuthPanel({ errorCode, isLoading, onLogin, onRetry, onClear, onContact, onOpenLegal, overlay }: DesktopAuthPanelProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center overflow-y-auto bg-white px-8 py-8 lg:h-full lg:w-1/2 lg:px-12">
      <div className="flex w-full max-w-[460px] flex-col items-center">
        <div
          aria-hidden="true"
          className="mb-3 flex h-[120px] w-[120px] items-center justify-center rounded-[28px] bg-gradient-to-tr from-primary-dark to-primary text-[34px] font-extrabold tracking-wider text-white shadow-xl ring-4 ring-pink-50"
        >
          FR
        </div>
        <h2 className="text-center text-[44px] font-extrabold leading-none tracking-tight text-dark">MiFR</h2>
        <p className="mt-2 text-center text-[15px] font-bold uppercase tracking-[0.18em] text-slate-700">
          Centro de Entrenamiento FR
        </p>
        <div aria-hidden="true" className="my-3 h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <AuthFormBlock
          errorCode={errorCode}
          isLoading={isLoading}
          onLogin={onLogin}
          onRetry={onRetry}
          onClear={onClear}
          onContact={onContact}
          overlay={overlay}
          buttonClassName="lg:h-[76px] lg:px-10 lg:text-lg"
          hintClassName="text-[15px]"
        />

        <footer className="mt-3 border-t border-slate-100 pt-2 text-center">
          <p className="text-sm text-slate-600">
            <button type="button" onClick={() => onOpenLegal("terms")} className="min-h-[44px] font-medium hover:text-slate-700">Términos</button>
            {" · "}
            <button type="button" onClick={() => onOpenLegal("privacy")} className="min-h-[44px] font-medium hover:text-slate-700">Privacidad</button>
          </p>
        </footer>
      </div>
    </div>
  );
}
