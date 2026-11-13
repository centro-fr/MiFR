import { useMemo, useState, useEffect } from "react";
import { PestanasFiltro } from "@/components/ui/pestanas-filtro";
import { CalendarClock } from "lucide-react";
import { MenuExportar } from "@/components/menu-exportar";
import { PaginacionTabla } from "@/components/ui/paginacion-tabla";
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

const NIVEL: Record<NivelOcupacion, { texto: string; badge: string; dot: string; barra: string }> = {
  COMPLETO: {
    texto: "Completo",
    badge: "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300",
    dot: "bg-rose-500",
    barra: "bg-rose-500",
  },
  CASI_LLENO: {
    texto: "Casi lleno",
    badge: "border-orange-200/60 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-950/40 dark:text-orange-300",
    dot: "bg-orange-500",
    barra: "bg-orange-400",
  },
  MODERADO: {
    texto: "Moderado",
    badge: "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
    barra: "bg-amber-400",
  },
  LIBRE: {
    texto: "Libre",
    badge: "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    barra: "bg-emerald-500",
  },
  SIN_CUPO: {
    texto: "Sin cupo",
    badge: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
    barra: "bg-slate-400",
  },
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
    titulo: "Ocupación",
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
  const TAMANO_PAGINA = 10;
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    setPagina(0);
  }, [horarios]);

  const horariosPaginados = useMemo(() => {
    const inicio = pagina * TAMANO_PAGINA;
    return horarios.slice(inicio, inicio + TAMANO_PAGINA);
  }, [horarios, pagina]);

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
            {horariosPaginados.map((h) => (
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
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs",
                      NIVEL[h.nivel].badge,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full shrink-0", NIVEL[h.nivel].dot)} aria-hidden="true" />
                    {NIVEL[h.nivel].texto}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {horarios.length > TAMANO_PAGINA && (
        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <PaginacionTabla
            pagina={pagina}
            total={horarios.length}
            tamanoPagina={TAMANO_PAGINA}
            onCambiarPagina={setPagina}
            etiquetaItems="horarios"
          />
        </div>
      )}
    </SeccionReporte>
  );
}

const SIN_FILTROS: FiltrosOcupacion = { idActividad: null, idProfesora: null, modalidad: null };

export function OcupacionReportePage() {
  const [vista, setVista] = useState<"mapa" | "tabla">("mapa");
  const [filtros, setFiltros] = useState<FiltrosOcupacion>(SIN_FILTROS);
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
    <PaginaReportes
      titulo="Ocupación"
      subtitulo={detalle}
      acciones={<MenuExportar disabled={horarios.length === 0} preparando={preparando} onExportar={(formato) => void exportar(formato)} />}
    >
      <div className="min-w-0 space-y-6">
        <GrupoDeFiltros
          onLimpiar={() => setFiltros(SIN_FILTROS)}
          hayFiltros={filtros.idActividad !== null || filtros.idProfesora !== null || filtros.modalidad !== null}
        >
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
                { etiqueta: "Completos", valor: String(informe.porNivel.COMPLETO) },
                { etiqueta: "Libres", valor: String(informe.porNivel.LIBRE) },
                { etiqueta: "Ocupación total", valor: formatearPorcentaje(informe.ocupacionTotal) },
              ]}
            />

            <div className="flex items-center justify-start">
              <PestanasFiltro
                etiqueta="Vista del reporte"
                opciones={[
                  { id: "mapa", etiqueta: "Mapa de calor" },
                  { id: "tabla", etiqueta: "Tabla" },
                ]}
                valor={vista}
                onCambiar={setVista}
              />
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
