import { Link, Navigate } from "react-router-dom";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { useContadoresMenu } from "@/components/layout/use-contadores-menu";
import { useOwnerNavigation, type ItemConEstado, type SubItemConEstado } from "@/components/layout/use-owner-navigation";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";

function TarjetaOpcion({ opcion, iconoDelGrupo }: { opcion: SubItemConEstado; iconoDelGrupo: ItemConEstado["icono"] }) {
  const Icono = opcion.icono ?? iconoDelGrupo;
  return (
    <li>
      <Link
        to={opcion.to}
        className="group flex h-full items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-[#FDF2F7]/40 focus-visible:outline-2 focus-visible:outline-primary dark:bg-surface-low dark:hover:border-primary/50 dark:hover:bg-primary/10"
      >
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors group-hover:bg-primary-dark"
        >
          <Icono className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-slate-900 dark:text-white">{opcion.etiqueta}</span>
          {opcion.descripcion && <span className="block text-sm text-muted-foreground">{opcion.descripcion}</span>}
        </span>
        {opcion.contador ? (
          <span className="shrink-0 rounded-full bg-amber-400 px-2 text-sm leading-6 font-bold text-amber-950">
            {opcion.contador}
            <span className="sr-only">{opcion.contador === 1 ? " pendiente" : " pendientes"}</span>
          </span>
        ) : null}
      </Link>
    </li>
  );
}

interface Props {
  /** La ruta del grupo en el menú (owner-navigation.ts). */
  ruta: string;
  /** Adónde va quien no tiene ese grupo en su menú: la profesora no tiene el grupo Alumnos y entra al listado. */
  alternativa: string;
}

/**
 * Pantalla de un grupo del menú: sus sub-opciones como tarjetas, otra forma de llegar a ellas además
 * del menú lateral. Sale del mismo menú, así que agregar una sub-opción la suma también acá.
 */
export function GrupoMenuPage({ ruta, alternativa }: Props) {
  const { roles } = usePermissions();
  const { items } = useOwnerNavigation(useContadoresMenu(), roles);
  const grupo = items.find((item) => item.to === ruta && item.hijos);
  if (!grupo?.hijos) return <Navigate to={alternativa} replace />;

  return (
    <OwnerLayout>
      <header>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">{grupo.etiqueta}</h1>
        {grupo.descripcion && <p className="mt-1.5 text-sm font-medium text-muted-foreground">{grupo.descripcion}</p>}
      </header>
      <ul aria-label={`Opciones de ${grupo.etiqueta}`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {grupo.hijos.map((opcion) => (
          <TarjetaOpcion key={opcion.to} opcion={opcion} iconoDelGrupo={grupo.icono} />
        ))}
      </ul>
    </OwnerLayout>
  );
}
