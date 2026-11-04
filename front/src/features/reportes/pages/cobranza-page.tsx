import { useState } from "react";
import { Wallet } from "lucide-react";
import { MenuExportar } from "@/components/menu-exportar";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { FiltroPeriodo } from "@/features/reportes/components/filtro-periodo";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";
import {
  CargandoReporte,
  ErrorDelReporte,
  PaginacionReporte,
  ReporteVacio,
  ResumenEnTarjetas,
  SeccionReporte,
  SelectFiltro,
  TD,
  TD_NUMERO,
  TH,
  TH_NUMERO,
  TarjetaDeFiltros,
  TituloDelReporte,
} from "@/features/reportes/components/piezas-reporte";
import { TablaImprimible } from "@/features/reportes/components/tabla-imprimible";
import { FILAS_POR_PAGINA, obtenerCobranzaCompleta } from "@/features/reportes/api/reportes-api";
import { useExportarTabla } from "@/features/reportes/hooks/use-exportar-tabla";
import { useInformeCobranza, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import { periodoDelInforme } from "@/features/reportes/utils/formato-informe";
import type { TablaExportable } from "@/features/reportes/utils/tabla-exportable";
import type { FiltrosCobranza, InformeCobranza } from "@/types/reportes";
import { fechaActualArgentina } from "@/utils/fecha";
import { formatearPrecio } from "@/utils/moneda";

// Pestaña "Cobranza" de Reportes: lo que entró en el período, separado por forma de pago, con el
// detalle de cada pago confirmado.

const FORMA: Record<"EFECTIVO" | "TRANSFERENCIA", string> = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia" };

function porcentaje(parte: number, total: number): string {
  return total > 0 ? `${Math.round((parte / total) * 100)} % del total` : "—";
}

function aTabla(informe: InformeCobranza, detalle: string): TablaExportable {
  return {
    titulo: "Cobranza",
    detalle,
    resumen: [
      ["Cobrado", formatearPrecio(informe.totalCobrado)],
      ["Efectivo", formatearPrecio(informe.totalEfectivo)],
      ["Transferencia", formatearPrecio(informe.totalTransferencia)],
      ["Pagos", String(informe.cantidadPagos)],
    ],
    columnas: [{ titulo: "Fecha" }, { titulo: "Alumno" }, { titulo: "Plan" }, { titulo: "Forma de pago" }, { titulo: "Cobró" }, { titulo: "Monto", decimales: 2 }],
    filas: informe.pagos.map((pago) => [formatearFecha(pago.fecha), pago.alumno, pago.plan, FORMA[pago.formaPago], pago.cobro ?? "—", pago.monto]),
    pie: "Solo pagos confirmados. Las transferencias que esperan aprobación todavía no suman.",
    nombreArchivo: `cobranza-${informe.desde}-${informe.hasta}`,
  };
}

function TablaPagos({ informe, cargando, onCambiarPagina }: { informe: InformeCobranza; cargando: boolean; onCambiarPagina: (offset: number) => void }) {
  return (
    <SeccionReporte id="titulo-pagos" titulo={`Pagos (${informe.total})`}>
      <div aria-busy={cargando} className={cargando ? "overflow-x-auto opacity-60 transition-opacity" : "overflow-x-auto"}>
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={TH}>Fecha</th>
              <th scope="col" className={TH}>Alumno</th>
              <th scope="col" className={TH}>Plan</th>
              <th scope="col" className={TH}>Forma de pago</th>
              <th scope="col" className={TH}>Cobró</th>
              <th scope="col" className={TH_NUMERO}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {informe.pagos.map((pago) => (
              <tr key={pago.id}>
                <td className={`${TD} whitespace-nowrap tabular-nums`}>{formatearFecha(pago.fecha)}</td>
                <th scope="row" className={`${TD} text-left font-semibold text-slate-900 dark:text-white`}>{pago.alumno}</th>
                <td className={`${TD} text-slate-700 dark:text-slate-300`}>{pago.plan}</td>
                <td className={`${TD} text-slate-700 dark:text-slate-300`}>{FORMA[pago.formaPago]}</td>
                <td className={`${TD} text-slate-700 dark:text-slate-300`}>{pago.cobro ?? "—"}</td>
                <td className={`${TD_NUMERO} font-bold text-slate-900 dark:text-white`}>{formatearPrecio(pago.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginacionReporte etiqueta="Páginas de pagos" offset={informe.offset} total={informe.total} porPagina={FILAS_POR_PAGINA} cargando={cargando} onCambiar={onCambiarPagina} />
    </SeccionReporte>
  );
}

export function CobranzaReportePage() {
  const hoy = fechaActualArgentina();
  const [filtros, setFiltros] = useState<FiltrosCobranza>({ desde: `${hoy.slice(0, 8)}01`, hasta: hoy, formaPago: null, idProfesora: null });
  const [offset, setOffset] = useState(0);
  const consulta = useInformeCobranza(filtros, offset);
  const profesoras = useProfesorasParaFiltro();
  const informe = consulta.data;
  const profesora = profesoras.data?.find((p) => Number(p.id) === filtros.idProfesora);
  const detalle = [
    periodoDelInforme(filtros.desde, filtros.hasta),
    filtros.formaPago && FORMA[filtros.formaPago],
    profesora && `Cobró: ${profesora.nombre} ${profesora.apellido}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const { exportar, preparando, impresion } = useExportarTabla(async () => aTabla(await obtenerCobranzaCompleta(filtros), detalle));

  function filtrar(cambio: Partial<FiltrosCobranza>) {
    setFiltros((actual) => ({ ...actual, ...cambio }));
    setOffset(0);
  }

  return (
    <PaginaReportes
      acciones={<MenuExportar disabled={!informe || informe.total === 0 || consulta.isFetching} preparando={preparando} onExportar={(formato) => void exportar(formato)} />}
    >
      <div className="min-w-0 space-y-6">
        <TituloDelReporte titulo="Cobranza" detalle={detalle} />
        <TarjetaDeFiltros>
          <FiltroPeriodo prefijo="cobranza" desde={filtros.desde} hasta={filtros.hasta} onCambiar={filtrar} />
          <SelectFiltro
            id="cobranza-forma"
            etiqueta="Forma de pago"
            todos="Todas"
            valor={filtros.formaPago ?? ""}
            opciones={[
              { valor: "EFECTIVO", texto: "Efectivo" },
              { valor: "TRANSFERENCIA", texto: "Transferencia" },
            ]}
            onChange={(valor) => filtrar({ formaPago: valor === "EFECTIVO" || valor === "TRANSFERENCIA" ? valor : null })}
          />
          <SelectFiltro
            id="cobranza-profesora"
            etiqueta="Cobró"
            todos="Cualquiera"
            valor={filtros.idProfesora === null ? "" : String(filtros.idProfesora)}
            opciones={(profesoras.data ?? []).map((p) => ({ valor: String(p.id), texto: `${p.nombre} ${p.apellido}` }))}
            onChange={(valor) => filtrar({ idProfesora: valor ? Number(valor) : null })}
          />
        </TarjetaDeFiltros>

        {consulta.isPending && <CargandoReporte />}
        {consulta.isError && <ErrorDelReporte error={consulta.error} reintentando={consulta.isFetching} onReintentar={() => void consulta.refetch()} />}
        {informe && informe.total === 0 && (
          <ReporteVacio icono={<Wallet className="size-7" />} titulo="No hay pagos en el período" texto="Probá con otras fechas o sacá algún filtro." />
        )}
        {informe && informe.total > 0 && (
          <div className="flex flex-col gap-5">
            <ResumenEnTarjetas
              datos={[
                { etiqueta: "Pagos", valor: String(informe.cantidadPagos) },
                { etiqueta: "Efectivo", valor: formatearPrecio(informe.totalEfectivo), nota: porcentaje(informe.totalEfectivo, informe.totalCobrado) },
                { etiqueta: "Transferencia", valor: formatearPrecio(informe.totalTransferencia), nota: porcentaje(informe.totalTransferencia, informe.totalCobrado) },
                { etiqueta: "Cobrado", valor: formatearPrecio(informe.totalCobrado) },
              ]}
              aclaracion="Solo pagos confirmados. Las transferencias que esperan aprobación todavía no suman."
            />
            <TablaPagos informe={informe} cargando={consulta.isPlaceholderData} onCambiarPagina={setOffset} />
          </div>
        )}
      </div>
      {impresion && <TablaImprimible tabla={impresion.datos} generadoEl={impresion.generadoEl} />}
    </PaginaReportes>
  );
}
