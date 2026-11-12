import { useState } from "react";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { BuscadorAlumno, type AlumnoElegido } from "@/features/reportes/components/buscador-alumno";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { BotonLimpiarFiltros } from "@/features/reportes/components/piezas-reporte";
import { useActividadesParaFiltro, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import { filtrosIniciales, type FiltrosDescritos } from "@/features/reportes/utils/formato-informe";
import type { FiltrosInformeAsistencia } from "@/types/reportes";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";

// Filtros del informe (US-33): se combinan libremente y se aplican al cambiar cada uno, como en el
// resto de los reportes. El período se aplica recién cuando las dos fechas son válidas.

const CONTROL =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-rose-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer";
const CONTROL_FECHA = cn(CONTROL, "pr-11 md:text-sm font-semibold");
const ETIQUETA = "text-xs font-bold text-slate-700 dark:text-slate-300";
const FECHA_COMPLETA = /^\d{4}-\d{2}-\d{2}$/;
const TODAS = "";

interface Borrador {
  desde: string;
  hasta: string;
  alumno: AlumnoElegido | null;
  idProfesora: string;
  idActividad: string;
  incluirBajas: boolean;
}

function borradorInicial(hoy: string): Borrador {
  const { desde, hasta } = filtrosIniciales(hoy);
  return { desde, hasta, alumno: null, idProfesora: TODAS, idActividad: TODAS, incluirBajas: false };
}

function problemaDelPeriodo({ desde, hasta }: Borrador): string | null {
  if (!desde || !hasta) return "Elegí las dos fechas del período.";
  if (!FECHA_COMPLETA.test(desde) || !FECHA_COMPLETA.test(hasta)) return "Ingresá fechas válidas, como 01/10/2026.";
  return hasta < desde ? "La fecha de fin no puede ser anterior a la de inicio." : null;
}

interface PropsFiltros {
  onAplicar: (filtros: FiltrosInformeAsistencia, descripcion: FiltrosDescritos) => void;
}

export function FiltrosInforme({ onAplicar }: PropsFiltros) {
  const hoy = fechaActualArgentina();
  const [borrador, setBorrador] = useState(() => borradorInicial(hoy));
  const profesoras = useProfesorasParaFiltro();
  const actividades = useActividadesParaFiltro();
  const error = problemaDelPeriodo(borrador);
  const hayFiltros = JSON.stringify(borrador) !== JSON.stringify(borradorInicial(hoy));

  function aplicar(siguiente: Borrador) {
    setBorrador(siguiente);
    if (problemaDelPeriodo(siguiente)) return;
    const profesora = profesoras.data?.find((p) => p.id === siguiente.idProfesora);
    const actividad = actividades.data?.find((a) => a.id === siguiente.idActividad);
    onAplicar(
      {
        desde: siguiente.desde,
        hasta: siguiente.hasta,
        idAlumno: siguiente.alumno?.id ?? null,
        idProfesora: siguiente.idProfesora ? Number(siguiente.idProfesora) : null,
        idActividad: siguiente.idActividad ? Number(siguiente.idActividad) : null,
        incluirBajas: siguiente.incluirBajas,
      },
      {
        alumno: siguiente.alumno?.nombre ?? null,
        profesora: profesora ? `${profesora.nombre} ${profesora.apellido}` : null,
        actividad: actividad?.nombre ?? null,
        incluirBajas: siguiente.incluirBajas,
      },
    );
  }

  const cambiar = (cambios: Partial<Borrador>) => aplicar({ ...borrador, ...cambios });

  return (
    <div role="group" aria-label="Filtros del informe" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="informe-desde" className={ETIQUETA}>
            Desde
          </label>
          <CampoFecha
            id="informe-desde"
            etiquetaCalendario="Abrir calendario para el inicio del período"
            max={hoy}
            value={borrador.desde}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "informe-periodo-error" : undefined}
            onChange={(desde) => cambiar({ desde })}
            className={CONTROL_FECHA}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="informe-hasta" className={ETIQUETA}>
            Hasta
          </label>
          <CampoFecha
            id="informe-hasta"
            etiquetaCalendario="Abrir calendario para el fin del período"
            value={borrador.hasta}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "informe-periodo-error" : undefined}
            onChange={(hasta) => cambiar({ hasta })}
            className={CONTROL_FECHA}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="informe-profesora" className={ETIQUETA}>
            Profesor/a
          </label>
          <SelectorDesplegable
            id="informe-profesora"
            aria-label="Profesor/a"
            valor={borrador.idProfesora}
            todos="Todo el equipo"
            opciones={
              profesoras.data?.map((p) => ({
                valor: String(p.id),
                texto: `${p.nombre} ${p.apellido}`,
              })) ?? []
            }
            onChange={(val) => cambiar({ idProfesora: val })}
            variante="formulario"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="informe-actividad" className={ETIQUETA}>
            Actividad
          </label>
          <SelectorDesplegable
            id="informe-actividad"
            aria-label="Actividad"
            valor={borrador.idActividad}
            todos="Todas las actividades"
            opciones={
              actividades.data?.map((a) => ({
                valor: String(a.id),
                texto: a.nombre,
              })) ?? []
            }
            onChange={(val) => cambiar({ idActividad: val })}
            variante="formulario"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-4 flex flex-col gap-1.5">
          <label htmlFor="informe-alumno" className={ETIQUETA}>
            Alumno (opcional)
          </label>
          <BuscadorAlumno
            id="informe-alumno"
            elegido={borrador.alumno}
            onElegir={(alumno) => cambiar({ alumno })}
            className={CONTROL}
          />
        </div>
      </div>

      {error && (
        <p id="informe-periodo-error" role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={borrador.incluirBajas}
            onChange={(evento) => cambiar({ incluirBajas: evento.target.checked })}
            className="size-4.5 rounded shrink-0 accent-primary"
          />
          Incluir alumnos dados de baja
        </label>

        <BotonLimpiarFiltros hayFiltros={hayFiltros} onLimpiar={() => aplicar(borradorInicial(hoy))} />
      </div>
    </div>
  );
}
