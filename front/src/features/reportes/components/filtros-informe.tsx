import { useState, type FormEvent } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BuscadorAlumno, type AlumnoElegido } from "@/features/reportes/components/buscador-alumno";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { useActividadesParaFiltro, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import { filtrosIniciales, type FiltrosDescritos } from "@/features/reportes/utils/formato-informe";
import type { FiltrosInformeAsistencia } from "@/types/reportes";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";

// Filtros del informe (US-33): se combinan libremente y se aplican con "Generar informe".

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
  generando: boolean;
  onGenerar: (filtros: FiltrosInformeAsistencia, descripcion: FiltrosDescritos) => void;
}

export function FiltrosInforme({ generando, onGenerar }: PropsFiltros) {
  const hoy = fechaActualArgentina();
  const [borrador, setBorrador] = useState(() => borradorInicial(hoy));
  const [error, setError] = useState<string | null>(null);
  const profesoras = useProfesorasParaFiltro();
  const actividades = useActividadesParaFiltro();
  const cambiar = (cambios: Partial<Borrador>) => setBorrador((actual) => ({ ...actual, ...cambios }));

  function generar(borradorAGenerar: Borrador) {
    const problema = problemaDelPeriodo(borradorAGenerar);
    setError(problema);
    if (problema) return;
    const profesora = profesoras.data?.find((p) => p.id === borradorAGenerar.idProfesora);
    const actividad = actividades.data?.find((a) => a.id === borradorAGenerar.idActividad);
    onGenerar(
      {
        desde: borradorAGenerar.desde,
        hasta: borradorAGenerar.hasta,
        idAlumno: borradorAGenerar.alumno?.id ?? null,
        idProfesora: borradorAGenerar.idProfesora ? Number(borradorAGenerar.idProfesora) : null,
        idActividad: borradorAGenerar.idActividad ? Number(borradorAGenerar.idActividad) : null,
        incluirBajas: borradorAGenerar.incluirBajas,
      },
      {
        alumno: borradorAGenerar.alumno?.nombre ?? null,
        profesora: profesora ? `${profesora.nombre} ${profesora.apellido}` : null,
        actividad: actividad?.nombre ?? null,
        incluirBajas: borradorAGenerar.incluirBajas,
      },
    );
  }

  function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    generar(borrador);
  }

  function limpiar() {
    const inicial = borradorInicial(hoy);
    setBorrador(inicial);
    generar(inicial);
  }

  return (
    <form onSubmit={alEnviar} noValidate aria-label="Filtros del informe" className="space-y-4">
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
          <Select
            value={borrador.idProfesora || "TODAS"}
            onValueChange={(val) => cambiar({ idProfesora: val === "TODAS" ? "" : val })}
          >
            <SelectTrigger
              id="informe-profesora"
              className={cn(CONTROL, "justify-between px-3.5 focus:border-primary focus:ring-2 focus:ring-primary/20")}
            >
              <SelectValue placeholder="Todo el equipo" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <SelectItem
                value="TODAS"
                className="cursor-pointer rounded-xl font-medium focus:bg-primary/10 focus:text-primary data-[state=checked]:font-bold data-[state=checked]:text-primary"
              >
                Todo el equipo
              </SelectItem>
              {profesoras.data?.map((p) => (
                <SelectItem
                  key={p.id}
                  value={String(p.id)}
                  className="cursor-pointer rounded-xl font-medium focus:bg-primary/10 focus:text-primary data-[state=checked]:font-bold data-[state=checked]:text-primary"
                >
                  {`${p.nombre} ${p.apellido}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="informe-actividad" className={ETIQUETA}>
            Actividad
          </label>
          <Select
            value={borrador.idActividad || "TODAS"}
            onValueChange={(val) => cambiar({ idActividad: val === "TODAS" ? "" : val })}
          >
            <SelectTrigger
              id="informe-actividad"
              className={cn(CONTROL, "justify-between px-3.5 focus:border-primary focus:ring-2 focus:ring-primary/20")}
            >
              <SelectValue placeholder="Todas las actividades" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <SelectItem
                value="TODAS"
                className="cursor-pointer rounded-xl font-medium focus:bg-primary/10 focus:text-primary data-[state=checked]:font-bold data-[state=checked]:text-primary"
              >
                Todas las actividades
              </SelectItem>
              {actividades.data?.map((a) => (
                <SelectItem
                  key={a.id}
                  value={String(a.id)}
                  className="cursor-pointer rounded-xl font-medium focus:bg-primary/10 focus:text-primary data-[state=checked]:font-bold data-[state=checked]:text-primary"
                >
                  {a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={limpiar}
            disabled={generando}
            className="min-h-[44px] rounded-xl font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            <RotateCcw aria-hidden="true" className="size-4 mr-1.5" />
            Limpiar filtros
          </Button>
          <Button
            type="submit"
            disabled={generando}
            className="min-h-[44px] rounded-xl bg-primary px-5 font-extrabold text-white shadow-md shadow-primary/25 hover:bg-primary-dark transition-all"
          >
            {generando && <Loader2 aria-hidden="true" className="animate-spin size-4 mr-1.5" />}
            Generar informe
          </Button>
        </div>
      </div>
    </form>
  );
}
