import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AuthFormBlock } from "@/features/auth/components/auth-form-block";
import type { AuthErrorCode } from "@/types/auth";

interface MobileAuthViewProps {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onLogin: () => void;
  onRetry: () => void;
  onClear: () => void;
  onContact: () => void;
  onOpenLegal: (type: "terms" | "privacy") => void;
  overlay?: ReactNode;
}

// Réplica fiel de Stitch 5188 — Mobile 390px: header mínimo, logo centrado,
// botón Google 54px, banners ámbar/rosa, sin footers extensos.
export function MobileAuthView({ errorCode, isLoading, onLogin, onRetry, onClear, onContact, onOpenLegal, overlay }: MobileAuthViewProps) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-white dark:bg-surface-low">
      {/* Header mínimo público: solo logo (Stitch) */}
      <header className="flex items-center border-b border-slate-100 bg-white px-6 py-4 dark:border-white/10 dark:bg-surface-low">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary-dark to-primary text-xs font-extrabold tracking-wider text-white shadow-sm"
          >
            FR
          </span>
          <span className="text-sm font-extrabold tracking-tight text-dark dark:text-white">MiFR</span>
        </div>
      </header>

      {/* Contenido central */}
      <div className="flex flex-1 flex-col justify-center px-6 py-8">
        <div className="flex flex-col items-center text-center">
          <div
            aria-hidden="true"
            className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-primary-dark via-primary to-primary-dark text-2xl font-extrabold tracking-wider text-white shadow-xl ring-4 ring-pink-50 dark:ring-primary/20"
          >
            FR
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-dark dark:text-white">MiFR</h1>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Centro de Entrenamiento FR
          </p>
        </div>

        <div className="mx-auto mt-8 w-full max-w-[342px]">
          <AuthFormBlock
            errorCode={errorCode}
            isLoading={isLoading}
            onLogin={onLogin}
            onRetry={onRetry}
            onClear={onClear}
            onContact={onContact}
            overlay={overlay}
            hintClassName="text-sm"
            actionClassName="text-sm"
          />
        </div>
      </div>

      {/* Home indicator + legal mínimo (una línea, Stitch: sin footers extensos) */}
      <div className="flex justify-center bg-white pb-2 dark:bg-surface-low">
        <div aria-hidden="true" className="h-1 w-32 rounded-full bg-slate-300" />
      </div>
      <footer className="border-t border-slate-100 px-6 pb-3 pt-2 text-center dark:border-white/10">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <Button type="button" variant="link" onClick={() => onOpenLegal("terms")} className="h-auto min-h-[44px] px-0 font-medium text-inherit underline-offset-2 hover:text-inherit hover:no-underline">Términos</Button>
          {" · "}
          <Button type="button" variant="link" onClick={() => onOpenLegal("privacy")} className="h-auto min-h-[44px] px-0 font-medium text-inherit underline-offset-2 hover:text-inherit hover:no-underline">Privacidad</Button>
        </p>
      </footer>
    </div>
  );
}
