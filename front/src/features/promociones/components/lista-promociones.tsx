import { CalendarDays, Pencil, Power, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Promocion } from "@/types/promocion";
import { cn } from "@/utils/cn";

const ESTADOS: Record<Promocion["estado"], string> = {
  ACTIVA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  PROGRAMADA: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  VENCIDA: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  DESACTIVADA: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

function descuento(promocion: Promocion): string {
  return promocion.tipoDescuento === "PORCENTAJE" ? `${promocion.valor}% OFF` : `$${promocion.valor.toLocaleString("es-AR")} OFF`;
}

export function ListaPromociones({
  promociones,
  onEditar,
  onDesactivar,
}: {
  promociones: Promocion[];
  onEditar: (promocion: Promocion) => void;
  onDesactivar: (promocion: Promocion) => void;
}) {
  return (
    <ul aria-label="Promociones" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
      {promociones.map((promocion) => (
        <li key={promocion.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-primary dark:bg-pink-950/50 dark:text-pink-300"><Tag className="size-4" /></span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold tracking-tight text-slate-900 dark:text-white">{promocion.nombre}</h2>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{promocion.codigo}</p>
              </div>
            </div>
            <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold", ESTADOS[promocion.estado])}>{promocion.estado.toLowerCase()}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-xs sm:text-sm dark:border-slate-800">
            <Dato label="Descuento" valor={descuento(promocion)} destacado />
            <Dato label="Vigencia" valor={`${promocion.fechaDesde.slice(0, 10)} al ${promocion.fechaHasta.slice(0, 10)}`} icono={<CalendarDays className="size-3.5" />} />
            <Dato label="Planes" valor={promocion.planes.map((plan) => plan.nombre).join(", ")} />
          </div>
          {(promocion.estado === "ACTIVA" || promocion.estado === "PROGRAMADA") && (
            <div className="flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => onEditar(promocion)} className="h-10 flex-1 rounded-xl font-bold text-xs sm:text-sm"><Pencil className="mr-1.5 size-3.5" />Editar</Button>
              <Button type="button" variant="outline" onClick={() => onDesactivar(promocion)} className="h-10 rounded-xl font-bold text-xs sm:text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300"><Power className="mr-1.5 size-3.5" />Desactivar</Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Dato({ label, valor, destacado, icono }: { label: string; valor: string; destacado?: boolean; icono?: React.ReactNode }) {
  return <div className="min-w-0"><span className="block text-xs font-semibold text-muted-foreground">{label}</span><span className={cn("mt-1 flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200", destacado && "text-primary dark:text-pink-300")}>{icono}{valor}</span></div>;
}
