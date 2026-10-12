import { useState } from "react";
import { CalendarX2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisponibilidad } from "@/features/publico/hooks/use-disponibilidad";
import type { HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import { agruparPorDia, DIAS_DEL_CENTRO, diaInicial } from "@/features/publico/utils/tablero";
import { cn } from "@/utils/cn";
import { TarjetaHorarioPublico } from "./tarjeta-horario-publico";

function ClasesDelDia({ horarios }: { horarios: HorarioPublico[] }) {
  if (horarios.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Sin clases.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {horarios.map((horario) => (
        <li key={horario.id_horario}>
          <TarjetaHorarioPublico horario={horario} />
        </li>
      ))}
    </ul>
  );
}

// En el celular se ve un día por vez (empieza en el de hoy); desde lg, la semana entera.
function Semana({ horarios }: { horarios: HorarioPublico[] }) {
  const [diaElegido, setDiaElegido] = useState(() => diaInicial(new Date()));
  const porDia = agruparPorDia(horarios);
  const elegido = DIAS_DEL_CENTRO.find(({ numero }) => numero === diaElegido) ?? DIAS_DEL_CENTRO[0];

  return (
    <>
      <div className="lg:hidden">
        <div role="group" aria-label="Elegí el día" className="grid grid-cols-6 gap-1.5">
          {DIAS_DEL_CENTRO.map(({ numero, nombre, corto }) => (
            <button
              key={numero}
              type="button"
              aria-pressed={numero === diaElegido}
              aria-label={nombre}
              onClick={() => setDiaElegido(numero)}
              className={cn(
                "min-h-[44px] rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                numero === diaElegido
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
              )}
            >
              {corto}
            </button>
          ))}
        </div>
        <h3 className="mb-3 mt-5 text-lg font-extrabold text-foreground">{elegido.nombre}</h3>
        <ClasesDelDia horarios={porDia.get(elegido.numero) ?? []} />
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-6">
        {DIAS_DEL_CENTRO.map(({ numero, nombre }) => (
          <section key={numero} aria-label={nombre} className="flex min-w-0 flex-col gap-3">
            <h3 className="border-b-2 border-primary pb-2 text-base font-extrabold text-foreground">{nombre}</h3>
            <ClasesDelDia horarios={porDia.get(numero) ?? []} />
          </section>
        ))}
      </div>
    </>
  );
}

function Cargando() {
  return (
    <div role="status" aria-label="Cargando los horarios" className="grid gap-4 lg:grid-cols-6">
      {DIAS_DEL_CENTRO.map(({ numero }) => (
        <div key={numero} className={cn("flex flex-col gap-3", numero > 1 && "hidden lg:flex")}>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function Aviso({ icono, titulo, children }: { icono: React.ReactNode; titulo: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-10 text-center">
      <span aria-hidden="true" className="text-muted-foreground [&_svg]:size-10">
        {icono}
      </span>
      <p className="text-base font-bold text-foreground">{titulo}</p>
      {children}
    </div>
  );
}

function Contenido() {
  const { data, isPending, isError, refetch, isFetching } = useDisponibilidad();

  if (isPending) return <Cargando />;
  if (isError) {
    return (
      <Aviso icono={<WifiOff />} titulo="No pudimos cargar los horarios.">
        <Button variant="outline" className="rounded-xl font-bold" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw aria-hidden="true" className={cn(isFetching && "animate-spin")} />
          Reintentar
        </Button>
      </Aviso>
    );
  }
  if (data.horarios.length === 0) {
    return (
      <Aviso icono={<CalendarX2 />} titulo="Todavía no hay clases publicadas.">
        <p className="text-sm text-muted-foreground">Volvé a mirar en unos días.</p>
      </Aviso>
    );
  }
  return <Semana horarios={data.horarios} />;
}

export function TableroHorarios() {
  return (
    <section id="horarios" aria-labelledby="titulo-horarios" className="scroll-mt-20 bg-secondary/40 py-12">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-2">
          <h2 id="titulo-horarios" className="text-3xl font-extrabold tracking-tight text-foreground">
            Horarios de la semana
          </h2>
          <p className="max-w-prose text-base text-muted-foreground">
            Los lugares libres se actualizan solos. Para anotarte, acercate al centro o consultá con tu profesora.
          </p>
        </div>
        <Contenido />
      </div>
    </section>
  );
}
