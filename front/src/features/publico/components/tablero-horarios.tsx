import { CalendarX2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisponibilidad } from "@/features/publico/hooks/use-disponibilidad";
import { cn } from "@/utils/cn";
import { CronogramaPublicoDesktop } from "./cronograma-publico-desktop";
import { CronogramaPublicoMobile } from "./cronograma-publico-mobile";

function Cargando() {
  return (
    <div role="status" aria-label="Cargando los horarios" className="flex flex-col gap-3">
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
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
  return (
    <>
      <div className="lg:hidden">
        <CronogramaPublicoMobile horarios={data.horarios} />
      </div>
      <div className="hidden lg:block">
        <CronogramaPublicoDesktop horarios={data.horarios} />
      </div>
    </>
  );
}

export function TableroHorarios() {
  return (
    <section id="horarios" aria-labelledby="titulo-horarios" className="scroll-mt-20 py-12 lg:py-16">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-2">
          <h2 id="titulo-horarios" className="text-3xl font-extrabold tracking-tight text-foreground">
            Horarios
          </h2>
          <p className="max-w-prose text-base text-muted-foreground">
            Las clases de la semana y los lugares que quedan, al día. Para anotarte, acercate al centro o consultá
            con tu profesora.
          </p>
        </div>
        <Contenido />
      </div>
    </section>
  );
}
