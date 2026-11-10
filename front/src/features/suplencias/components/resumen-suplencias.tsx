import { Card } from "@/components/ui/card";
import { horasDeLaClase } from "@/features/suplencias/utils/monto-suplencia";
import { diaDeCierreLegible, etiquetaPeriodo, mesSigueAbierto } from "@/features/honorarios/utils/periodo";
import type { Suplencia } from "@/types/suplencia";
import { formatearPrecio } from "@/utils/moneda";

const TARJETA = "rounded-lg border-border bg-white p-5 shadow-sm dark:bg-surface-low";
const ETIQUETA = "text-sm font-semibold text-muted-foreground";
const VALOR = "mt-1 text-3xl font-black tracking-tight text-dark tabular-nums dark:text-white";
const NOTA = "mt-1 text-sm text-muted-foreground";

function cantidad(numero: number, singular: string, plural: string): string {
  return `${numero} ${numero === 1 ? singular : plural}`;
}

function horasLegibles(horas: number): string {
  const texto = horas.toLocaleString("es-AR", { maximumFractionDigits: 1 });
  return `${texto} ${horas === 1 ? "hora" : "horas"}`;
}

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

export function ResumenSuplencias({ suplencias, montos }: { suplencias: Suplencia[]; montos: Map<string, number | null> }) {
  const dictadas = suplencias.filter(({ estadoClase }) => estadoClase !== "CANCELADA");
  const horas = dictadas.reduce((total, suplencia) => total + horasDeLaClase(suplencia), 0);
  const sinValor = dictadas.filter(({ idClase }) => montos.get(idClase) === null).length;
  const total = dictadas.reduce((suma, { idClase }) => suma + (montos.get(idClase) ?? 0), 0);
  const quienes = new Set(dictadas.map(({ suplente }) => suplente.id)).size;
  return (
    <section aria-label="Resumen de las suplencias" className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className={TARJETA}>
        <h2 className={ETIQUETA}>Clases cubiertas</h2>
        <p className={VALOR}>{dictadas.length}</p>
        <p className={NOTA}>{horasLegibles(horas)} en total</p>
      </Card>
      <Card className={TARJETA}>
        <h2 className={ETIQUETA}>A pagar por suplencias</h2>
        <p className={VALOR}>{formatearPrecio(total)}</p>
        <p className={NOTA}>
          {sinValor > 0
            ? `${sinValor === 1 ? "Falta" : "Faltan"} ${cantidad(sinValor, "clase", "clases")}: cargá el valor por hora en Configuración`
            : "Se le suma a quien cubrió y se le descuenta a quien faltó"}
        </p>
      </Card>
      <Card className={TARJETA}>
        <h2 className={ETIQUETA}>Cubrieron</h2>
        <p className={VALOR}>{quienes}</p>
        <p className={NOTA}>Profesores que cubrieron alguna clase</p>
      </Card>
    </section>
  );
}
