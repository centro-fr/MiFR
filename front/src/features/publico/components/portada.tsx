import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogoCentro, NOMBRE_DEL_CENTRO } from "./marca-centro";

// La foto se publica dejando el archivo en front/public/centro.webp. Mientras no exista, el espacio
// muestra la marca: el 404 (o el index.html que devuelve el hosting) dispara onError.
const FOTO_DEL_CENTRO = "/centro.webp";

function FotoDelCentro() {
  const [sinFoto, setSinFoto] = useState(false);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-dark shadow-xl ring-1 ring-border">
      {sinFoto ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-dark via-[#2a1630] to-primary-dark">
          <LogoCentro className="size-28 rounded-3xl shadow-brand-glow sm:size-36" />
        </div>
      ) : (
        <img
          src={FOTO_DEL_CENTRO}
          alt={`Sala de entrenamiento de ${NOMBRE_DEL_CENTRO}`}
          width={1200}
          height={900}
          fetchPriority="high"
          onError={() => setSinFoto(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export function Portada() {
  return (
    <section id="inicio" aria-labelledby="titulo-portada" className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:py-16">
        <div className="flex flex-col gap-5">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">{NOMBRE_DEL_CENTRO}</p>
          <h1
            id="titulo-portada"
            className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
          >
            Encontrá tu clase y{" "}
            <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              sumate a entrenar.
            </span>
          </h1>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
            Mirá los horarios de la semana y los lugares que quedan en cada clase. Si ya entrenás en el centro,
            iniciá sesión para ver tu plan.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-xl px-6 text-base font-bold hover:bg-primary-dark">
              <a href="#horarios">
                <CalendarDays aria-hidden="true" />
                Ver horarios
              </a>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-xl px-6 text-base font-bold">
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </div>
        </div>
        <FotoDelCentro />
      </div>
    </section>
  );
}
