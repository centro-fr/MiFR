import { createPortal } from "react-dom";
import type { InformeHonorarios, LiquidacionDetalle, LineaAlumno, LineaSuplencia } from "@/types/honorarios";
import {
  ETIQUETA_ESTADO,
  alumnosDelMes,
  describirTarifa,
  fechaCorta,
  fechaHora,
  leyendaDelTotal,
  nombreCompleto,
  quienDeLaSuplencia,
} from "@/features/honorarios/utils/formato-honorarios";
import { etiquetaPeriodo } from "@/features/honorarios/utils/periodo";
import { formatearPrecio } from "@/utils/moneda";

// Versión para imprimir o "Guardar como PDF" (US-23). Va directo en <body> y la regla de impresión
// de index.css oculta todo lo demás: sale el informe solo, sin menú ni botones. Colores fijos y sin
// `dark:`: el papel es blanco aunque la app esté en modo oscuro.

export interface PlanParaImpresion {
  nombre: string;
  precio: number;
}

export interface DatosImpresion {
  informe: InformeHonorarios;
  detalles: LiquidacionDetalle[];
  generadoEl: string;
  planes?: PlanParaImpresion[];
}

const CELDA = "border-b border-slate-200 px-2 py-1.5 text-left align-top";
const CELDA_MONTO = `${CELDA} text-right tabular-nums whitespace-nowrap`;

function FilaAlumno({ linea }: { linea: LineaAlumno }) {
  const actividad = linea.actividad ?? linea.inscripcion?.actividad ?? "—";
  return (
    <tr>
      <td className={CELDA}>{`${linea.alumno.apellido}, ${linea.alumno.nombre}`}</td>
      <td className={CELDA}>{actividad}</td>
      <td className={CELDA}>{linea.inscripcion?.plan ?? "—"}</td>
      <td className={CELDA_MONTO}>{formatearPrecio(linea.monto)}</td>
    </tr>
  );
}

function FilaSuplencia({ linea }: { linea: LineaSuplencia }) {
  const { clase } = linea;
  return (
    <tr>
      <td className={CELDA}>{`${clase.actividad}, ${fechaCorta(clase.fecha)} ${clase.horaInicio}–${clase.horaFin}`}</td>
      <td className={CELDA}>{quienDeLaSuplencia(linea)}</td>
      <td className={CELDA}>{describirTarifa(linea.tarifa, "HORA_SUPLENCIA")}</td>
      <td className={CELDA_MONTO}>{formatearPrecio(linea.monto)}</td>
    </tr>
  );
}

function Encabezados({ columnas }: { columnas: string[] }) {
  return (
    <thead>
      <tr className="text-xs uppercase text-slate-600">
        {columnas.map((columna, indice) => (
          <th key={columna} className={indice === columnas.length - 1 ? `${CELDA} text-right` : CELDA}>
            {columna}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function SeccionProfesora({ detalle }: { detalle: LiquidacionDetalle }) {
  const sinLineas = detalle.alumnos.length === 0 && detalle.suplencias.length === 0;

  // Los alumnos de cada profesora se ordenan primero por actividad y luego alfabéticamente por apellido y nombre.
  const alumnosOrdenados = [...detalle.alumnos].sort((a, b) => {
    const actA = a.actividad ?? a.inscripcion?.actividad ?? "";
    const actB = b.actividad ?? b.inscripcion?.actividad ?? "";
    const compAct = actA.localeCompare(actB, "es");
    if (compAct !== 0) return compAct;
    return a.alumno.apellido.localeCompare(b.alumno.apellido, "es") || a.alumno.nombre.localeCompare(b.alumno.nombre, "es");
  });

  return (
    <section className="mt-6 break-inside-avoid">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-slate-800 pb-1">
        <h2 className="text-base font-bold">
          {nombreCompleto(detalle.profesora)} <span className="text-sm font-normal text-slate-600">· {ETIQUETA_ESTADO[detalle.estado]}</span>
        </h2>
        <p className="text-base font-bold tabular-nums">{formatearPrecio(detalle.montoTotal)}</p>
      </div>
      {sinLineas && <p className="mt-2 text-sm text-slate-600">Sin alumnos a cargo ni suplencias en el período: honorario $ 0.</p>}
      {alumnosOrdenados.length > 0 && (
        <table className="mt-2 w-full border-collapse text-sm">
          <Encabezados columnas={["Alumno", "Actividad", "Plan", "Honorario"]} />
          <tbody>
            {alumnosOrdenados.map((linea) => (
              <FilaAlumno key={linea.id} linea={linea} />
            ))}
          </tbody>
        </table>
      )}
      {detalle.suplencias.length > 0 && (
        <table className="mt-2 w-full border-collapse text-sm">
          <Encabezados columnas={["Suplencia", "Quién", "Tarifa", "Ajuste"]} />
          <tbody>
            {detalle.suplencias.map((linea) => (
              <FilaSuplencia key={linea.id} linea={linea} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function InformeImprimible({ informe, detalles, generadoEl, planes = [] }: DatosImpresion) {
  // Obtenemos los planes con precio a mostrar en la tabla inicial.
  // Si no se pasaron por prop, intentamos deducirlos de las líneas de los alumnos.
  const planesAMostrar: PlanParaImpresion[] = planes.length > 0
    ? planes
    : Array.from(
        new Map(
          detalles.flatMap((d) =>
            d.alumnos
              .filter((a) => a.inscripcion?.plan)
              .map((a) => [a.inscripcion!.plan, { nombre: a.inscripcion!.plan, precio: a.monto * 2 }]),
          ),
        ).values(),
      );

  return createPortal(
    <div className="informe-impresion bg-white font-sans text-slate-900">
      <header className="border-b border-slate-300 pb-3">
        <p className="text-sm font-semibold text-slate-600">Centro de Entrenamiento FR</p>
        <h1 className="mt-1 text-2xl font-bold">Informe de honorarios · {etiquetaPeriodo(informe.periodo)}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Del {fechaCorta(informe.desde)} al {fechaCorta(informe.hasta)} · Generado el {fechaHora(generadoEl)}
        </p>
      </header>
      <section className="mt-4 flex items-baseline justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">Total del mes</p>
          <p className="text-sm text-slate-600">{leyendaDelTotal(alumnosDelMes(informe.liquidaciones))}</p>
        </div>
        <p className="text-2xl font-bold tabular-nums">{formatearPrecio(informe.totalGeneral)}</p>
      </section>

      {/* Tabla inicial de precios de planes y aclaración de tarifa del 50% */}
      <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Precios de planes</h3>
          <span className="text-xs font-semibold text-slate-600">Tarifa por alumno: 50% de lo cobrado</span>
        </div>
        {planesAMostrar.length > 0 && (
          <table className="mt-2 w-full max-w-sm border-collapse text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="py-1 text-left font-medium">Plan</th>
                <th className="py-1 text-right font-medium">Precio</th>
              </tr>
            </thead>
            <tbody>
              {planesAMostrar.map((plan) => (
                <tr key={plan.nombre} className="border-t border-slate-100">
                  <td className="py-1 text-slate-700">{plan.nombre}</td>
                  <td className="py-1 text-right font-semibold tabular-nums text-slate-900">{formatearPrecio(plan.precio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {detalles.map((detalle) => (
        <SeccionProfesora key={detalle.id} detalle={detalle} />
      ))}
    </div>,
    document.body,
  );
}
