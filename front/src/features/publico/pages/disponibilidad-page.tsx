import { createElement } from "react";
import { CalendarDays, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ACTIVIDADES_DEL_CENTRO, type ActividadDelCentro } from "@/features/publico/utils/actividades-del-centro";
import { diasAbreviados, iconoDeActividad } from "@/features/publico/utils/actividades";
import { enlacesDeContacto } from "@/features/publico/utils/contacto";
import { LogoFr } from "@/components/marca/logo-fr";
import { NOMBRE_DEL_CENTRO } from "@/features/publico/components/marca-centro";
import { urlDelSitio } from "@/features/publico/utils/sitio";
import { useTituloDelDocumento } from "@/hooks/use-titulo-del-documento";

function TarjetaDisponibilidad({ actividad }: { actividad: ActividadDelCentro }) {
  return (
    <li className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          {createElement(iconoDeActividad(actividad.nombre), { className: "size-6" })}
        </span>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary-dark dark:text-pink-200">
          {actividad.modalidad === "PERSONALIZADA" ? "Personalizada" : "Grupal"}
        </span>
      </div>

      <div>
        <h2 className="text-xl font-black tracking-tight text-foreground">{actividad.nombre}</h2>
        {actividad.descripcion && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{actividad.descripcion}</p>
        )}
      </div>

      <div className="mt-auto space-y-3 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CalendarDays aria-hidden="true" className="size-4 text-primary" />
          <span>{diasAbreviados(actividad.dias)}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {actividad.horariosPorSemana}{" "}
          {actividad.horariosPorSemana === 1 ? "horario disponible por semana" : "horarios disponibles por semana"}
        </p>
      </div>
    </li>
  );
}

export function DisponibilidadPage() {
  const { whatsapp } = enlacesDeContacto();
  const sitio = urlDelSitio();
  useTituloDelDocumento(`Disponibilidad y horarios · ${NOMBRE_DEL_CENTRO}`);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {sitio && <link rel="canonical" href={`${sitio}/disponibilidad`} />}
      <header className="border-b border-border bg-background/90">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
            <LogoFr />
            <span className="hidden text-base font-extrabold sm:block">{NOMBRE_DEL_CENTRO}</span>
          </Link>
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 lg:py-14">
        <section aria-labelledby="titulo-disponibilidad" className="mb-10 max-w-3xl">
          <p className="text-sm font-extrabold uppercase tracking-widest text-primary">Entrená con nosotros</p>
          <h1 id="titulo-disponibilidad" className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Disponibilidad y horarios
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Conocé las actividades vigentes y los días en que podés encontrarlas. Escribinos para consultar
            cupos, horarios exactos y elegir la mejor opción para vos.
          </p>
        </section>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVIDADES_DEL_CENTRO.map((actividad) => (
            <TarjetaDisponibilidad key={actividad.nombre} actividad={actividad} />
          ))}
        </ul>

        {whatsapp && (
          <section className="mt-10 flex flex-col gap-5 rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-[#3b0a24] p-6 text-white shadow-brand-glow sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-widest text-pink-100">¿Querés empezar?</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Consultá por tu lugar</h2>
              <p className="mt-2 text-sm text-pink-50">Te ayudamos a encontrar el horario ideal.</p>
            </div>
            <Button asChild className="h-12 rounded-xl bg-white px-6 font-bold text-primary-dark hover:bg-pink-50">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                Escribinos por WhatsApp
              </a>
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}
