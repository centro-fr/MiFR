import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ALUMNOS_POR_PAGINA } from "@/features/reportes/api/reportes-api";
import { formatearPorcentaje } from "@/features/reportes/utils/formato-informe";
import type { AsistenciaDeAlumno, AsistenciaDeProfesora, InformeAsistencia } from "@/types/reportes";

// Lo que muestra el informe de asistencia (US-33). En el celular cada fila es una tarjeta; desde md,
// una tabla. Las cifras van con números tabulares para que se puedan comparar en columna.

const TARJETA = "rounded-2xl border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5 dark:border-slate-700/80 dark:bg-slate-900";
const TH = "px-3 py-2.5 text-left text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400";
const TH_NUMERO = `${TH} text-right`;
const TD = "border-t border-slate-100 px-3 py-2.5 dark:border-slate-800";
const TD_NUMERO = `${TD} text-right tabular-nums`;

export function ResumenDelInforme({ informe }: { informe: InformeAsistencia }) {
  const { resumen } = informe;
  const datos: [string, string][] = [
    ["Clases dictadas", String(resumen.clasesDictadas)],
    ["Asistencias", String(resumen.asistencias)],
    ["Inasistencias", String(resumen.inasistencias)],
    ["Asistencia general", formatearPorcentaje(resumen.porcentaje)],
  ];
  return (
    <section aria-label="Resumen del período">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {datos.map(([etiqueta, valor], indice) => (
          <div
            key={etiqueta}
            className={
              indice === datos.length - 1
                ? // Rosa oscuro y no el rosa de marca: el texto blanco chico necesita contraste 4,5:1.
                  "rounded-2xl bg-primary-dark p-4 text-white shadow-md shadow-primary/20"
                : "rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-900"
            }
          >
            <dt className={indice === datos.length - 1 ? "text-sm font-semibold text-white/90" : "text-sm font-semibold text-slate-500 dark:text-slate-400"}>
              {etiqueta}
            </dt>
            <dd className="mt-1 text-2xl font-black tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Cuentan solo las clases dictadas. Las inasistencias incluyen las que registró el cierre automático.
      </p>
    </section>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <Card role="region" aria-labelledby={id} className={TARJETA}>
      <h2 id={id} className="text-base font-extrabold text-slate-900 dark:text-white">
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function DatoDeTarjeta({ etiqueta, valor }: { etiqueta: string; valor: string | number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="font-bold text-slate-900 tabular-nums dark:text-white">{valor}</dd>
    </div>
  );
}

export function PorProfesora({ profesoras }: { profesoras: AsistenciaDeProfesora[] }) {
  return (
    <Seccion id="titulo-por-profesora" titulo="Por profesora">
      <ul className="flex flex-col gap-2 md:hidden">
        {profesoras.map((p) => (
          <li key={p.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold text-slate-900 dark:text-white">{`${p.nombre} ${p.apellido}`}</p>
              <p className="font-black text-slate-900 tabular-nums dark:text-white">{formatearPorcentaje(p.porcentajePromedio)}</p>
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <DatoDeTarjeta etiqueta="Clases" valor={p.clasesDictadas} />
              <DatoDeTarjeta etiqueta="Alumnos" valor={p.cantidadAlumnos} />
              <DatoDeTarjeta etiqueta="Asistencias" valor={p.asistencias} />
            </dl>
          </li>
        ))}
      </ul>
      <table className="hidden w-full border-collapse text-sm md:table">
        <thead>
          <tr>
            <th scope="col" className={TH}>Profesora</th>
            <th scope="col" className={TH_NUMERO}>Clases dictadas</th>
            <th scope="col" className={TH_NUMERO}>Alumnos</th>
            <th scope="col" className={TH_NUMERO}>Asistencias</th>
            <th scope="col" className={TH_NUMERO}>% promedio</th>
          </tr>
        </thead>
        <tbody>
          {profesoras.map((p) => (
            <tr key={p.id}>
              <th scope="row" className={`${TD} text-left font-semibold text-slate-900 dark:text-white`}>{`${p.nombre} ${p.apellido}`}</th>
              <td className={TD_NUMERO}>{p.clasesDictadas}</td>
              <td className={TD_NUMERO}>{p.cantidadAlumnos}</td>
              <td className={TD_NUMERO}>{p.asistencias}</td>
              <td className={`${TD_NUMERO} font-bold text-slate-900 dark:text-white`}>{formatearPorcentaje(p.porcentajePromedio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Seccion>
  );
}

function NombreDelAlumno({ alumno }: { alumno: AsistenciaDeAlumno }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {`${alumno.apellido}, ${alumno.nombre}`}
      {alumno.dadoDeBaja && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">Dado de baja</span>
      )}
    </span>
  );
}

interface PropsPaginacion {
  offset: number;
  total: number;
  cargando: boolean;
  onCambiar: (offset: number) => void;
}

function Paginacion({ offset, total, cargando, onCambiar }: PropsPaginacion) {
  if (total <= ALUMNOS_POR_PAGINA) return null;
  const hasta = Math.min(offset + ALUMNOS_POR_PAGINA, total);
  return (
    <nav aria-label="Páginas de alumnos" className="mt-3 flex items-center justify-between gap-2">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {offset + 1}–{hasta} de {total}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={cargando || offset === 0}
          onClick={() => onCambiar(Math.max(offset - ALUMNOS_POR_PAGINA, 0))}
          className="min-h-11 rounded-xl font-bold"
        >
          <ChevronLeft aria-hidden="true" />
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={cargando || hasta >= total}
          onClick={() => onCambiar(offset + ALUMNOS_POR_PAGINA)}
          className="min-h-11 rounded-xl font-bold"
        >
          Siguiente
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

interface PropsPorAlumno {
  informe: InformeAsistencia;
  cargando: boolean;
  onCambiarPagina: (offset: number) => void;
}

export function PorAlumno({ informe, cargando, onCambiarPagina }: PropsPorAlumno) {
  const { alumnos } = informe;
  return (
    <Seccion id="titulo-por-alumno" titulo={`Por alumno (${informe.totalAlumnos})`}>
      <div aria-busy={cargando} className={cargando ? "opacity-60 transition-opacity" : undefined}>
        <ul className="flex flex-col gap-2 md:hidden">
          {alumnos.map((a) => (
            <li key={a.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-bold text-slate-900 dark:text-white">
                  <NombreDelAlumno alumno={a} />
                </p>
                <p className="shrink-0 font-black text-slate-900 tabular-nums dark:text-white">{formatearPorcentaje(a.porcentaje)}</p>
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <DatoDeTarjeta etiqueta="Previstas" valor={a.clasesPrevistas} />
                <DatoDeTarjeta etiqueta="Asistió" valor={a.asistencias} />
                <DatoDeTarjeta etiqueta="Faltó" valor={a.inasistencias} />
              </dl>
            </li>
          ))}
        </ul>
        <table className="hidden w-full border-collapse text-sm md:table">
          <thead>
            <tr>
              <th scope="col" className={TH}>Alumno</th>
              <th scope="col" className={TH_NUMERO}>Clases previstas</th>
              <th scope="col" className={TH_NUMERO}>Asistencias</th>
              <th scope="col" className={TH_NUMERO}>Inasistencias</th>
              <th scope="col" className={TH_NUMERO}>% asistencia</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a) => (
              <tr key={a.id}>
                <th scope="row" className={`${TD} text-left font-semibold text-slate-900 dark:text-white`}>
                  <NombreDelAlumno alumno={a} />
                </th>
                <td className={TD_NUMERO}>{a.clasesPrevistas}</td>
                <td className={TD_NUMERO}>{a.asistencias}</td>
                <td className={TD_NUMERO}>{a.inasistencias}</td>
                <td className={`${TD_NUMERO} font-bold text-slate-900 dark:text-white`}>{formatearPorcentaje(a.porcentaje)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion offset={informe.offset} total={informe.totalAlumnos} cargando={cargando} onCambiar={onCambiarPagina} />
    </Seccion>
  );
}
