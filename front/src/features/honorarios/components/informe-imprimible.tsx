import { createPortal } from "react-dom";
import type { InformeHonorarios, LiquidacionDetalle, LineaAlumno, LineaSuplencia } from "@/types/honorarios";
import {
  ETIQUETA_ESTADO,
  baseCobrada,
  describirTarifa,
  fechaCorta,
  fechaHora,
  nombreCompleto,
} from "@/features/honorarios/utils/formato-honorarios";
import { etiquetaPeriodo } from "@/features/honorarios/utils/periodo";
import { formatearPrecio } from "@/utils/moneda";

// Versión para imprimir o "Guardar como PDF" (US-23). Va directo en <body> y la regla de impresión
// de index.css oculta todo lo demás: sale el informe solo, sin menú ni botones. Colores fijos y sin
// `dark:`: el papel es blanco aunque la app esté en modo oscuro.

export interface DatosImpresion {
  informe: InformeHonorarios;
  detalles: LiquidacionDetalle[];
  generadoEl: string;
}

const CELDA = "border-b border-slate-200 px-2 py-1.5 text-left align-top";
const CELDA_MONTO = `${CELDA} text-right tabular-nums whitespace-nowrap`;

function FilaAlumno({ linea }: { linea: LineaAlumno }) {
  const base = baseCobrada(linea.monto, linea.tarifa);
  return (
    <tr>
      <td className={CELDA}>{`${linea.alumno.apellido}, ${linea.alumno.nombre}`}</td>
      <td className={CELDA}>{linea.plan}</td>
      <td className={CELDA}>{linea.estadoInscripcion === "BAJA" && linea.fechaBaja ? `Baja el ${fechaCorta(linea.fechaBaja)}` : "Activa"}</td>
      <td className={CELDA}>
        {describirTarifa(linea.tarifa, "ALUMNO_A_CARGO")}
        {base !== null && ` (cobrado ${formatearPrecio(base)})`}
      </td>
      <td className={CELDA_MONTO}>{formatearPrecio(linea.monto)}</td>
    </tr>
  );
}

function FilaSuplencia({ linea }: { linea: LineaSuplencia }) {
  const { clase } = linea;
  return (
    <tr>
      <td className={CELDA}>{`${clase.actividad}, ${fechaCorta(clase.fecha)} ${clase.horaInicio}–${clase.horaFin}`}</td>
      <td className={CELDA}>
        {linea.concepto === "CLASE_SUPLIDA" ? `Cubrió a ${nombreCompleto(clase.ausente)}` : `La cubrió ${nombreCompleto(clase.suplente)}`}
      </td>
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
  return (
    <section className="mt-6 break-inside-avoid">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-slate-800 pb-1">
        <h2 className="text-base font-bold">
          {nombreCompleto(detalle.profesora)} <span className="text-sm font-normal text-slate-600">· {ETIQUETA_ESTADO[detalle.estado]}</span>
        </h2>
        <p className="text-base font-bold tabular-nums">{formatearPrecio(detalle.montoTotal)}</p>
      </div>
      {sinLineas && <p className="mt-2 text-sm text-slate-600">Sin alumnos a cargo ni suplencias en el período: honorario $ 0.</p>}
      {detalle.alumnos.length > 0 && (
        <table className="mt-2 w-full border-collapse text-sm">
          <Encabezados columnas={["Alumno", "Plan", "Situación", "Tarifa", "Honorario"]} />
          <tbody>
            {detalle.alumnos.map((linea) => (
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

export function InformeImprimible({ informe, detalles, generadoEl }: DatosImpresion) {
  const alumnos = informe.liquidaciones.reduce((total, fila) => total + fila.cantidadAlumnos, 0);
  return createPortal(
    <div className="informe-impresion bg-white font-sans text-slate-900">
      <header className="border-b border-slate-300 pb-3">
        <p className="text-sm font-semibold text-slate-600">Centro de Entrenamiento FR · MiFR</p>
        <h1 className="mt-1 text-2xl font-bold">Informe de honorarios · {etiquetaPeriodo(informe.periodo)}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Del {fechaCorta(informe.desde)} al {fechaCorta(informe.hasta)} · Generado el {fechaHora(generadoEl)}
        </p>
      </header>
      <section className="mt-4 flex items-baseline justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">Total del mes</p>
          <p className="text-sm text-slate-600">
            {alumnos} {alumnos === 1 ? "alumno a cargo" : "alumnos a cargo"} · se cuenta cada inscripto, asista o no
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums">{formatearPrecio(informe.totalGeneral)}</p>
      </section>
      {detalles.map((detalle) => (
        <SeccionProfesora key={detalle.id} detalle={detalle} />
      ))}
      <footer className="mt-8 border-t border-slate-300 pt-2 text-xs text-slate-600">
        Informe solo informativo: muestra el cálculo de los honorarios y no mueve dinero.
      </footer>
    </div>,
    document.body,
  );
}
