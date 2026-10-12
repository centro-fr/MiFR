import { OwnerLayout } from "@/components/layout/owner-layout";

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
  return <InicioProvisorio titulo="Inicio" descripcion="Acá vas a ver el estado de tu plan y tus próximas clases." />;
}
