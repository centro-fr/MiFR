import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  calcularEdad,
  formatearDiaDeTimestamp,
  formatearDni,
  formatearFecha,
  inicialesDe,
  textoEdad,
} from "@/features/alumnos/utils/formato-ficha";
import { actividadesDe, formatearPrecio, textoHorarios } from "@/features/alumnos/utils/pendientes-de-alta";
import type { PreInscripcionPendiente } from "@/types/alta-definitiva";

const MAYORIA_DE_EDAD = 18;

interface AccionesProps {
  pendiente: PreInscripcionPendiente;
  puedeConfirmar: boolean;
  onConfirmar: (pendiente: PreInscripcionPendiente) => void;
}

function Acciones({ pendiente, puedeConfirmar, onConfirmar }: AccionesProps) {
  const nombre = `${pendiente.nombre} ${pendiente.apellido}`;
  return (
    <>
      <Button
        asChild
        variant="outline"
        className="inline-flex h-auto min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary pointer-fine:min-h-0 md:px-2.5 dark:border-white/15 dark:bg-transparent dark:text-slate-200"
      >
        <Link to={`/app/alumnos/${pendiente.idAlumno}`} aria-label={`Ver ficha de ${nombre}`}>
          Ver ficha
        </Link>
      </Button>
      {puedeConfirmar && (
        <Button
          type="button"
          onClick={() => onConfirmar(pendiente)}
          aria-label={`Confirmar alta de ${nombre}`}
          className="inline-flex h-auto min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg bg-primary px-3.5 py-1.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-primary-dark pointer-fine:min-h-0 md:px-3"
        >
          Confirmar alta
        </Button>
      )}
    </>
  );
}

function Avatar({ pendiente }: { pendiente: PreInscripcionPendiente }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-tr from-primary-dark to-primary text-sm font-bold text-white"
    >
      {inicialesDe(pendiente.nombre, pendiente.apellido)}
    </span>
  );
}

/** Edad, o "Menor · Tutor/a: …" para quien entra al sistema con su tutor. */
function Identidad({ pendiente }: { pendiente: PreInscripcionPendiente }) {
  const edad = calcularEdad(pendiente.fechaNacimiento);
  if (edad < MAYORIA_DE_EDAD && pendiente.tutor) {
    return (
      <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
        {textoEdad(edad)} · Tutor/a: {pendiente.tutor.nombre} {pendiente.tutor.apellido}
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">{textoEdad(edad)}</span>;
}

/** Fecha de la pre-inscripción y hasta cuándo guarda el lugar sin el primer pago. */
function FechaYReserva({ pendiente }: { pendiente: PreInscripcionPendiente }) {
  const { reserva } = pendiente;
  return (
    <span className="flex flex-col items-end gap-0.5 xl:items-start">
      <span>{formatearDiaDeTimestamp(pendiente.fechaPreInscripcion)}</span>
      {reserva &&
        (reserva.vencida ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
            Reserva vencida el {formatearFecha(reserva.vence)}
          </span>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">Lugar guardado hasta el {formatearFecha(reserva.vence)}</span>
        ))}
    </span>
  );
}

/** El teléfono del alumno o, si no tiene, el de su tutor/a. */
function Contacto({ pendiente }: { pendiente: PreInscripcionPendiente }) {
  if (pendiente.telefono) return <span className="font-semibold text-slate-800 dark:text-slate-100">{pendiente.telefono}</span>;
  if (pendiente.tutor?.telefono) {
    return (
      <span className="flex flex-col">
        <span className="font-semibold text-slate-800 dark:text-slate-100">{pendiente.tutor.telefono}</span>
        <span className="text-xs text-muted-foreground">Tel. del tutor/a</span>
      </span>
    );
  }
  return <span className="font-medium italic text-muted-foreground">Sin teléfono</span>;
}

function FilaPendiente(props: AccionesProps) {
  const { pendiente } = props;
  return (
    <TableRow className="hover:bg-slate-50 dark:hover:bg-white/5">
      <TableHead scope="row" className="px-6 py-4 font-normal">
        <div className="flex items-center gap-3">
          <Avatar pendiente={pendiente} />
          <div className="flex min-w-0 flex-col">
            <span className="font-bold text-slate-900 dark:text-white">
              {pendiente.nombre} {pendiente.apellido}
            </span>
            <span className="text-xs text-muted-foreground">
              {pendiente.dni ? `DNI ${formatearDni(pendiente.dni)}` : "Sin DNI"}
              {pendiente.email && ` · ${pendiente.email}`}
            </span>
          </div>
        </div>
      </TableHead>
      <TableCell className="px-4 py-4">
        <div className="flex flex-col">
          <Identidad pendiente={pendiente} />
          <span className="text-xs text-muted-foreground">{formatearFecha(pendiente.fechaNacimiento)}</span>
        </div>
      </TableCell>
      <TableCell className="px-4 py-4">
        <Contacto pendiente={pendiente} />
      </TableCell>
      <TableCell className="px-4 py-4">
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white">{pendiente.nombrePlan}</span>
          <span className="text-xs text-muted-foreground">{formatearPrecio(pendiente.precio)}</span>
        </div>
      </TableCell>
      <TableCell className="px-4 py-4">
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white">{pendiente.profesora}</span>
          <span className="text-xs font-semibold text-primary-dark dark:text-pink-300">{textoHorarios(pendiente.horarios)}</span>
          <span className="text-xs text-muted-foreground">{actividadesDe(pendiente.horarios)}</span>
        </div>
      </TableCell>
      <TableCell className="px-4 py-4 text-sm">
        <FechaYReserva pendiente={pendiente} />
      </TableCell>
      <TableCell className="px-6 py-4">
        <div className="flex justify-end gap-2">
          <Acciones {...props} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function DatoTarjeta({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="text-right font-bold text-slate-900 dark:text-white">{children}</dd>
    </div>
  );
}

function TarjetaPendiente(props: AccionesProps) {
  const { pendiente } = props;
  return (
    <li>
      <Card className="flex flex-col gap-3 rounded-xl border-border bg-white p-4 shadow-sm transition hover:border-pink-300 dark:border-slate-600 dark:bg-surface-low dark:hover:border-pink-500">
        <div className="flex items-center gap-2.5">
          <Avatar pendiente={pendiente} />
          <div className="flex min-w-0 flex-col">
            <span className="font-extrabold text-base text-[#181C26] dark:text-white">
              {pendiente.nombre} {pendiente.apellido}
            </span>
            <Identidad pendiente={pendiente} />
          </div>
        </div>
        <dl className="flex flex-col gap-1.5 rounded-xl bg-slate-50 p-2.5 text-sm dark:bg-white/5">
          <DatoTarjeta etiqueta="Plan">
            {pendiente.nombrePlan} ({formatearPrecio(pendiente.precio)})
          </DatoTarjeta>
          <DatoTarjeta etiqueta="Profesora">{pendiente.profesora}</DatoTarjeta>
          <DatoTarjeta etiqueta="Horario">{textoHorarios(pendiente.horarios)}</DatoTarjeta>
          <DatoTarjeta etiqueta="Contacto">
            <Contacto pendiente={pendiente} />
          </DatoTarjeta>
          <DatoTarjeta etiqueta="Pre-inscripción">
            <FechaYReserva pendiente={pendiente} />
          </DatoTarjeta>
        </dl>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Acciones {...props} />
        </div>
      </Card>
    </li>
  );
}

interface ListaPendientesProps {
  pendientes: PreInscripcionPendiente[];
  puedeConfirmar: boolean;
  onConfirmar: (pendiente: PreInscripcionPendiente) => void;
}

// Tabla en escritorio y tarjetas en mobile, como el diseño. Se oculta con CSS (display: none),
// así el lector de pantalla solo lee la versión visible. La tabla recién entra en xl: con el
// sidebar abierto, sus siete columnas no caben antes y "Acciones" quedaba fuera de la vista.
export function ListaPendientes({ pendientes, puedeConfirmar, onConfirmar }: ListaPendientesProps) {
  return (
    <>
      <Card className="hidden overflow-hidden rounded-2xl border-border bg-white shadow-sm xl:block dark:bg-surface-low">
        <div className="overflow-x-auto">
          <Table className="w-full text-left text-sm">
            <TableHeader>
              <TableRow className="border-b border-border bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:bg-white/5 dark:text-slate-200">
                <TableHead scope="col" className="px-6 py-4">Alumno</TableHead>
                <TableHead scope="col" className="px-4 py-4">Edad</TableHead>
                <TableHead scope="col" className="px-4 py-4">Contacto</TableHead>
                <TableHead scope="col" className="px-4 py-4">Plan elegido</TableHead>
                <TableHead scope="col" className="px-4 py-4">Profesora y horario</TableHead>
                <TableHead scope="col" className="px-4 py-4">Pre-inscripción</TableHead>
                <TableHead scope="col" className="px-6 py-4 text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-200 font-medium dark:divide-white/10">
              {pendientes.map((pendiente) => (
                <FilaPendiente key={pendiente.idInscripcion} pendiente={pendiente} puedeConfirmar={puedeConfirmar} onConfirmar={onConfirmar} />
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      <ul aria-label="Pre-inscripciones pendientes" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
        {pendientes.map((pendiente) => (
          <TarjetaPendiente key={pendiente.idInscripcion} pendiente={pendiente} puedeConfirmar={puedeConfirmar} onConfirmar={onConfirmar} />
        ))}
      </ul>
    </>
  );
}
