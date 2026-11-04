import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { MenuExportar } from "@/components/menu-exportar";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
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
import { FILAS_POR_PAGINA, obtenerCuotasVencidasCompleto } from "@/features/reportes/api/reportes-api";
import { useExportarTabla } from "@/features/reportes/hooks/use-exportar-tabla";
import { useCuotasVencidas, usePlanesParaFiltro, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import type { TablaExportable } from "@/features/reportes/utils/tabla-exportable";
import type { FiltrosCuotasVencidas, InformeCuotasVencidas } from "@/types/reportes";
import { formatearPrecio } from "@/utils/moneda";

// US-34: pestaña "Cuotas vencidas" de Reportes. Quién debe hoy, cuánto y desde cuándo, con el
// teléfono a mano para avisarle. Primero las más viejas.

function dias(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? "día" : "días"}`;
}

function aTabla(informe: InformeCuotasVencidas, detalle: string): TablaExportable {
  return {
    titulo: "Cuotas vencidas",
    detalle,
    resumen: [
      ["Alumnos que deben", String(informe.alumnosConDeuda)],
      ["Total adeudado", formatearPrecio(informe.totalAdeudado)],
      ["Promedio por alumno", formatearPrecio(informe.promedioPorAlumno)],
    ],
    columnas: [
      { titulo: "Alumno" },
      { titulo: "Plan" },
      { titulo: "Profesor/a" },
      { titulo: "Venció" },
      { titulo: "Días vencida", decimales: 0 },
      { titulo: "Teléfono" },
      { titulo: "Monto", decimales: 2 },
    ],
    filas: informe.cuotas.map((c) => [c.alumno, c.plan, c.profesora, formatearFecha(c.vencio), c.diasVencida, c.telefono ?? "—", c.monto]),
    nombreArchivo: "cuotas-vencidas",
  };
}

function PorProfesora({ informe }: { informe: InformeCuotasVencidas }) {
  return (
    <SeccionReporte id="titulo-deuda-profesora" titulo="Por profesor/a">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={TH}>Profesor/a</th>
              <th scope="col" className={TH_NUMERO}>Alumnos que deben</th>
              <th scope="col" className={TH_NUMERO}>Adeudado</th>
            </tr>
          </thead>
          <tbody>
            {informe.porProfesora.map((p) => (
              <tr key={p.id}>
                <th scope="row" className={`${TD} text-left font-semibold text-slate-900 dark:text-white`}>{p.nombre}</th>
                <td className={TD_NUMERO}>{p.alumnos}</td>
                <td className={`${TD_NUMERO} font-bold text-slate-900 dark:text-white`}>{formatearPrecio(p.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SeccionReporte>
  );
}

function PorAlumno({ informe, cargando, onCambiarPagina }: { informe: InformeCuotasVencidas; cargando: boolean; onCambiarPagina: (offset: number) => void }) {
  return (
    <SeccionReporte id="titulo-deuda-alumno" titulo={`Por alumno (${informe.total})`} descripcion="Primero las que vencieron hace más tiempo.">
      <div aria-busy={cargando} className={cargando ? "overflow-x-auto opacity-60 transition-opacity" : "overflow-x-auto"}>
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={TH}>Alumno</th>
              <th scope="col" className={TH}>Plan</th>
              <th scope="col" className={TH}>Profesor/a</th>
              <th scope="col" className={TH}>Venció</th>
              <th scope="col" className={TH_NUMERO}>Hace</th>
              <th scope="col" className={TH}>Teléfono</th>
              <th scope="col" className={TH_NUMERO}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {informe.cuotas.map((c) => (
              <tr key={c.idInscripcion}>
                <th scope="row" className={`${TD} text-left font-semibold text-slate-900 dark:text-white`}>{c.alumno}</th>
                <td className={`${TD} text-slate-700 dark:text-slate-300`}>{c.plan}</td>
                <td className={`${TD} text-slate-700 dark:text-slate-300`}>{c.profesora}</td>
                <td className={`${TD} whitespace-nowrap tabular-nums`}>{formatearFecha(c.vencio)}</td>
                <td className={`${TD_NUMERO} ${c.diasVencida > 30 ? "font-bold text-rose-700 dark:text-rose-300" : ""}`}>{dias(c.diasVencida)}</td>
                <td className={`${TD} whitespace-nowrap tabular-nums`}>
                  {c.telefono ? (
                    <a href={`tel:${c.telefono.replace(/\s/g, "")}`} className="font-semibold text-primary-dark hover:underline dark:text-pink-300">
                      {c.telefono}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className={`${TD_NUMERO} font-bold text-slate-900 dark:text-white`}>{formatearPrecio(c.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginacionReporte etiqueta="Páginas de alumnos" offset={informe.offset} total={informe.total} porPagina={FILAS_POR_PAGINA} cargando={cargando} onCambiar={onCambiarPagina} />
    </SeccionReporte>
  );
}

export function CuotasVencidasReportePage() {
  const [filtros, setFiltros] = useState<FiltrosCuotasVencidas>({ idProfesora: null, idPlan: null });
  const [offset, setOffset] = useState(0);
  const consulta = useCuotasVencidas(filtros, offset);
  const profesoras = useProfesorasParaFiltro();
  const planes = usePlanesParaFiltro();
  const informe = consulta.data;
  const profesora = profesoras.data?.find((p) => Number(p.id) === filtros.idProfesora);
  const plan = planes.data?.find((p) => Number(p.id) === filtros.idPlan);
  const detalle =
    ["Cuotas vencidas al día de hoy", profesora && `Profesora: ${profesora.nombre} ${profesora.apellido}`, plan && `Plan: ${plan.nombre}`].filter(Boolean).join(" · ");
  const { exportar, preparando, impresion } = useExportarTabla(async () => aTabla(await obtenerCuotasVencidasCompleto(filtros), detalle));

  function filtrar(cambio: Partial<FiltrosCuotasVencidas>) {
    setFiltros((actual) => ({ ...actual, ...cambio }));
    setOffset(0);
  }

  return (
    <PaginaReportes
      acciones={<MenuExportar disabled={!informe || informe.total === 0 || consulta.isFetching} preparando={preparando} onExportar={(formato) => void exportar(formato)} />}
    >
      <div className="min-w-0 space-y-6">
        <TituloDelReporte titulo="Cuotas vencidas" detalle={detalle} />
        <TarjetaDeFiltros>
          <SelectFiltro
            id="vencidas-profesora"
            etiqueta="Profesor/a"
            todos="Todo el equipo"
            valor={filtros.idProfesora === null ? "" : String(filtros.idProfesora)}
            opciones={(profesoras.data ?? []).map((p) => ({ valor: String(p.id), texto: `${p.nombre} ${p.apellido}` }))}
            onChange={(valor) => filtrar({ idProfesora: valor ? Number(valor) : null })}
          />
          <SelectFiltro
            id="vencidas-plan"
            etiqueta="Plan"
            todos="Todos los planes"
            valor={filtros.idPlan === null ? "" : String(filtros.idPlan)}
            opciones={(planes.data ?? []).map((p) => ({ valor: String(p.id), texto: p.nombre }))}
            onChange={(valor) => filtrar({ idPlan: valor ? Number(valor) : null })}
          />
        </TarjetaDeFiltros>

        {consulta.isPending && <CargandoReporte />}
        {consulta.isError && <ErrorDelReporte error={consulta.error} reintentando={consulta.isFetching} onReintentar={() => void consulta.refetch()} />}
        {informe && informe.total === 0 && (
          <ReporteVacio icono={<CheckCircle2 className="size-7" />} titulo="Nadie tiene la cuota vencida" texto="Todos los alumnos están al día para estos filtros." />
        )}
        {informe && informe.total > 0 && (
          <div className="flex flex-col gap-5">
            <ResumenEnTarjetas
              datos={[
                { etiqueta: "Alumnos que deben", valor: String(informe.alumnosConDeuda) },
                { etiqueta: "Promedio por alumno", valor: formatearPrecio(informe.promedioPorAlumno) },
                { etiqueta: "Más antigua", valor: informe.cuotas[0] && informe.offset === 0 ? dias(informe.cuotas[0].diasVencida) : "—" },
                { etiqueta: "Total adeudado", valor: formatearPrecio(informe.totalAdeudado) },
              ]}
            />
            {informe.porProfesora.length > 1 && <PorProfesora informe={informe} />}
            <PorAlumno informe={informe} cargando={consulta.isPlaceholderData} onCambiarPagina={setOffset} />
          </div>
        )}
      </div>
      {impresion && <TablaImprimible tabla={impresion.datos} generadoEl={impresion.generadoEl} />}
    </PaginaReportes>
  );
}
