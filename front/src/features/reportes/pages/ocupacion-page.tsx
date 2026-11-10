import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { MenuExportar } from "@/components/menu-exportar";
import { MapaOcupacion } from "@/features/reportes/components/mapa-ocupacion";
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
import { useActividadesParaFiltro, useInformeOcupacion, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import { formatearPorcentaje } from "@/features/reportes/utils/formato-informe";
import type { TablaExportable } from "@/features/reportes/utils/tabla-exportable";
import type { FiltrosOcupacion, HorarioOcupado, InformeOcupacion, NivelOcupacion } from "@/types/reportes";
import { cn } from "@/utils/cn";

// US-37: pestaña "Ocupación" de Reportes. El mapa de la semana (el mismo del Dashboard) y cada horario
// con sus inscriptos sobre el cupo, de más lleno a más vacío: los de arriba piden otro horario y los de
// abajo, difusión.

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const NIVEL: Record<NivelOcupacion, { texto: string; estilo: string; barra: string }> = {
  COMPLETO: { texto: "Completo", estilo: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-400/30", barra: "bg-rose-500" },
  CASI_LLENO: { texto: "Casi lleno", estilo: "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-400/30", barra: "bg-orange-400" },
  MODERADO: { texto: "Moderado", estilo: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/30", barra: "bg-amber-400" },
  LIBRE: { texto: "Libre", estilo: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/30", barra: "bg-emerald-500" },
  SIN_CUPO: { texto: "Sin cupo", estilo: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10", barra: "bg-slate-400" },
};

/** De más lleno a más vacío; los sin cupo, al final. */
function ordenar(horarios: HorarioOcupado[]): HorarioOcupado[] {
  return [...horarios].sort(
    (a, b) => (b.porcentaje ?? -1) - (a.porcentaje ?? -1) || a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio),
  );
}

function inscriptosDe(horario: HorarioOcupado): string {
  return horario.cupo === null ? `${horario.inscriptos}` : `${horario.inscriptos} de ${horario.cupo}`;
}

function aTabla(informe: InformeOcupacion, detalle: string): TablaExportable {
  return {
    titulo: "Ocupación de horarios",
    detalle,
    resumen: [
      ["Horarios", String(informe.totalHorarios)],
      ["Ocupación total", formatearPorcentaje(informe.ocupacionTotal)],
      ["Completos", String(informe.porNivel.COMPLETO)],
      ["Libres", String(informe.porNivel.LIBRE)],
    ],
    columnas: [
      { titulo: "Actividad" },
      { titulo: "Día" },
      { titulo: "Horario" },
      { titulo: "Profesor/a" },
      { titulo: "Inscriptos", decimales: 0 },
      { titulo: "Cupo" },
      { titulo: "Ocupación %" },
      { titulo: "Nivel" },
    ],
    filas: ordenar(informe.horarios).map((h) => [
      h.actividad,
      DIAS[h.diaSemana] ?? "",
      `${h.horaInicio} a ${h.horaFin}`,
      h.profesora,
      h.inscriptos,
      h.cupo === null ? "Sin cupo" : String(h.cupo),
      h.porcentaje === null ? "—" : formatearPorcentaje(h.porcentaje),
      NIVEL[h.nivel].texto,
    ]),
    pie: "Inscriptos activos sobre el cupo del horario, o el de la actividad si el horario no tiene uno propio.",
    nombreArchivo: "ocupacion-de-horarios",
  };
}

function TablaOcupacion({ horarios }: { horarios: HorarioOcupado[] }) {
  return (
    <SeccionReporte id="titulo-ocupacion" titulo={`Horarios (${horarios.length})`} descripcion="De más lleno a más vacío.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={TH}>Actividad</th>
              <th scope="col" className={TH}>Día</th>
              <th scope="col" className={TH}>Horario</th>
              <th scope="col" className={TH}>Profesor/a</th>
              <th scope="col" className={TH_NUMERO}>Inscriptos</th>
              <th scope="col" className={TH_NUMERO}>Ocupación</th>
              <th scope="col" className={TH}>Nivel</th>
            </tr>
          </thead>
          <tbody>
            {horarios.map((h) => (
              <tr key={h.id}>
                <th scope="row" className={`${TD} text-left font-semibold text-slate-900 dark:text-white`}>{h.actividad}</th>
                <td className={`${TD} text-slate-700 dark:text-slate-300`}>{DIAS[h.diaSemana]}</td>
                <td className={`${TD} whitespace-nowrap text-slate-700 tabular-nums dark:text-slate-300`}>
                  {h.horaInicio} a {h.horaFin}
                </td>
                <td className={`${TD} text-slate-700 dark:text-slate-300`}>{h.profesora}</td>
                <td className={TD_NUMERO}>{inscriptosDe(h)}</td>
                <td className={TD_NUMERO}>
                  {h.porcentaje === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <BarraPorcentaje valor={h.porcentaje} texto={formatearPorcentaje(h.porcentaje)} tono={NIVEL[h.nivel].barra} />
                  )}
                </td>
                <td className={TD}>
                  <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ring-1 ring-inset", NIVEL[h.nivel].estilo)}>
                    {NIVEL[h.nivel].texto}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SeccionReporte>
  );
}

export function OcupacionReportePage() {
  const [vista, setVista] = useState<"mapa" | "tabla">("mapa");
  const [filtros, setFiltros] = useState<FiltrosOcupacion>({ idActividad: null, idProfesora: null, modalidad: null });
  const consulta = useInformeOcupacion(filtros);
  const profesoras = useProfesorasParaFiltro();
  const actividades = useActividadesParaFiltro();
  const informe = consulta.data;
  const horarios = useMemo(() => (informe ? ordenar(informe.horarios) : []), [informe]);
  const profesora = profesoras.data?.find((p) => Number(p.id) === filtros.idProfesora);
  const actividad = actividades.data?.find((a) => Number(a.id) === filtros.idActividad);
  const detalle =
    [
      profesora && `Profesora: ${profesora.nombre} ${profesora.apellido}`,
      actividad && `Actividad: ${actividad.nombre}`,
      filtros.modalidad && (filtros.modalidad === "GRUPAL" ? "Grupales" : "Personalizadas"),
    ]
      .filter(Boolean)
      .join(" · ") || "Inscriptos activos hoy, en todos los horarios";
  const { exportar, preparando, impresion } = useExportarTabla(() =>
    informe ? Promise.resolve(aTabla(informe, detalle)) : Promise.reject(new Error("El informe todavía no cargó.")),
  );

  return (
    <PaginaReportes acciones={<MenuExportar disabled={horarios.length === 0} preparando={preparando} onExportar={(formato) => void exportar(formato)} />}>
      <div className="min-w-0 space-y-6">
        <TituloDelReporte titulo="Ocupación de horarios" detalle={detalle} />
        <GrupoDeFiltros>
          <SelectFiltro
            id="ocupacion-profesora"
            etiqueta="Profesor/a"
            todos="Todo el equipo"
            valor={filtros.idProfesora === null ? "" : String(filtros.idProfesora)}
            opciones={(profesoras.data ?? []).map((p) => ({ valor: String(p.id), texto: `${p.nombre} ${p.apellido}` }))}
            onChange={(valor) => setFiltros((actual) => ({ ...actual, idProfesora: valor ? Number(valor) : null }))}
          />
          <SelectFiltro
            id="ocupacion-actividad"
            etiqueta="Actividad"
            todos="Todas las actividades"
            valor={filtros.idActividad === null ? "" : String(filtros.idActividad)}
            opciones={(actividades.data ?? []).map((a) => ({ valor: String(a.id), texto: a.nombre }))}
            onChange={(valor) => setFiltros((actual) => ({ ...actual, idActividad: valor ? Number(valor) : null }))}
          />
          <SelectFiltro
            id="ocupacion-modalidad"
            etiqueta="Modalidad"
            todos="Grupales y personalizadas"
            valor={filtros.modalidad ?? ""}
            opciones={[
              { valor: "GRUPAL", texto: "Grupales" },
              { valor: "PERSONALIZADA", texto: "Personalizadas" },
            ]}
            onChange={(valor) => setFiltros((actual) => ({ ...actual, modalidad: valor === "GRUPAL" || valor === "PERSONALIZADA" ? valor : null }))}
          />
        </GrupoDeFiltros>

        {consulta.isPending && <CargandoReporte />}
        {consulta.isError && <ErrorDelReporte error={consulta.error} reintentando={consulta.isFetching} onReintentar={() => void consulta.refetch()} />}
        {informe && horarios.length === 0 && (
          <ReporteVacio icono={<CalendarClock className="size-7" />} titulo="No hay horarios para estos filtros" texto="Probá sacar algún filtro." />
        )}
        {informe && horarios.length > 0 && (
          <div className="flex flex-col gap-5">
            <ResumenEnTarjetas
              datos={[
                { etiqueta: "Horarios", valor: String(informe.totalHorarios) },
                { etiqueta: "Completos", valor: String(informe.porNivel.COMPLETO), nota: `${informe.porNivel.CASI_LLENO} casi llenos` },
                { etiqueta: "Libres", valor: String(informe.porNivel.LIBRE), nota: "Menos del 60 %" },
                { etiqueta: "Ocupación total", valor: formatearPorcentaje(informe.ocupacionTotal) },
              ]}
              aclaracion="Inscriptos activos sobre el cupo de cada horario. Libre: menos del 60 %; moderado: hasta 84 %; casi lleno: hasta 99 %."
            />

            <div className="flex items-center justify-start">
              <div role="group" aria-label="Vista del reporte" className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  aria-pressed={vista === "mapa"}
                  onClick={() => setVista("mapa")}
                  className={cn(
                    "min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors",
                    vista === "mapa"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                  )}
                >
                  Mapa de calor
                </button>
                <button
                  type="button"
                  aria-pressed={vista === "tabla"}
                  onClick={() => setVista("tabla")}
                  className={cn(
                    "min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors",
                    vista === "tabla"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                  )}
                >
                  Tabla
                </button>
              </div>
            </div>

            {vista === "mapa" ? (
              <MapaOcupacion horarios={horarios} />
            ) : (
              <TablaOcupacion horarios={horarios} />
            )}
          </div>
        )}
      </div>
      {impresion && <TablaImprimible tabla={impresion.datos} generadoEl={impresion.generadoEl} />}
    </PaginaReportes>
  );
}
