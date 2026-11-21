import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import { LoginEscena } from "@/features/auth/components/login-escena";
import { AvisoDelLogin, TarjetaDeIngreso } from "@/features/auth/components/login-tarjeta";
import { avisoDeLogin, etiquetaDelBotonGoogle, type AvisoDeLogin } from "@/features/auth/utils/aviso-de-login";
import type { AuthErrorCode } from "@/types/auth";

interface Props {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  escribiendoEmail: boolean;
  onElegirCuenta: () => void;
  onEscribirEmail: () => void;
  onSubmitEmail: (email: string) => void;
  /** El selector de cuentas de prueba, cuando está abierto. */
  children?: ReactNode;
}

const MENSAJES: Partial<Record<AuthErrorCode, string>> = {
  ACCESO_NO_HABILITADO: "Ese email no corresponde a ningún usuario dado de alta.",
  USUARIO_INACTIVO: "El usuario está inactivo.",
};

type AvisoVisible = Pick<AvisoDeLogin, "tono" | "titulo" | "texto">;

function avisoDeDesarrollo(code: AuthErrorCode): AvisoVisible {
  const texto = MENSAJES[code];
  return texto ? { tono: "error", titulo: "No pudimos iniciar sesión", texto } : avisoDeLogin(code);
}

const CLASES_ENLACE =
  "mt-3 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-[#5b6475] hover:text-dark " +
  "focus-visible:outline-2 focus-visible:outline-primary";

function FormularioDeEmail({ isLoading, onSubmit }: { isLoading: boolean; onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) onSubmit(email.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="mt-7">
      <label htmlFor="login-desarrollo-email" className="block text-sm font-bold text-dark">
        Email
      </label>
      <input
        id="login-desarrollo-email"
        type="email"
        required
        autoFocus
        autoComplete="email"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="marina.sosa@example.com"
        className="mt-1.5 h-14 w-full rounded-md border border-[#c3cad5] bg-white px-4 text-base text-dark placeholder:text-[#6b7380] focus-visible:border-dark focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary md:h-[52px] md:text-[15px]"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="mt-4 flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-md bg-dark px-5 text-base font-bold text-white transition-colors hover:bg-[#2a2f3a] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-80 md:h-[52px] md:text-[15px]"
      >
        {isLoading && <Loader2 aria-hidden="true" className="size-[18px] motion-safe:animate-spin" />}
        {isLoading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

// Login de desarrollo: entra sin Google, eligiendo una cuenta de la semilla (como con mocks) o escribiendo
// el email de cualquier usuario de la base. Se ve igual que el login real, sin carteles propios.
export function LoginDesarrolloPanel({
  errorCode,
  isLoading,
  escribiendoEmail,
  onElegirCuenta,
  onEscribirEmail,
  onSubmitEmail,
  children,
}: Props) {
  const aviso = errorCode && !isLoading ? avisoDeDesarrollo(errorCode) : null;

  return (
    <LoginEscena>
      <TarjetaDeIngreso descripcion="Usá la cuenta de Google con la que te registraron en el centro.">
        {aviso && <AvisoDelLogin aviso={aviso} />}

        {escribiendoEmail ? (
          <>
            <FormularioDeEmail isLoading={isLoading} onSubmit={onSubmitEmail} />
            <button type="button" onClick={onElegirCuenta} className={CLASES_ENLACE}>
              Elegir una cuenta de prueba
            </button>
          </>
        ) : (
          <>
            <div className="mt-7">
              <GoogleAuthButton
                etiqueta={etiquetaDelBotonGoogle(errorCode, isLoading)}
                isLoading={isLoading}
                onClick={onElegirCuenta}
              />
            </div>
            <button type="button" onClick={onEscribirEmail} className={CLASES_ENLACE}>
              Entrar con otro email
            </button>
          </>
        )}
      </TarjetaDeIngreso>
      {children}
    </LoginEscena>
  );
}
