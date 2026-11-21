import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { cn } from "@/utils/cn";

interface GoogleAuthButtonProps {
  etiqueta: string;
  isLoading: boolean;
  onClick: () => void;
  // Overlay del botón oficial de GIS (modo real): es el único interactivo
  // para que el tab vaya directo al botón de Google, sin doble parada.
  overlay?: ReactNode;
}

const CLASES =
  "flex h-14 w-full items-center justify-center gap-3 rounded-md border border-[#c3cad5] bg-white px-5 " +
  "text-base font-bold text-dark transition-colors md:h-[52px] md:text-[15px]";

function Contenido({ etiqueta, isLoading }: { etiqueta: string; isLoading: boolean }) {
  return (
    <>
      {isLoading ? (
        <Loader2 aria-hidden="true" className="size-[18px] shrink-0 text-primary motion-safe:animate-spin" />
      ) : (
        <GoogleIcon className="size-[18px] shrink-0" />
      )}
      <span>{etiqueta}</span>
    </>
  );
}

export function GoogleAuthButton({ etiqueta, isLoading, onClick, overlay }: GoogleAuthButtonProps) {
  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className={cn(CLASES, "cursor-wait text-[#5b6475]")}>
        <Contenido etiqueta={etiqueta} isLoading />
      </div>
    );
  }

  // Modo real (overlay): el visual no es focuseable, el interactivo es GIS.
  if (overlay) {
    return (
      <span className="group relative block w-full">
        <span aria-hidden="true" className={cn(CLASES, "group-hover:border-dark")}>
          <Contenido etiqueta={etiqueta} isLoading={false} />
        </span>
        <span className="sr-only">Al activar, Google mostrará el selector de cuenta para iniciar sesión</span>
        {overlay}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        CLASES,
        "cursor-pointer hover:border-dark focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary",
      )}
    >
      <Contenido etiqueta={etiqueta} isLoading={false} />
    </button>
  );
}
