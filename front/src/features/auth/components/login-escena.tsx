import type { ReactNode } from "react";
import { FUENTE_DE_TITULARES } from "@/components/marca/fuente-de-titulares";

// La misma foto de la portada pública, en blanco y negro con la franja magenta de la marca: el login
// se siente parte del sitio del que se viene. Colores fijos: no sigue el tema claro/oscuro del sistema.
// En el celular la tarjeta queda abajo, como hoja, para que el botón caiga donde llega el pulgar.
export function LoginEscena({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-dark font-sans text-dark">
      <link rel="stylesheet" href={FUENTE_DE_TITULARES} precedence="default" />
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <img
          src="/portada-publica.jpg"
          alt=""
          width={2200}
          height={1468}
          decoding="async"
          draggable={false}
          className="absolute inset-0 size-full object-cover object-[84%_20%] opacity-70 contrast-105 grayscale md:object-[60%_40%]"
        />
        <div className="absolute inset-0 bg-primary mix-blend-multiply [clip-path:polygon(58%_0,100%_0,100%_100%,38%_100%)] motion-safe:animate-login-franja" />
        <div className="absolute inset-0 bg-dark/35" />
      </div>
      <main className="flex min-h-dvh items-end justify-center md:items-center md:p-8">{children}</main>
    </div>
  );
}
