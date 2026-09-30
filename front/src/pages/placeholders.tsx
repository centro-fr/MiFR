import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";

function PlaceholderShell({ title, body }: { title: string; body: string }) {
  const { user, logout } = useAuth();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col gap-4 px-4 py-10 text-slate-100">
      <p className="text-xs uppercase tracking-wider text-slate-400">MiFR · Vista temporal US-01</p>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="max-w-prose text-sm text-slate-300">{body}</p>
      {user && (
        <p className="text-sm text-slate-400">
          Sesión: {user.nombre} {user.apellido} · {user.roles.join(" + ")}
        </p>
      )}
      <div>
        <Button onClick={() => void logout()} className="bg-primary text-white hover:bg-primary-dark">
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}

export function OwnerDashboardPage() {
  return <PlaceholderShell title="Dashboard" body="Redirección de Propietaria verificada. El dashboard completo llega en pantallas posteriores." />;
}

export function TeacherHomePage() {
  return <PlaceholderShell title="Hoy" body="Redirección de Profesora verificada. Las clases del día llegan en la pantalla #16." />;
}

export function StudentHomePage() {
  return <PlaceholderShell title="Inicio" body="Redirección de Alumno verificada. El panel principal llega en la pantalla #22." />;
}

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas px-4 text-center text-slate-100">
      <h1 className="text-2xl font-extrabold">Página no encontrada</h1>
      <p className="text-sm text-slate-400">La ruta que buscás no existe.</p>
      <a href="/login" className="min-h-[44px] content-center text-sm font-bold text-primary hover:underline">
        Volver al inicio de sesión
      </a>
    </main>
  );
}
