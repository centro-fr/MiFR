import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEstadisticasInscripciones } from "@/features/reportes/hooks/use-reportes";
import type { AltasDelMes, FiltrosInscripciones } from "@/types/reportes";
import { cn } from "@/utils/cn";

// Las altas de cada mes contra las del mismo mes del año anterior, con los mismos filtros. Sirve para
// ver si el centro crece más o menos que el año pasado, no solo contra el mes anterior.

const TH = "px-4 py-3 text-left text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300";
const TD = "border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800/80";

function diferencia(valor: number): string {
  if (valor === 0) return "Igual";
  return `${valor > 0 ? "+" : "−"}${Math.abs(valor)}`;
}

function colorDe(valor: number): string {
  if (valor > 0) return "text-emerald-700 dark:text-emerald-300";
  if (valor < 0) return "text-rose-700 dark:text-rose-300";
  return "text-muted-foreground";
}

interface Props {
  filtros: FiltrosInscripciones;
  /** Los meses del año elegido que ya empezaron: se comparan solo esos. */
  transcurridos: AltasDelMes[];
}

export function ComparacionAnual({ filtros, transcurridos }: Props) {
  const anterior = filtros.anio - 1;
  const consulta = useEstadisticasInscripciones({ ...filtros, anio: anterior });
  const idTitulo = "titulo-comparacion-anual";

  if (consulta.isPending) return <Skeleton aria-label={`Cargando ${anterior}`} className="h-64 rounded-3xl" />;
  // Sin el año anterior (por ejemplo, el primer año del sistema), el informe sigue sin la comparación.
  if (consulta.isError) return null;

  const delAnterior = new Map(consulta.data.meses.map((mes) => [mes.mes, mes.cantidad]));
  const filas = transcurridos.map((mes) => {
    const antes = delAnterior.get(mes.mes) ?? 0;
    return { mes: mes.mes, nombre: mes.nombre, antes, ahora: mes.cantidad, diferencia: mes.cantidad - antes };
  });
  const totalAntes = filas.reduce((total, fila) => total + fila.antes, 0);
  const totalAhora = filas.reduce((total, fila) => total + fila.ahora, 0);
  const total = totalAhora - totalAntes;
  const hastaDonde = filas.length < 12 ? ` a esta altura de ${anterior}` : ` en ${anterior}`;

  return (
    <Card
      role="region"
      aria-labelledby={idTitulo}
      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900/60"
    >
      <h3 id={idTitulo} className="text-base font-extrabold text-slate-900 dark:text-white">
        {filtros.anio} comparado con {anterior}
      </h3>
      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
        {totalAhora} altas contra {totalAntes}
        {hastaDonde}: <strong className={cn("font-extrabold", colorDe(total))}>{diferencia(total)}</strong>
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-slate-800/40">
              <th scope="col" className={TH}>Mes</th>
              <th scope="col" className={`${TH} text-right`}>{anterior}</th>
              <th scope="col" className={`${TH} text-right`}>{filtros.anio}</th>
              <th scope="col" className={`${TH} text-right`}>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.mes}>
                <th scope="row" className={`${TD} text-left font-bold text-slate-900 dark:text-white`}>{fila.nombre}</th>
                <td className={`${TD} text-right text-slate-600 tabular-nums dark:text-slate-300`}>{fila.antes}</td>
                <td className={`${TD} text-right font-black text-slate-900 tabular-nums dark:text-white`}>{fila.ahora}</td>
                <td className={cn(TD, "text-right font-bold tabular-nums", colorDe(fila.diferencia))}>{diferencia(fila.diferencia)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
