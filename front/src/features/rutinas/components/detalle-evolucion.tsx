import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { GraficoEvolucion } from "@/features/rutinas/components/grafico-evolucion";
import { MEDIDAS } from "@/features/rutinas/schemas/medidas";
import {
  describirDiferencia,
  etiquetaDeMedida,
  evolucionPorMedida,
  formatearMedida,
  origenDeLaMedicion,
  resumenDeMedidas,
  serieDeLaMedida,
} from "@/features/rutinas/utils/formato-rutinas";
import type { Medicion } from "@/types/rutinas";
import { cn } from "@/utils/cn";

// Cómo se lee la evolución física: lo comparten la ficha (US-27) y la pantalla del alumno (US-28).

// Con muchas mediciones la lista se haría eterna: se ven las últimas y el resto a pedido.
const MEDICIONES_A_LA_VISTA = 5;

const BOTON_DE_TEXTO =
  "flex min-h-11 items-center gap-1.5 rounded-xl px-1 text-sm font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary";

/** Corregir y dar de baja: solo en la ficha (US-27) y con permiso; la pantalla del alumno no las tiene. */
export interface AccionesDeMedicion {
  onCorregir: (medicion: Medicion) => void;
  onDarDeBaja: (medicion: Medicion) => void;
}

function UltimosValores({ mediciones }: { mediciones: Medicion[] }) {
  const evolucion = useMemo(() => evolucionPorMedida(mediciones), [mediciones]);
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {evolucion.map((medida) => {
        const diferencia = describirDiferencia(medida);
        return (
          <div key={medida.codigo} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
            <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{etiquetaDeMedida(medida.codigo)}</dt>
            <dd className="text-lg font-extrabold text-slate-900 tabular-nums dark:text-white">{formatearMedida(medida.actual, medida.unidad)}</dd>
            {diferencia && <dd className="text-xs text-slate-600 dark:text-slate-300">{diferencia}</dd>}
          </div>
        );
      })}
    </dl>
  );
}

// El nombre accesible repite la fecha: en la lista hay un "Corregir" por medición.
function BotonesDeLaMedicion({ medicion, acciones }: { medicion: Medicion; acciones: AccionesDeMedicion }) {
  const dia = formatearFecha(medicion.fecha);
  return (
    <div className="-ml-1 flex flex-wrap gap-x-3">
      <button type="button" onClick={() => acciones.onCorregir(medicion)} aria-label={`Corregir la medición del ${dia}`} className={cn(BOTON_DE_TEXTO, "pointer-fine:min-h-8")}>
        <Pencil aria-hidden="true" className="size-4" />
        Corregir
      </button>
      <button
        type="button"
        onClick={() => acciones.onDarDeBaja(medicion)}
        aria-label={`Dar de baja la medición del ${dia}`}
        className={cn(BOTON_DE_TEXTO, "text-rose-700 pointer-fine:min-h-8 dark:text-rose-300")}
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Dar de baja
      </button>
    </div>
  );
}

interface PropsHistorial {
  mediciones: Medicion[];
  nombres: Map<number, string>;
  acciones?: AccionesDeMedicion;
}

function HistorialDeMediciones({ mediciones, nombres, acciones }: PropsHistorial) {
  const [verTodas, setVerTodas] = useState(false);
  const visibles = verTodas ? mediciones : mediciones.slice(0, MEDICIONES_A_LA_VISTA);
  return (
    <section aria-labelledby="titulo-historial-mediciones" className="flex flex-col gap-1">
      <h3 id="titulo-historial-mediciones" className="text-sm font-bold text-slate-800 dark:text-slate-200">
        Historial de mediciones
      </h3>
      <ol className="divide-y divide-slate-100 dark:divide-slate-800">
        {visibles.map((medicion) => {
          const origen = origenDeLaMedicion(medicion, nombres);
          return (
            <li key={medicion.id} className="py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-bold text-slate-900 tabular-nums dark:text-white">{formatearFecha(medicion.fecha)}</span>
                {origen && <span className="text-xs text-slate-500 dark:text-slate-400">{origen}</span>}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">{resumenDeMedidas(medicion.medidas)}</p>
              {medicion.observaciones && (
                <p className="text-sm whitespace-pre-line text-slate-500 dark:text-slate-400">{medicion.observaciones}</p>
              )}
              {acciones && <BotonesDeLaMedicion medicion={medicion} acciones={acciones} />}
            </li>
          );
        })}
      </ol>
      {mediciones.length > MEDICIONES_A_LA_VISTA && (
        <button
          type="button"
          onClick={() => setVerTodas((actual) => !actual)}
          className={cn(BOTON_DE_TEXTO, "self-start")}
        >
          {verTodas ? "Ver solo las últimas" : `Ver todas (${mediciones.length})`}
        </button>
      )}
    </section>
  );
}

interface PropsEvolucion {
  mediciones: Medicion[];
  nombresDeProfesoras: Map<number, string>;
  acciones?: AccionesDeMedicion;
}

/** Últimos valores, gráfico de peso (con dos mediciones o más) e historial. `mediciones` no puede venir vacía. */
export function Evolucion({ mediciones, nombresDeProfesoras, acciones }: PropsEvolucion) {
  const pesos = useMemo(() => serieDeLaMedida(mediciones, "PESO"), [mediciones]);
  return (
    <>
      <UltimosValores mediciones={mediciones} />
      {pesos.length >= 2 && (
        <section aria-labelledby="titulo-grafico-peso" className="flex flex-col gap-2">
          <h3 id="titulo-grafico-peso" className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Peso en el tiempo
          </h3>
          <GraficoEvolucion puntos={pesos} etiqueta={MEDIDAS.PESO.etiqueta} unidad={MEDIDAS.PESO.unidad} />
        </section>
      )}
      <HistorialDeMediciones mediciones={mediciones} nombres={nombresDeProfesoras} acciones={acciones} />
    </>
  );
}
