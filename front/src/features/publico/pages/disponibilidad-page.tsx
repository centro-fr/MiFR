import { createElement } from "react";
import { AlertCircle, CalendarDays, Dumbbell, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useActividadesPublicas } from "@/features/publico/hooks/use-actividades-publicas";
import type { ActividadPublica } from "@/features/publico/schemas/actividades";
import { diasAbreviados, iconoDeActividad } from "@/features/publico/utils/actividades";
import { enlacesDeContacto } from "@/features/publico/utils/contacto";
import { LogoFr } from "@/components/marca/logo-fr";
import { NOMBRE_DEL_CENTRO } from "@/features/publico/components/marca-centro";

function TarjetaDisponibilidad({ actividad }: { actividad: ActividadPublica }) {
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
          {actividad.clases_por_semana}{" "}
          {actividad.clases_por_semana === 1 ? "horario disponible por semana" : "horarios disponibles por semana"}
        </p>
      </div>
    </li>
  );
}

export function DisponibilidadPage() {
  const { data, isPending, isError, refetch, isFetching } = useActividadesPublicas();
  const { whatsapp } = enlacesDeContacto();
  const actividades = data?.actividades ?? [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
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

        {isPending ? (
          <div role="status" aria-label="Cargando disponibilidad" className="flex min-h-56 items-center justify-center gap-2">
            <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
            <span className="text-sm font-semibold text-muted-foreground">Cargando disponibilidad...</span>
          </div>
        ) : isError ? (
          <section className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card px-5 py-12 text-center">
            <div>
              <h2 className="text-lg font-extrabold">No pudimos cargar la disponibilidad</h2>
              <p role="alert" className="mt-1 text-sm text-muted-foreground">
                Revisá tu conexión e intentá nuevamente.
              </p>
            </div>
            <Button type="button" onClick={() => refetch()} disabled={isFetching} className="rounded-xl font-bold">
              <RefreshCw aria-hidden="true" className={isFetching ? "animate-spin" : undefined} />
              Reintentar
            </Button>
          </section>
        ) : actividades.length === 0 ? (
          <section className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card px-5 py-12 text-center">
            <h2 className="text-lg font-extrabold">No hay actividades disponibles</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              En este momento no hay horarios publicados. Volvé a consultar más tarde o escribinos para recibir
              novedades.
            </p>
          </section>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actividades.map((actividad) => (
              <TarjetaDisponibilidad key={actividad.id_actividad} actividad={actividad} />
            ))}
          </ul>
        )}

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
