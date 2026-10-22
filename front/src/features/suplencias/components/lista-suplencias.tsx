import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Suplencia } from "@/types/suplencia";
import { cn } from "@/utils/cn";

export function ListaSuplencias({ suplencias, onEditar, onEliminar }: { suplencias: Suplencia[]; onEditar: (suplencia: Suplencia) => void; onEliminar: (suplencia: Suplencia) => void }) {
  return (
    <ul aria-label="Suplencias registradas" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {suplencias.map((suplencia) => (
        <li key={suplencia.idClase} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><CalendarDays className="size-3.5" />{suplencia.fechaClase.slice(0, 10)}</p>
              <h2 className="mt-1 truncate text-lg font-black tracking-tight text-slate-900 dark:text-white">{suplencia.actividad.nombre}</h2>
              <p className="text-sm font-semibold text-muted-foreground">{suplencia.horaInicio} a {suplencia.horaFin} hs</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", suplencia.estadoClase === "CANCELADA" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>{suplencia.estadoClase === "CANCELADA" ? "Cancelada" : "Activa"}</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 border-y border-slate-100 py-3 text-sm dark:border-slate-800 sm:grid-cols-2">
            <Dato label="Titular ausente" valor={`${suplencia.titular.nombre} ${suplencia.titular.apellido}`} />
            <Dato label="Profesora suplente" valor={`${suplencia.suplente.nombre} ${suplencia.suplente.apellido}`} destacado />
            {suplencia.motivo && <Dato label="Motivo" valor={suplencia.motivo} />}
          </div>
          {suplencia.estadoClase !== "CANCELADA" && (
            <div className="mt-3 flex gap-3">
              <Button type="button" variant="outline" onClick={() => onEditar(suplencia)} className="h-11 flex-1 rounded-xl font-bold"><Pencil className="mr-2 size-4" />Editar</Button>
              <Button type="button" variant="outline" onClick={() => onEliminar(suplencia)} className="h-11 rounded-xl font-bold text-rose-600 hover:bg-rose-50"><Trash2 className="mr-2 size-4" />Eliminar</Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Dato({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return <div><span className="block text-xs font-semibold text-muted-foreground">{label}</span><span className={cn("font-bold text-slate-700 dark:text-slate-200", destacado && "text-primary dark:text-pink-300")}>{valor}</span></div>;
}
