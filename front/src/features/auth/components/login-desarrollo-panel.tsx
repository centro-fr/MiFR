import { useState, type FormEvent } from "react";
import { FlaskConical } from "lucide-react";
import type { AuthErrorCode } from "@/types/auth";

interface Props {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onSubmit: (email: string) => void;
}

const MENSAJES: Partial<Record<AuthErrorCode, string>> = {
  ACCESO_NO_HABILITADO: "Ese email no corresponde a ningún usuario dado de alta.",
  USUARIO_INACTIVO: "El usuario está inactivo.",
};

// Pantalla de login de desarrollo: entra con el email de un usuario de la base, sin Google.
// Se ve distinta a propósito, para que nadie la confunda con el login real.
export function LoginDesarrolloPanel({ errorCode, isLoading, onSubmit }: Props) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) onSubmit(email.trim());
  };

  return (
    <main className="flex h-dvh items-center justify-center bg-canvas px-4">
      <form
        onSubmit={handleSubmit}
        aria-labelledby="login-desarrollo-titulo"
        className="w-full max-w-sm space-y-4 rounded-2xl border-2 border-dashed border-amber-300 bg-white p-6 shadow-sm dark:bg-surface-low"
      >
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <FlaskConical aria-hidden="true" className="h-5 w-5" />
          <h1 id="login-desarrollo-titulo" className="text-base font-extrabold">
            Login de desarrollo
          </h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Entra sin Google con el email de un usuario dado de alta. Solo funciona con{" "}
          <code>LOGIN_DESARROLLO=true</code> en el back.
        </p>

        <div className="space-y-1.5">
          <label htmlFor="login-desarrollo-email" className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Email
          </label>
          <input
            id="login-desarrollo-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="marina.sosa@example.com"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-pink-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          />
        </div>

        {errorCode && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {MENSAJES[errorCode] ?? "No se pudo iniciar sesión. ¿Está activo LOGIN_DESARROLLO en el back?"}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="min-h-[44px] w-full rounded-xl bg-primary px-5 text-sm font-extrabold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {isLoading ? "Entrando..." : "Entrar (desarrollo)"}
        </button>
      </form>
    </main>
  );
}
