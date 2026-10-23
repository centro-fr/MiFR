import { OwnerLayout } from "@/components/layout/owner-layout";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ResumenDelDia } from "@/features/notificaciones/components/resumen-del-dia";

export function OwnerDashboardPage() {
  const { user } = useAuth();
  const nombre = user ? `${user.nombre} ${user.apellido}`.trim() : "Propietaria";

  return (
    <OwnerLayout>
      <section aria-labelledby="dashboard-titulo" className="flex w-full flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 id="dashboard-titulo" className="text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-white">
            Hola, {nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            Este es el resumen operativo y estado general de tu centro.
          </p>
        </header>

        {/* US-26: el dashboard es solo de la propietaria (menú de owner-navigation.ts), como el resumen. */}
        <ResumenDelDia />
      </section>
    </OwnerLayout>
  );
}

