import { Loader2, RefreshCw } from "lucide-react";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { alumnosDelMes, fechaHora, ultimoCalculo } from "@/features/honorarios/utils/formato-honorarios";
import { diaDeCierreLegible, esPeriodoEnCurso, etiquetaPeriodo, mesSigueAbierto } from "@/features/honorarios/utils/periodo";
import type { InformeHonorarios } from "@/types/honorarios";
import { formatearPrecio } from "@/utils/moneda";

const TARJETA = "rounded-lg border-border bg-white p-5 shadow-sm dark:bg-surface-low";
const ETIQUETA = "text-sm font-semibold text-muted-foreground";
const VALOR = "mt-1 text-3xl font-black tracking-tight text-dark tabular-nums break-words dark:text-white";
const NOTA = "mt-1 text-sm text-muted-foreground";

function textoDelMes(informe: InformeHonorarios, diaDeCierre: number): { titulo: string; detalle: string; abierto: boolean } {
  const { periodo, liquidaciones } = informe;
  const mes = etiquetaPeriodo(periodo).split(" ")[0];
  const cierre = diaDeCierreLegible(periodo, diaDeCierre);
  if (mesSigueAbierto(periodo, diaDeCierre)) {
    return {
      titulo: `${mes} sigue abierto.`,
      detalle: esPeriodoEnCurso(periodo)
        ? `Los montos cambian con cada cuota que se cobra. Se cierra solo el ${cierre} y ahí quedan fijos para abonar.`
        : `Todavía pueden entrar transferencias del mes. Se cierra solo el ${cierre}.`,
      abierto: true,
    };
  }
  if (liquidaciones.some(({ estado }) => estado === "BORRADOR")) {
    return { titulo: `${mes} se está cerrando.`, detalle: "En un momento quedan los montos para abonar.", abierto: true };
  }
  if (liquidaciones.length > 0 && liquidaciones.every(({ estado }) => estado === "PAGADA")) {
    return { titulo: `${mes} está cerrado y abonado.`, detalle: "Los montos ya no cambian.", abierto: false };
  }
  return {
    titulo: `${mes} está cerrado.`,
    detalle: `Se cerró solo el ${cierre}: los montos ya no cambian. Marcá a cada profesor/a cuando le abones.`,
    abierto: false,
  };
}

interface PropsEstado {
  informe: InformeHonorarios;
  diaDeCierre: number;
  procesando: boolean;
  onActualizar: () => void;
}

/** La línea de arriba: si el mes todavía cambia o ya quedó fijo, cuándo se cierra y, si sigue abierto, el botón para actualizarlo. */
export function EstadoDelMes({ informe, diaDeCierre, procesando, onActualizar }: PropsEstado) {
  const { titulo, detalle, abierto } = textoDelMes(informe, diaDeCierre);
  const calculadoEl = ultimoCalculo(informe.liquidaciones);
  const actualizable = mesSigueAbierto(informe.periodo, diaDeCierre);
  return (
    <div className="@container">
      <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-6">
        <p role="status" className="flex min-w-0 items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          {procesando ? (
            <Loader2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <span aria-hidden="true" className={abierto ? "mt-1.5 size-2 shrink-0 rounded-full bg-slate-400" : "mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500"} />
          )}
          <span>
            <strong className="font-bold text-slate-900 dark:text-white">{procesando ? "Actualizando los honorarios…" : titulo}</strong>
            {!procesando && ` ${detalle}`}
            {!procesando && abierto && calculadoEl && <span className="text-muted-foreground"> Actualizado el {fechaHora(calculadoEl)}</span>}
          </span>
        </p>
        {actualizable && (
          <Can permission="HONORARIOS_LIQUIDAR">
            <Button
              type="button"
              variant="outline"
              onClick={onActualizar}
              disabled={procesando}
              className="min-h-11 shrink-0 self-start rounded-xl border-border bg-white px-4 font-bold text-dark pointer-fine:min-h-9 @2xl:self-auto dark:bg-surface-low dark:text-white"
            >
              <RefreshCw aria-hidden="true" className={procesando ? "size-4 animate-spin" : "size-4"} />
              {procesando ? "Actualizando…" : "Actualizar"}
            </Button>
          </Can>
        )}
      </div>
    </div>
  );
}

function cantidad(numero: number, singular: string, plural: string): string {
  return `${numero} ${numero === 1 ? singular : plural}`;
}

export function ResumenDelMes({ informe, mesAbierto }: { informe: InformeHonorarios; mesAbierto: boolean }) {
  const { liquidaciones } = informe;
  const alumnos = alumnosDelMes(liquidaciones);
  const abonadas = liquidaciones.filter(({ estado }) => estado === "PAGADA").length;
  // Por el ancho del contenido y no de la pantalla: con el menú lateral abierto, una tablet deja poco lugar.
  return (
    <div className="@container">
      <section aria-label="Resumen del mes" className="grid grid-cols-1 gap-4 @2xl:grid-cols-3">
        <Card className={TARJETA}>
          <h2 className={ETIQUETA}>Total para profesores</h2>
          <p className={VALOR}>{formatearPrecio(informe.totalGeneral)}</p>
          <p className={NOTA}>Entre {cantidad(liquidaciones.length, "profesor/a", "profesores")}</p>
        </Card>
        <Card className={TARJETA}>
          <h2 className={ETIQUETA}>Alumnos a cargo</h2>
          <p className={VALOR}>{alumnos ?? "—"}</p>
          <p className={NOTA}>Cada profesor/a cobra un porcentaje de lo que pagaron sus alumnos</p>
        </Card>
        <Card className={TARJETA}>
          <h2 className={ETIQUETA}>Abonados</h2>
          <p className={VALOR}>
            {abonadas} de {liquidaciones.length}
          </p>
          <p className={NOTA}>
            {mesAbierto
              ? "Se abonan cuando el mes se cierra"
              : cantidad(liquidaciones.length - abonadas, "profesor/a por abonar", "profesores por abonar")}
          </p>
        </Card>
      </section>
    </div>
  );
}
