import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { LogoFr } from "@/components/marca/logo-fr";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import { avisoDeLogin, etiquetaDelBotonGoogle, type AvisoDeLogin } from "@/features/auth/utils/aviso-de-login";
import type { AuthErrorCode } from "@/types/auth";
import { cn } from "@/utils/cn";

export function AvisoDelLogin({ aviso }: { aviso: Pick<AvisoDeLogin, "tono" | "titulo" | "texto"> }) {
  const color = aviso.tono === "error" ? "text-[#b42318]" : "text-[#5b6475]";
  return (
    <div
      role="alert"
      className={cn("mt-6 border-l-2 pl-3.5", aviso.tono === "error" ? "border-[#b42318]" : "border-[#5b6475]")}
    >
      <p className={cn("text-[15px] leading-[22px] font-bold", color)}>{aviso.titulo}</p>
      <p className="mt-0.5 text-sm text-[#5b6475]">{aviso.texto}</p>
    </div>
  );
}

interface TarjetaDeIngresoProps {
  descripcion: string;
  children: ReactNode;
}

// Parece un modal, pero es el contenido principal de la página (no hay nada detrás con qué
// interactuar): por eso es una <section> con título y no un role="dialog" que atrape el foco.
export function TarjetaDeIngreso({ descripcion, children }: TarjetaDeIngresoProps) {
  return (
    <section
      aria-labelledby="login-titulo"
      className="relative w-full rounded-t-2xl bg-white px-6 pt-7 pb-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)] motion-safe:animate-login-tarjeta md:max-w-[420px] md:rounded-xl md:p-10"
    >
      <Link
        to="/"
        aria-label="Volver al sitio"
        className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-lg text-[#5b6475] transition-colors hover:bg-[#eef1f4] hover:text-dark focus-visible:outline-2 focus-visible:outline-primary"
      >
        <X aria-hidden="true" className="size-[18px]" />
      </Link>

      <LogoFr className="size-10" />
      <h1
        id="login-titulo"
        className="mt-7 font-display text-[30px] leading-[34px] font-extrabold tracking-[-0.02em] whitespace-nowrap font-stretch-expanded md:text-[34px] md:leading-[38px]"
      >
        Entrá a MiFR
      </h1>
      <p className="mt-2.5 text-[15px] leading-[22px] text-[#5b6475]">{descripcion}</p>

      {children}
    </section>
  );
}

interface LoginTarjetaProps {
  errorCode: AuthErrorCode | null;
  isLoading: boolean;
  onLogin: () => void;
  overlay?: ReactNode;
}

export function LoginTarjeta({ errorCode, isLoading, onLogin, overlay }: LoginTarjetaProps) {
  const aviso = errorCode && !isLoading ? avisoDeLogin(errorCode) : null;

  return (
    <TarjetaDeIngreso descripcion="Usá la cuenta de Google con la que te registraron en el centro.">
      {aviso && <AvisoDelLogin aviso={aviso} />}

      <div className="mt-7">
        <GoogleAuthButton
          etiqueta={etiquetaDelBotonGoogle(errorCode, isLoading)}
          isLoading={isLoading}
          onClick={onLogin}
          overlay={overlay}
        />
      </div>
    </TarjetaDeIngreso>
  );
}
