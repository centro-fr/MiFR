import { useState } from "react";
import { AlertCircle, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inicialesDe } from "@/features/alumnos/utils/formato-ficha";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";
import type { CobroSinRendir, TotalDeProfesora } from "../schemas/rendicion";

interface Props {
  profesora: TotalDeProfesora;
  cobros: CobroSinRendir[];
  onRendirLote: (profesora: TotalDeProfesora) => void;
  onRendirIndividual: (cobro: CobroSinRendir) => void;
  abiertoPorDefecto?: boolean;
}

function formatearFechaCorta(fechaIso: string): string {
  const d = new Date(fechaIso);
  if (isNaN(d.getTime())) return "—";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

export function AcordeonProfesoraRendicion({
  profesora,
  cobros,
  onRendirLote,
  onRendirIndividual,
  abiertoPorDefecto = false,
}: Props) {
  const [expandido, setExpandido] = useState(abiertoPorDefecto);
  const nombreCompleto = `${profesora.nombre} ${profesora.apellido}`.trim() || "Profesora";

  const tieneCobrosAtrasados = cobros.some((c) => c.dias_sin_rendir >= 15);

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      {/* Cabecera del acordeón */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpandido(!expandido)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if ((e.target as HTMLElement).tagName !== "BUTTON") {
              e.preventDefault();
              setExpandido(!expandido);
            }
          }
        }}
        aria-expanded={expandido}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 cursor-pointer select-none transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30 group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary transition-transform group-hover:scale-105 dark:bg-pink-950/60 dark:text-pink-300">
            {inicialesDe(profesora.nombre, profesora.apellido)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                {nombreCompleto}
              </h3>
              {tieneCobrosAtrasados && (
                <span
                  title="Tiene cobros con más de 15 días sin rendir"
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                >
                  <AlertCircle className="size-3 text-amber-600 dark:text-amber-400" />
                  <span>+15 días</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profesora.cantidad === 1 ? "1 cobro en mano" : `${profesora.cantidad} cobros en mano`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="text-left sm:text-right">
            <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Total retenido
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {formatearPrecio(profesora.total)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRendirLote(profesora);
              }}
              aria-label={`Rendir todo el efectivo de ${nombreCompleto}`}
              className="h-9 rounded-xl bg-primary px-3 text-xs font-bold text-white shadow-2xs hover:bg-primary-dark"
            >
              Rendir todo
            </Button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandido(!expandido);
              }}
              aria-expanded={expandido}
              aria-label={expandido ? `Ocultar cobros de ${nombreCompleto}` : `Ver cobros de ${nombreCompleto}`}
              className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <ChevronDown
                className={cn(
                  "size-5 transition-transform duration-200",
                  expandido && "rotate-180"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido colapsable */}
      {expandido && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/20 p-3 sm:p-5">
          {cobros.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              No hay cobros pendientes de rendición para esta profesora.
            </p>
          ) : (
            <>
              {/* Tabla Desktop */}
              <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs xl:block dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-white font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Alumno
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Plan
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Fecha cobro
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Sin rendir
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Monto
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {cobros.map((cobro) => {
                      const dias = cobro.dias_sin_rendir;
                      const esAtrasado = dias >= 15;
                      return (
                        <tr
                          key={cobro.id_pago}
                          className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {cobro.alumno.nombre} {cobro.alumno.apellido}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                            {cobro.plan}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-medium">
                            {formatearFechaCorta(cobro.fecha_pago)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                                esAtrasado
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              )}
                            >
                              <Clock className="size-3" />
                              <span>{dias === 0 ? "Hoy" : `${dias} d`}</span>
                            </span>
                          </td>
                          <td className="px-3 py-3 font-extrabold text-slate-900 dark:text-white">
                            {formatearPrecio(cobro.monto)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onRendirIndividual(cobro)}
                              aria-label={`Rendir cobro de ${cobro.alumno.nombre} ${cobro.alumno.apellido}`}
                              className="h-7 rounded-lg border-slate-200 text-xs font-semibold hover:text-primary dark:border-slate-700"
                            >
                              Rendir
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas Mobile */}
              <div className="grid gap-2.5 xl:hidden">
                {cobros.map((cobro) => {
                  const dias = cobro.dias_sin_rendir;
                  const esAtrasado = dias >= 15;
                  return (
                    <div
                      key={cobro.id_pago}
                      className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white truncate flex-1 min-w-0">
                          {cobro.alumno.nombre} {cobro.alumno.apellido}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0",
                            esAtrasado
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          )}
                        >
                          <Clock className="size-2.5" />
                          <span>{dias === 0 ? "Hoy" : `Hace ${dias} d`}</span>
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>{cobro.plan}</span>
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {formatearPrecio(cobro.monto)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400">
                          Cobrado: {formatearFechaCorta(cobro.fecha_pago)}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onRendirIndividual(cobro)}
                          aria-label={`Rendir cobro de ${cobro.alumno.nombre} ${cobro.alumno.apellido}`}
                          className="h-7 rounded-lg text-xs font-bold hover:text-primary"
                        >
                          Rendir
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
