import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  Banknote,
  CalendarDays,
  Dumbbell,
  ShieldCheck,
  Tag,
  UserRound,
  Users,
  UserX,
} from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { RoleCode } from "@/types/auth";

const ETIQUETAS_ROL: Record<RoleCode, string> = {
  PROPIETARIA: "Propietaria",
  PROFESORA: "Profesora",
  ALUMNO: "Alumno/a",
  TUTOR: "Tutor/a",
};

const ACCESOS = [
  {
    to: "/app/actividades",
    titulo: "Actividades",
    descripcion: "Disciplinas, modalidades y cupos del centro.",
    icono: Dumbbell,
  },
  {
    to: "/app/horarios",
    titulo: "Horarios",
    descripcion: "Cronograma semanal de clases con profesoras.",
    icono: CalendarDays,
  },
  {
    to: "/app/alumnos/listado",
    titulo: "Alumnos",
    descripcion: "Listado completo de alumnos y fichas personales.",
    icono: Users,
  },
  {
    to: "/app/pagos/cuotas",
    titulo: "Estado de cuotas",
    descripcion: "Supervisar vencimientos de cuotas y registrar cobros.",
    icono: Banknote,
  },
  {
    to: "/app/pagos/transferencias",
    titulo: "Transferencias pendientes",
    descripcion: "Verificar en el extracto y conciliar transferencias.",
    icono: ArrowLeftRight,
  },
  {
    to: "/app/ausentes",
    titulo: "Ausentes",
    descripcion: "Detección y seguimiento de alumnos ausentes.",
    icono: UserX,
  },
  {
    to: "/app/planes",
    titulo: "Planes y Precios",
    descripcion: "Configuración de planes, valores y promociones.",
    icono: Tag,
  },
];

export function OwnerDashboardPage() {
  const { user } = useAuth();
  const nombre = user ? `${user.nombre} ${user.apellido}`.trim() : "Propietaria";
  const roles = user?.roles ?? [];
  const cantidadPermisos = user?.permisos.length ?? 0;

  return (
    <OwnerLayout>
      <section aria-labelledby="dashboard-titulo" className="flex w-full flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 id="dashboard-titulo" className="text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-white">
            Hola, {nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            Este es el resumen de tu sesión y los accesos directos a tu centro.
          </p>
        </header>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl border-border bg-white shadow-sm dark:bg-surface-low">
            <CardContent className="flex items-start gap-3 p-4">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-dark dark:bg-primary/20 dark:text-pink-300"
              >
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Tu sesión</h2>
                <p className="truncate text-sm text-muted-foreground">{user?.email ?? "Sin correo"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {roles.map((rol) => (
                    <Badge
                      key={rol}
                      variant="outline"
                      className="rounded-full border-0 bg-[#FDF2F7] px-2.5 py-1 text-sm font-bold text-primary-dark dark:bg-primary/20 dark:text-pink-300"
                    >
                      {ETIQUETAS_ROL[rol]}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border bg-white shadow-sm dark:bg-surface-low">
            <CardContent className="flex items-start gap-3 p-4">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-dark dark:bg-primary/20 dark:text-pink-300"
              >
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Permisos activos</h2>
                <p className="text-sm text-muted-foreground">
                  Tenés <strong className="font-bold text-foreground">{cantidadPermisos}</strong>{" "}
                  permisos habilitados en tu sesión.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Accesos directos
          </h2>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACCESOS.map(({ to, titulo, descripcion, icono: Icono }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-[#FDF2F7]/40 dark:bg-surface-low dark:hover:border-primary/50 dark:hover:bg-primary/10"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors group-hover:bg-primary-dark"
                >
                  <Icono className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-bold text-slate-900 dark:text-white">{titulo}</span>
                  <span className="block text-sm text-muted-foreground">{descripcion}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </OwnerLayout>
  );
}
