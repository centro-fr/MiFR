import { BellRing, CalendarClock, CalendarX, ClipboardList, PartyPopper, type LucideIcon } from "lucide-react";
import { rolesConAcceso } from "@/components/layout/owner-navigation";
import type { Notificacion, TipoNotificacion } from "@/features/notificaciones/schemas/notificaciones";
import type { RoleCode } from "@/types/auth";

interface PresentacionDelTipo {
  etiqueta: string;
  icono: LucideIcon;
  /** Clases del ícono: ámbar lo que pide atención, rosa lo que ya venció. */
  tono: string;
}

const TONO_INFORMATIVO = "bg-primary/10 text-primary-dark dark:bg-primary/20 dark:text-pink-300";
const TONO_ATENCION = "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200";
const TONO_URGENTE = "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200";

export const PRESENTACION_POR_TIPO: Record<TipoNotificacion, PresentacionDelTipo> = {
  CUOTA_POR_VENCER: { etiqueta: "Cuota por vencer", icono: CalendarClock, tono: TONO_ATENCION },
  CUOTA_VENCIDA: { etiqueta: "Cuota vencida", icono: CalendarX, tono: TONO_URGENTE },
  RESUMEN_DIARIO: { etiqueta: "Resumen del día", icono: ClipboardList, tono: TONO_INFORMATIVO },
  BIENVENIDA: { etiqueta: "Bienvenida", icono: PartyPopper, tono: TONO_INFORMATIVO },
  CLASE_CANCELADA: { etiqueta: "Clase cancelada", icono: CalendarX, tono: TONO_URGENTE },
  OTRO: { etiqueta: "Aviso", icono: BellRing, tono: TONO_INFORMATIVO },
};

export interface DestinoDeNotificacion {
  to: string;
  etiqueta: string;
}

// La pantalla donde se resuelve cada aviso. Los de cuota llevan al inicio de quien los recibe, donde está su cuota; el
// resumen, al Dashboard, donde está el detalle del día.
const DESTINO_POR_TIPO: Partial<Record<TipoNotificacion, DestinoDeNotificacion>> = {
  CUOTA_POR_VENCER: { to: "/app/inicio", etiqueta: "Ver mi cuota" },
  CUOTA_VENCIDA: { to: "/app/inicio", etiqueta: "Ver mi cuota" },
  RESUMEN_DIARIO: { to: "/app/dashboard", etiqueta: "Ver el resumen" },
};

/** null si el aviso no tiene pantalla propia o si esa pantalla no está en el menú de quien lo ve. */
export function destinoDe(
  notificacionOTipo: Notificacion | TipoNotificacion,
  roles: readonly RoleCode[],
): DestinoDeNotificacion | null {
  const notificacion = typeof notificacionOTipo === "string" ? null : notificacionOTipo;
  const tipo = typeof notificacionOTipo === "string" ? notificacionOTipo : notificacionOTipo.tipo;

  if (tipo === "CUOTA_VENCIDA" && roles.includes("PROPIETARIA")) {
    if (notificacion?.id_alumno) {
      return { to: `/app/alumnos/${notificacion.id_alumno}`, etiqueta: "Ver ficha del alumno" };
    }
    return { to: "/app/alumnos/listado", etiqueta: "Ver alumnos" };
  }
  const destino = DESTINO_POR_TIPO[tipo];
  if (!destino) return null;
  return rolesConAcceso(destino.to).some((rol) => roles.includes(rol)) ? destino : null;
}

const RELATIVO = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
const FECHA_CORTA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});
const FECHA_Y_HORA = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

const MINUTOS_POR_HORA = 60;
const MINUTOS_POR_DIA = 24 * MINUTOS_POR_HORA;
// Pasada una semana, "hace 12 días" se lee peor que la fecha.
const DIAS_CON_TEXTO_RELATIVO = 7;

/** "hace 5 minutos", "hace 2 horas", "ayer" o, pasada una semana, "12/10/2026". */
export function haceCuanto(fechaIso: string, ahora: number = Date.now()): string {
  const fecha = new Date(fechaIso);
  const minutos = Math.round((ahora - fecha.getTime()) / 60_000);
  if (minutos < 1) return "recién";
  if (minutos < MINUTOS_POR_HORA) return RELATIVO.format(-minutos, "minute");
  if (minutos < MINUTOS_POR_DIA) return RELATIVO.format(-Math.round(minutos / MINUTOS_POR_HORA), "hour");
  const dias = Math.round(minutos / MINUTOS_POR_DIA);
  if (dias < DIAS_CON_TEXTO_RELATIVO) return RELATIVO.format(-dias, "day");
  return FECHA_CORTA.format(fecha);
}

/** "martes, 20 de octubre de 2026, 08:00": para el title de la fecha relativa. */
export function fechaCompleta(fechaIso: string): string {
  return FECHA_Y_HORA.format(new Date(fechaIso));
}

export function etiquetaSinLeer(cantidad: number): string {
  return cantidad === 1 ? "1 sin leer" : `${cantidad} sin leer`;
}
