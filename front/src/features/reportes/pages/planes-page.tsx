import { useState } from "react";
import { Tags } from "lucide-react";
import { MenuExportar } from "@/components/menu-exportar";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";
import {
  BarraPorcentaje,
  CargandoReporte,
  ErrorDelReporte,
  ReporteVacio,
  ResumenEnTarjetas,
  SeccionReporte,
  SelectFiltro,
  TD,
  TD_NUMERO,
  TH,
  TH_NUMERO,
  GrupoDeFiltros,
  TituloDelReporte,
} from "@/features/reportes/components/piezas-reporte";
import { TablaImprimible } from "@/features/reportes/components/tabla-imprimible";
import { useExportarTabla } from "@/features/reportes/hooks/use-exportar-tabla";
import { useActividadesParaFiltro, useEstadisticasPlanes, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import { formatearPorcentaje } from "@/features/reportes/utils/formato-informe";
import type { TablaExportable } from "@/features/reportes/utils/tabla-exportable";
import type { EstadisticasPlanes, FiltrosPlanesReporte } from "@/types/reportes";
import { formatearPrecio } from "@/utils/moneda";

// US-36: pestaña "Planes" de Reportes. Cuántos alumnos activos tiene cada plan, qué parte del total
// son y cuánto se espera cobrar por mes con los precios vigentes.

const TIPO: Record<"MENSUAL" | "CLASE_SUELTA", string> = { MENSUAL: "Mensual", CLASE_SUELTA: "Suelta" };

function aTabla(estadisticas: EstadisticasPlanes, detalle: string): TablaExportable {
  return {
    titulo: "Planes más elegidos",
    detalle,
    resumen: [
      ["Alumnos activos", String(estadisticas.alumnosActivos)],
      ["Planes", String(estadisticas.totalPlanes)],
      ["Ingreso esperado por mes", formatearPrecio(estadisticas.ingresoEstimado)],
    ],
    columnas: [
      { titulo: "Plan" },
      { titulo: "Tipo" },
      { titulo: "Actividad" },
      { titulo: "Alumnos", decimales: 0 },
      { titulo: "% del total", decimales: 1 },
      { titulo: "Precio vigente", decimales: 2 },
      { titulo: "Ingreso esperado", decimales: 2 },
    ],
    filas: estadisticas.planes.map((plan) => [
      plan.nombre,
      TIPO[plan.tipo],
      plan.actividad ?? "Todas",
      plan.alumnos,
      plan.porcentaje,
      plan.precioVigente ?? 0,
      plan.ingresoEstimado,
    ]),
    pie: "Ingreso esperado: alumnos activos por el precio vigente, sin promociones.",
    nombreArchivo: "planes-mas-elegidos",
  };
}

function TablaPlanes({ estadisticas }: { estadisticas: EstadisticasPlanes }) {
  const maximo = Math.max(...estadisticas.planes.map((plan) => plan.alumnos), 1);
  return (
    <SeccionReporte id="titulo-planes" titulo={`Alumnos por plan (${estadisticas.planes.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={TH}>Plan</th>
              <th scope="col" className={TH}>Tipo</th>
              <th scope="col" className={TH_NUMERO}>Alumnos</th>
              <th scope="col" className={TH_NUMERO}>Del total</th>
              <th scope="col" className={TH_NUMERO}>Precio vigente</th>
              <th scope="col" className={TH_NUMERO}>Ingreso esperado</th>
            </tr>
          </thead>
          <tbody>
            {estadisticas.planes.map((plan, indice) => (
              <tr key={plan.id}>
                <th scope="row" className={`${TD} text-left font-semibold text-slate-900 dark:text-white`}>
                  {plan.nombre}
                  {plan.actividad && <span className="ml-2 text-xs font-medium text-muted-foreground">Solo {plan.actividad}</span>}
                </th>
                <td className={`${TD} text-slate-700 dark:text-slate-300`}>{TIPO[plan.tipo]}</td>
                <td className={`${TD_NUMERO} font-bold text-slate-900 dark:text-white`}>{plan.alumnos}</td>
                <td className={TD_NUMERO}>
                  <BarraPorcentaje
                    valor={(plan.alumnos / maximo) * 100}
                    texto={formatearPorcentaje(plan.porcentaje)}
                    tono={indice === 0 ? "bg-primary" : "bg-pink-300 dark:bg-pink-400/70"}
                  />
                </td>
                <td className={`${TD_NUMERO} text-slate-700 dark:text-slate-300`}>
                  {plan.precioVigente === null ? "—" : formatearPrecio(plan.precioVigente)}
                  {plan.tipo === "CLASE_SUELTA" && plan.precioVigente !== null && <span className="text-xs text-muted-foreground"> por clase</span>}
                </td>
                <td className={`${TD_NUMERO} font-bold text-slate-900 dark:text-white`}>{formatearPrecio(plan.ingresoEstimado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SeccionReporte>
  );
}

export function PlanesReportePage() {
  const [filtros, setFiltros] = useState<FiltrosPlanesReporte>({ idActividad: null, idProfesora: null });
  const consulta = useEstadisticasPlanes(filtros);
  const profesoras = useProfesorasParaFiltro();
  const actividades = useActividadesParaFiltro();
  const profesora = profesoras.data?.find((p) => Number(p.id) === filtros.idProfesora);
  const actividad = actividades.data?.find((a) => Number(a.id) === filtros.idActividad);
  const detalle =
    [profesora && `Profesora: ${profesora.nombre} ${profesora.apellido}`, actividad && `Actividad: ${actividad.nombre}`].filter(Boolean).join(" · ") ||
    "Alumnos activos hoy, en todas las actividades";
  const estadisticas = consulta.data;
  const conDatos = Boolean(estadisticas && estadisticas.planes.length > 0);
  // Todo el informe ya está en pantalla: se exporta lo que se ve.
  const { exportar, preparando, impresion } = useExportarTabla(() =>
    estadisticas ? Promise.resolve(aTabla(estadisticas, detalle)) : Promise.reject(new Error("El informe todavía no cargó.")),
  );

  return (
    <PaginaReportes acciones={<MenuExportar disabled={!conDatos} preparando={preparando} onExportar={(formato) => void exportar(formato)} />}>
      <div className="min-w-0 space-y-6">
        <TituloDelReporte titulo="Planes más elegidos" detalle={detalle} />
        <GrupoDeFiltros>
          <SelectFiltro
            id="planes-profesora"
            etiqueta="Profesor/a"
            todos="Todo el equipo"
            valor={filtros.idProfesora === null ? "" : String(filtros.idProfesora)}
            opciones={(profesoras.data ?? []).map((p) => ({ valor: String(p.id), texto: `${p.nombre} ${p.apellido}` }))}
            onChange={(valor) => setFiltros((actual) => ({ ...actual, idProfesora: valor ? Number(valor) : null }))}
          />
          <SelectFiltro
            id="planes-actividad"
            etiqueta="Actividad"
            todos="Todas las actividades"
            valor={filtros.idActividad === null ? "" : String(filtros.idActividad)}
            opciones={(actividades.data ?? []).map((a) => ({ valor: String(a.id), texto: a.nombre }))}
            onChange={(valor) => setFiltros((actual) => ({ ...actual, idActividad: valor ? Number(valor) : null }))}
          />
        </GrupoDeFiltros>

        {consulta.isPending && <CargandoReporte />}
        {consulta.isError && <ErrorDelReporte error={consulta.error} reintentando={consulta.isFetching} onReintentar={() => void consulta.refetch()} />}
        {estadisticas && !conDatos && (
          <ReporteVacio icono={<Tags className="size-7" />} titulo="No hay alumnos activos en ningún plan" texto="Probá sacar algún filtro." />
        )}
        {estadisticas && conDatos && (
          <div className="flex flex-col gap-5">
            <ResumenEnTarjetas
              datos={[
                { etiqueta: "Alumnos activos", valor: String(estadisticas.alumnosActivos) },
                { etiqueta: "Planes con alumnos", valor: String(estadisticas.planes.filter((plan) => plan.alumnos > 0).length) },
                { etiqueta: "Más elegido", valor: estadisticas.planes[0]?.nombre ?? "—" },
                { etiqueta: "Ingreso esperado por mes", valor: formatearPrecio(estadisticas.ingresoEstimado) },
              ]}
              aclaracion="Ingreso esperado: alumnos activos por el precio vigente de su plan, sin promociones."
            />
            <TablaPlanes estadisticas={estadisticas} />
          </div>
        )}
      </div>
      {impresion && <TablaImprimible tabla={impresion.datos} generadoEl={impresion.generadoEl} />}
    </PaginaReportes>
  );
}
