import { useState, type FormEvent } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <Card
        aria-labelledby="login-desarrollo-titulo"
        className="w-full max-w-sm gap-4 rounded-2xl border-2 border-dashed border-amber-300 p-6 shadow-sm"
      >
        <CardHeader className="flex items-center gap-2 p-0 text-amber-700 dark:text-amber-300">
          <FlaskConical aria-hidden="true" className="h-5 w-5" />
          <CardTitle id="login-desarrollo-titulo" className="text-base font-extrabold">
            Login de desarrollo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Entra sin Google con el email de un usuario dado de alta. Solo funciona con{" "}
            <code>LOGIN_DESARROLLO=true</code> en el back.
          </p>

          <form onSubmit={handleSubmit} className="space-y-1.5">
            <Label htmlFor="login-desarrollo-email">Email</Label>
            <Input
              id="login-desarrollo-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marina.sosa@example.com"
              className="rounded-xl border-slate-300 bg-white dark:border-white/15 dark:bg-white/5"
            />

            {errorCode && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {MENSAJES[errorCode] ?? "No se pudo iniciar sesión. ¿Está activo LOGIN_DESARROLLO en el back?"}
              </p>
            )}

            <Button type="submit" disabled={isLoading} className="mt-2 w-full rounded-xl text-sm font-extrabold">
              {isLoading ? "Entrando..." : "Entrar (desarrollo)"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
