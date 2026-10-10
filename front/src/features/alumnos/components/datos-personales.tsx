import { ExternalLink } from "lucide-react";
import { DatoFicha, SeccionFicha, SinDato } from "@/features/alumnos/components/seccion-ficha";
import {
  calcularEdad,
  enlaceTelefono,
  enlaceWhatsApp,
  formatearDni,
  formatearFecha,
  textoEdad,
} from "@/features/alumnos/utils/formato-ficha";
import type { FichaAlumno, ResponsableAlumno } from "@/types/alumno";

const CLASE_ENLACE = "font-bold text-primary-dark underline-offset-4 hover:underline dark:text-pink-300";

function Telefono({ telefono }: { telefono: string | null }) {
  if (!telefono) return <SinDato />;
  const whatsapp = enlaceWhatsApp(telefono);
  return (
    <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <a href={enlaceTelefono(telefono)} className={CLASE_ENLACE}>
        {telefono}
      </a>
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300"
        >
          Abrir WhatsApp
          <ExternalLink aria-hidden="true" className="size-3.5" />
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      )}
    </span>
  );
}

function InformacionBasica({ alumno }: { alumno: FichaAlumno }) {
  return (
    <SeccionFicha titulo="Información básica" colorPunto="bg-primary">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <DatoFicha etiqueta="Nombre y apellido">
            {alumno.nombre} {alumno.apellido}
          </DatoFicha>
        </div>
        <DatoFicha etiqueta="Fecha de nacimiento">{formatearFecha(alumno.fechaNacimiento)}</DatoFicha>
        <DatoFicha etiqueta="Edad">{textoEdad(calcularEdad(alumno.fechaNacimiento))}</DatoFicha>
        <DatoFicha etiqueta="DNI">{alumno.dni ? formatearDni(alumno.dni) : <SinDato />}</DatoFicha>
      </dl>
    </SeccionFicha>
  );
}

function DatosResponsable({ responsable }: { responsable: ResponsableAlumno }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tutor/a a cargo</h3>
      <dl className="flex flex-col gap-3">
        <DatoFicha etiqueta="Nombre y apellido">
          {responsable.nombre} {responsable.apellido}
        </DatoFicha>
        <DatoFicha etiqueta="Teléfono">
          <Telefono telefono={responsable.telefono} />
        </DatoFicha>
        <DatoFicha etiqueta="Correo electrónico">{responsable.email ?? <SinDato />}</DatoFicha>
      </dl>
    </div>
  );
}

function ViasDeContacto({ alumno }: { alumno: FichaAlumno }) {
  const { nombre: nombreEmergencia, telefono: telefonoEmergencia } = alumno.contactoEmergencia;
  return (
    <SeccionFicha titulo="Vías de contacto" colorPunto="bg-blue-500">
      <dl className="flex flex-col gap-3">
        <DatoFicha etiqueta="Teléfono">
          <Telefono telefono={alumno.telefono} />
        </DatoFicha>
        <DatoFicha etiqueta="Contacto de emergencia">
          {nombreEmergencia || telefonoEmergencia ? (
            <span className="flex flex-col gap-0.5">
              {nombreEmergencia && <span>{nombreEmergencia}</span>}
              {telefonoEmergencia && <Telefono telefono={telefonoEmergencia} />}
            </span>
          ) : (
            <SinDato />
          )}
        </DatoFicha>
        <DatoFicha etiqueta="Correo electrónico">{alumno.email ?? <SinDato />}</DatoFicha>
        <DatoFicha etiqueta="Dirección">{alumno.direccion ?? <SinDato />}</DatoFicha>
      </dl>
      {alumno.responsable && <DatosResponsable responsable={alumno.responsable} />}
    </SeccionFicha>
  );
}

function textoAptoMedico(alumno: FichaAlumno): string {
  if (!alumno.aptoMedico) return "No presentado";
  return alumno.fechaAptoMedico ? `Presentado el ${formatearFecha(alumno.fechaAptoMedico)}` : "Presentado";
}

function AptoMedicoYObservaciones({ alumno }: { alumno: FichaAlumno }) {
  return (
    <SeccionFicha
      titulo="Apto médico y observaciones"
      colorPunto="bg-slate-400"
      aclaracion="Visible para la propietaria y las profesoras a cargo."
    >
      <dl className="flex flex-col gap-3">
        <DatoFicha etiqueta="Apto médico">
          <span className={alumno.aptoMedico ? undefined : "font-bold text-rose-700 dark:text-rose-300"}>
            {textoAptoMedico(alumno)}
          </span>
        </DatoFicha>
        <DatoFicha etiqueta="Observaciones">
          {alumno.observaciones ? (
            <span className="whitespace-pre-line leading-relaxed">{alumno.observaciones}</span>
          ) : (
            <SinDato texto="Sin observaciones" />
          )}
        </DatoFicha>
      </dl>
    </SeccionFicha>
  );
}

export function DatosPersonales({ alumno }: { alumno: FichaAlumno }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InformacionBasica alumno={alumno} />
        <ViasDeContacto alumno={alumno} />
      </div>
      {/* Las mediciones (registros_progreso) van a la pestaña "Progreso y rutina" cuando el back las publique. */}
      <AptoMedicoYObservaciones alumno={alumno} />
    </div>
  );
}
