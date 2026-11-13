import { Link } from "react-router-dom";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { AvisoDeCuota } from "@/features/notificaciones/components/aviso-de-cuota";

// Inicio provisorio de cada rol: ya muestra el menú del rol mientras su pantalla real no existe.
function InicioProvisorio({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <OwnerLayout>
      <section aria-labelledby="inicio-provisorio-titulo" className="flex flex-col gap-2">
        <h1 id="inicio-provisorio-titulo" className="text-2xl font-extrabold text-dark dark:text-white">
          {titulo}
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">{descripcion}</p>
      </section>
    </OwnerLayout>
  );
}

export function TeacherHomePage() {
  return (
    <InicioProvisorio
      titulo="Hoy"
      descripcion="Acá vas a ver tus clases del día. Mientras tanto, desde Alumnos podés buscar alumnos, pre-inscribirlos y editar sus datos."
    />
  );
}

export function StudentHomePage() {
  return (
    <OwnerLayout>
      <section aria-labelledby="inicio-provisorio-titulo" className="flex flex-col gap-5">
        <div>
          <h1 id="inicio-provisorio-titulo" className="text-2xl font-black text-dark dark:text-white">
            Panel de inicio
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground mt-1">
            Bienvenido/a al portal del alumno. Consultá el estado de tu cuota y los datos para transferir.
          </p>
        </div>

        <AvisoDeCuota />

        <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Mi plan y cuotas
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Consultá el estado de tu cuota y el CBU/Alias del centro para transferir.
            </p>
            <div className="mt-4">
              <Link
                to="/app/mi-plan"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 text-sm font-extrabold text-white shadow-md shadow-primary/20 hover:bg-primary-dark transition-colors"
              >
                Ver mi plan
              </Link>
            </div>
          </div>
        </div>
      </section>
    </OwnerLayout>
  );
}
