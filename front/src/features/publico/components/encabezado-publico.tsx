import { Link } from "react-router-dom";
import { LogoFr } from "@/components/marca/logo-fr";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useActividadesPublicas } from "@/features/publico/hooks/use-actividades-publicas";
import { enlacesDeContacto } from "@/features/publico/utils/contacto";
import { homePathForRoles } from "@/types/auth";
import { NOMBRE_DEL_CENTRO } from "./marca-centro";

const BOTON_ACCESO =
  "inline-flex h-[42px] items-center rounded-full border border-white/30 px-[18px] text-sm font-bold text-white transition-colors hover:bg-white/10";

// Con sesión iniciada, el mismo botón lleva al panel en lugar de volver a pedir el login.
function AccesoAlSistema() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div aria-hidden="true" className="h-[42px] w-32" />;

  return user ? (
    <Link to={homePathForRoles(user.roles)} className={BOTON_ACCESO}>
      Ir a mi panel
    </Link>
  ) : (
    <Link to="/login" className={BOTON_ACCESO}>
      Iniciar sesión
    </Link>
  );
}

// Las secciones de actividades y de contacto no aparecen si no hay datos: el menú no lleva a un ancla vacía.
function useEnlacesDeSecciones() {
  const { data } = useActividadesPublicas();
  const { whatsapp, instagram } = enlacesDeContacto();
  const hayActividades = (data?.actividades.length ?? 0) > 0;
  const hayContacto = Boolean(whatsapp || instagram);

  return [
    hayActividades && { href: "#actividades", texto: "Actividades" },
    { href: "#empezar", texto: "Cómo empezar" },
    { href: "#app", texto: "La app" },
    hayContacto && { href: "#contacto", texto: "Contacto" },
  ].filter((enlace) => enlace !== false);
}

// Va sobre la portada oscura y se va con el scroll. En mobile el menú se oculta: las secciones se
// recorren bajando.
export function EncabezadoPublico() {
  const enlaces = useEnlacesDeSecciones();

  return (
    <header className="absolute inset-x-0 top-0 z-10">
      <div className="mx-auto flex w-full max-w-[1288px] items-center justify-between gap-6 px-4 py-3.5 md:px-6 md:py-5">
        <a href="#inicio" className="flex min-w-0 items-center gap-3 rounded-xl">
          <LogoFr />
          <span className="hidden truncate text-base font-extrabold md:block">{NOMBRE_DEL_CENTRO}</span>
        </a>
        <nav aria-label="Secciones" className="hidden items-center gap-8 text-sm font-semibold text-publico-texto-claro lg:flex">
          {enlaces.map(({ href, texto }) => (
            <a key={href} href={href} className="transition-colors hover:text-white">
              {texto}
            </a>
          ))}
          <Link to="/disponibilidad" className="transition-colors hover:text-white">
            Disponibilidad
          </Link>
        </nav>
        <AccesoAlSistema />
      </div>
    </header>
  );
}
