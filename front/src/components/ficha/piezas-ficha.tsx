import type { KeyboardEvent, ReactNode } from "react";
import { AppleMailIcon } from "@/components/icons/apple-mail-icon";
import { ApplePhoneIcon } from "@/components/icons/apple-phone-icon";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Card } from "@/components/ui/card";
import { enlaceTelefono, enlaceWhatsApp } from "@/features/alumnos/utils/formato-ficha";
import { cn } from "@/utils/cn";

// Piezas de las fichas de personas (alumno, profesora): mismo encabezado, mismas tarjetas de resumen,
// mismas pestañas y mismas filas de datos, para que las dos fichas se vean y se usen igual.

/** Círculo con iniciales y, abajo a la derecha, un punto verde (activo) o rojo (de baja). */
export function AvatarFicha({ iniciales, activo }: { iniciales: string; activo: boolean }) {
  return (
    <div className="relative inline-flex shrink-0">
      <span className="flex size-16 items-center justify-center rounded-full bg-pink-100 text-2xl font-black text-primary shadow-2xs dark:bg-pink-950/60 dark:text-pink-300">
        {iniciales}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-0.5 bottom-0.5 size-3.5 rounded-full ring-2 ring-white dark:ring-slate-900",
          activo ? "bg-emerald-500" : "bg-rose-500",
        )}
      />
    </div>
  );
}

interface PropsResumen {
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
}

/** Una de las tarjetas de resumen debajo del nombre (Plan, Cuota, Alta…). */
export function TarjetaResumen({ etiqueta, valor, detalle }: PropsResumen) {
  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{etiqueta}</span>
      <div className="mt-2 truncate text-xl font-black text-slate-900 dark:text-white">{valor}</div>
      {detalle && <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">{detalle}</p>}
    </Card>
  );
}

/** Una tarjeta de datos ("Datos personales", "Contacto"…): título, acciones opcionales y sus filas. */
export function TarjetaDeDatos({ titulo, acciones, children }: { titulo: string; acciones?: ReactNode; children: ReactNode }) {
  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{titulo}</h2>
        {acciones}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">{children}</div>
    </Card>
  );
}

interface PropsFilaDato {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
  href?: string;
}

/** Etiqueta a la izquierda y valor al lado. Un valor que empieza con "Sin " se ve apagado. */
export function FilaDato({ etiqueta, valor, destacado = false, href }: PropsFilaDato) {
  return (
    <div className="flex items-center py-3.5 text-sm first:pt-1 last:pb-1">
      <span className="w-32 shrink-0 font-normal text-slate-500 @xl:w-36 dark:text-slate-400">{etiqueta}</span>
      {href ? (
        <a
          href={href}
          className={cn(
            "min-w-0 font-semibold wrap-anywhere hover:underline",
            destacado ? "text-primary dark:text-pink-300" : "text-slate-800 dark:text-slate-200",
          )}
        >
          {valor}
        </a>
      ) : (
        <span
          className={cn(
            "min-w-0 wrap-anywhere",
            destacado
              ? "font-semibold text-primary dark:text-pink-300"
              : valor.startsWith("Sin ")
                ? "font-normal text-slate-500 dark:text-slate-400"
                : "font-semibold text-slate-900 dark:text-white",
          )}
        >
          {valor}
        </span>
      )}
    </div>
  );
}

const BOTON_CONTACTO =
  "inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 dark:border-slate-700 dark:bg-slate-800";

/** WhatsApp, llamada y correo, con los íconos de la ficha. Solo los que tienen dato. */
export function BotonesDeContacto({ nombre, telefono, email }: { nombre: string; telefono: string | null; email: string | null }) {
  const whatsapp = telefono ? enlaceWhatsApp(telefono) : null;
  return (
    <div className="flex items-center gap-1.5">
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp a ${nombre}`} title="Abrir WhatsApp" className={cn(BOTON_CONTACTO, "hover:border-emerald-300")}>
          <WhatsAppIcon className="size-5 shrink-0" />
        </a>
      )}
      {telefono && (
        <a href={enlaceTelefono(telefono)} aria-label={`Llamar a ${nombre}`} title={`Llamar a ${telefono}`} className={cn(BOTON_CONTACTO, "hover:border-emerald-300")}>
          <ApplePhoneIcon className="size-5 shrink-0" />
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} aria-label={`Enviar email a ${nombre}`} title={`Enviar correo a ${email}`} className={cn(BOTON_CONTACTO, "hover:border-sky-300")}>
          <AppleMailIcon className="size-5 shrink-0" />
        </a>
      )}
    </div>
  );
}

interface PropsPestanas<T extends string> {
  secciones: { id: T; etiqueta: string }[];
  actual: T;
  onCambiar: (id: T) => void;
  /** id del panel que muestran las pestañas (aria-controls). */
  idPanel: string;
}

/** Pestañas con subrayado rosa; las flechas, Inicio y Fin se mueven entre ellas. */
export function PestanasFicha<T extends string>({ secciones, actual, onCambiar, idPanel }: PropsPestanas<T>) {
  function navegar(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const total = secciones.length;
    const siguiente =
      evento.key === "ArrowRight" ? (indice + 1) % total
      : evento.key === "ArrowLeft" ? (indice - 1 + total) % total
      : evento.key === "Home" ? 0
      : evento.key === "End" ? total - 1
      : -1;
    const destino = secciones[siguiente];
    if (!destino) return;
    evento.preventDefault();
    onCambiar(destino.id);
    document.getElementById(`tab-${destino.id}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      aria-label="Secciones de la ficha"
      className="scrollbar-none flex items-center gap-4 overflow-x-auto border-b border-slate-200 pt-2 @xl:gap-6 dark:border-slate-800"
    >
      {secciones.map((item, indice) => (
        <button
          key={item.id}
          id={`tab-${item.id}`}
          type="button"
          role="tab"
          aria-selected={actual === item.id}
          aria-controls={idPanel}
          tabIndex={actual === item.id ? 0 : -1}
          onClick={() => onCambiar(item.id)}
          onKeyDown={(evento) => navegar(evento, indice)}
          className={cn(
            "flex items-center gap-2 border-b-2 pb-3 text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline-none",
            actual === item.id
              ? "border-primary text-slate-900 dark:text-white"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          {item.etiqueta}
        </button>
      ))}
    </div>
  );
}
