import { diaDeCierreLegible, etiquetaPeriodo, mesSigueAbierto } from "@/features/honorarios/utils/periodo";

/** La línea de arriba: si todavía se pueden registrar o corregir suplencias del mes. */
export function EstadoSuplencias({ periodo }: { periodo: string }) {
  const mes = etiquetaPeriodo(periodo).split(" ")[0];
  const abierto = mesSigueAbierto(periodo);
  return (
    <p role="status" className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
      <span aria-hidden="true" className={abierto ? "mt-1.5 size-2 shrink-0 rounded-full bg-slate-400" : "mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500"} />
      {abierto ? (
        <span>
          <strong className="font-bold text-slate-900 dark:text-white">{mes} sigue abierto.</strong> Podés registrar y corregir suplencias
          hasta el {diaDeCierreLegible(periodo)}, cuando se cierran los honorarios.
        </span>
      ) : (
        <span>
          <strong className="font-bold text-slate-900 dark:text-white">{mes} está cerrado.</strong> Sus suplencias ya están en los
          honorarios y no se pueden cambiar.
        </span>
      )}
    </p>
  );
}
