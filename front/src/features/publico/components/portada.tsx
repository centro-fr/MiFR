import { useState } from "react";
import { ArrowRight, Dumbbell, MessageCircle } from "lucide-react";
import { LogoFr } from "@/components/marca/logo-fr";
import { Button } from "@/components/ui/button";
import { enlacesDeContacto } from "@/features/publico/utils/contacto";
import { NOMBRE_DEL_CENTRO } from "./marca-centro";

// La foto se publica dejando el archivo en front/public/centro.webp. Mientras no exista, el espacio
// muestra la marca: el 404 (o el index.html que devuelve el hosting) dispara onError.
const FOTO_DEL_CENTRO = "/centro.webp";

function FotoDelCentro() {
  const [sinFoto, setSinFoto] = useState(false);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-dark shadow-2xl ring-1 ring-border">
      {sinFoto ? (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(233,30,130,0.45),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(188,18,102,0.5),transparent_50%)]">
          <LogoFr className="size-28 drop-shadow-[0_20px_40px_rgba(233,30,130,0.45)] sm:size-40" />
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
  const { whatsapp } = enlacesDeContacto();

  return (
    <section
      id="inicio"
      aria-labelledby="titulo-portada"
      className="scroll-mt-20 bg-background text-foreground"
    >
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-14 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-20 lg:pt-16">
        <div className="flex animate-hero-enter flex-col gap-6">
          <h1
            id="titulo-portada"
            className="text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Entrená
            <br />
            con{" "}
            <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              energía.
            </span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            Elegí la actividad que más te guste y sumate a entrenar. Te esperamos.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-xl px-7 text-base font-bold shadow-brand-glow hover:bg-primary-dark">
              <a href="#actividades">
                <Dumbbell aria-hidden="true" />
                Ver actividades
              </a>
            </Button>
            {whatsapp && (
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-xl border-primary/40 px-7 text-base font-bold text-primary-dark hover:bg-primary/10 hover:text-primary-dark dark:text-pink-200"
              >
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" />
                  Quiero sumarme
                  <ArrowRight aria-hidden="true" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <FotoDelCentro />
      </div>
    </section>
  );
}
