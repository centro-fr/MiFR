import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogoFr } from "@/components/marca/logo-fr";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { animarEntradaDelEncabezado } from "@/features/publico/animaciones/animaciones-publicas";
import { useAnimacion } from "@/features/publico/animaciones/use-animacion";
import { enlacesDeContacto } from "@/features/publico/utils/contacto";
import { homePathForRoles } from "@/types/auth";
import { cn } from "@/utils/cn";
import { CONTENEDOR_PUBLICO } from "./estilos-publicos";
import { NOMBRE_DEL_CENTRO } from "./marca-centro";

const ACCESO = "inline-flex h-11 items-center text-sm font-bold text-white transition-colors duration-150 ease-fuerte hover:text-primary";

const SUBRAYADO_AL_PASAR =
  "bg-[linear-gradient(var(--color-primary),var(--color-primary))] bg-size-[0_2px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size,color] duration-200 ease-fuerte hover:bg-size-[100%_2px] hover:text-white";

// Con sesión iniciada, el mismo enlace lleva al panel en lugar de volver a pedir el login.
function AccesoAlSistema() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div aria-hidden="true" className="h-11 w-20" />;

  return (
    <Link to={user ? homePathForRoles(user.roles) : "/login"} className={ACCESO}>
      Ir a MiFR
    </Link>
  );
}

// La sección de contacto no aparece sin datos de contacto: el menú no lleva a un ancla vacía.
function useEnlacesDeSecciones() {
  const { whatsapp, instagram } = enlacesDeContacto();
  const hayContacto = Boolean(whatsapp || instagram);

  return [
    { href: "#actividades", texto: "Actividades" },
    { href: "#ubicacion", texto: "Ubicación" },
    hayContacto && { href: "#contacto", texto: "Contacto" },
  ].filter((enlace) => enlace !== false);
}

const ALTURA_DEL_ENCABEZADO_PX = 80;

// Sobre la foto de la portada va transparente; al bajar toma el fondo oscuro para seguir legible.
function useConFondo() {
  const [conFondo, setConFondo] = useState(false);

  useEffect(() => {
    const actualizar = () => setConFondo(window.scrollY > ALTURA_DEL_ENCABEZADO_PX);
    actualizar();
    window.addEventListener("scroll", actualizar, { passive: true });
    return () => window.removeEventListener("scroll", actualizar);
  }, []);

  return conFondo;
}

// Fijo arriba. En mobile el menú se oculta: las secciones se recorren bajando.
export function EncabezadoPublico() {
  const raiz = useRef<HTMLElement>(null);
  const enlaces = useEnlacesDeSecciones();
  const conFondo = useConFondo();
  useAnimacion(raiz, animarEntradaDelEncabezado);

  return (
    <header
      ref={raiz}
      className={cn(
        "fixed inset-x-0 top-0 z-20 transition-[background-color,box-shadow] duration-300 ease-fuerte",
        conFondo && "bg-publico-tinta shadow-[0_1px_0_var(--color-publico-borde)]",
      )}
    >
      <div className={`${CONTENEDOR_PUBLICO} flex h-20 items-center justify-between gap-6`}>
        <a href="#inicio" aria-label={NOMBRE_DEL_CENTRO} className="flex items-center gap-2.5 text-[15px] leading-tight font-extrabold">
          <LogoFr className="size-[34px] shrink-0" />
          <span>Centro de Entrenamiento</span>
        </a>
        <nav aria-label="Secciones" className="hidden gap-8 text-sm font-semibold text-publico-texto-claro md:flex">
          {enlaces.map(({ href, texto }) => (
            <a key={href} href={href} className={SUBRAYADO_AL_PASAR}>
              {texto}
            </a>
          ))}
        </nav>
        <AccesoAlSistema />
      </div>
    </header>
  );
}
