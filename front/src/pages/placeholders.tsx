import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";

function PlaceholderShell({ title, body }: { title: string; body: string }) {
  const { user, logout } = useAuth();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col gap-4 px-4 py-10 text-foreground">
      <p className="text-sm uppercase tracking-wider text-muted-foreground">MiFR · Vista temporal US-01</p>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="max-w-prose text-sm text-muted-foreground">{body}</p>
      {user && (
        <p className="text-sm text-muted-foreground">
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

export function TeacherHomePage() {
  return <PlaceholderShell title="Hoy" body="Redirección de Profesora verificada. Las clases del día llegan en la pantalla #16." />;
}

export function StudentHomePage() {
  return <PlaceholderShell title="Inicio" body="Redirección de Alumno verificada. El panel principal llega en la pantalla #22." />;
}

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center text-foreground">
      <h1 className="text-2xl font-extrabold">Página no encontrada</h1>
      <p className="text-sm text-muted-foreground">La ruta que buscás no existe.</p>
      <a href="/login" className="min-h-[44px] content-center text-sm font-bold text-primary hover:underline">
        Volver al inicio de sesión
      </a>
    </main>
  );
}
