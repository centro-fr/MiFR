import type { AlumnoInactivo } from "@/features/inactivos/schemas/inactivos";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";

export interface ContactoPrioritario {
  nombreCompleto: string;
  esTutor: boolean;
  telefono: string | null;
  email: string | null;
  nombreAlumno: string;
}

/**
 * Determina a quién se debe contactar: si el alumno es menor y tiene tutor registrado,
 * el contacto prioritario es el tutor a cargo. De lo contrario, se contacta al alumno directamente.
 */
export function obtenerContactoPrioritario(item: AlumnoInactivo): ContactoPrioritario {
  if (item.tutor && (item.tutor.telefono || item.tutor.email)) {
    return {
      nombreCompleto: `${item.tutor.nombre} ${item.tutor.apellido}`.trim(),
      esTutor: true,
      telefono: item.tutor.telefono,
      email: item.tutor.email,
      nombreAlumno: `${item.alumno.nombre} ${item.alumno.apellido}`.trim(),
    };
  }

  return {
    nombreCompleto: `${item.alumno.nombre} ${item.alumno.apellido}`.trim(),
    esTutor: false,
    telefono: item.alumno.telefono,
    email: item.alumno.email,
    nombreAlumno: `${item.alumno.nombre} ${item.alumno.apellido}`.trim(),
  };
}

/**
 * Genera el mensaje de cortesía para incentivar el reintegro de acuerdo a si el destinatario
 * es el alumno directo o el tutor a cargo.
 */
export function generarMensajeReintegro(item: AlumnoInactivo): string {
  const contacto = obtenerContactoPrioritario(item);
  const plan = item.plan.nombre;

  if (contacto.esTutor) {
    return `¡Hola ${item.tutor?.nombre || contacto.nombreCompleto}! Te escribimos de MiFR por las clases de ${item.alumno.nombre}. Notamos que estuvo ausente en sus últimas clases de ${plan} y queríamos saber si está todo bien o si necesitan coordinar algo. ¡Esperamos verles pronto!`;
  }

  return `¡Hola ${item.alumno.nombre}! Te escribimos de MiFR. Notamos que no pudiste venir a tus últimas clases de ${plan} y te extrañamos. Queríamos saber si está todo bien o si querés coordinar una reposición. ¡Esperamos verte pronto!`;
}

/**
 * Arma el enlace de WhatsApp con formato internacional y mensaje preconfigurado opcional.
 */
export function generarEnlaceWhatsApp(telefono: string | null, mensaje?: string): string | null {
  if (!telefono) return null;
  const soloDigitos = telefono.replace(/\D/g, "");
  if (soloDigitos.length < 8) return null;

  let numeroFinal = soloDigitos;
  // Si no tiene código de país y parece número argentino móvil (ej: 10 dígitos tipo 351xxxxxxx o 11xxxxxxxx)
  if (!telefono.trim().startsWith("+") && !soloDigitos.startsWith("54") && soloDigitos.length === 10) {
    numeroFinal = `549${soloDigitos}`;
  } else if (!telefono.trim().startsWith("+") && soloDigitos.startsWith("9") && soloDigitos.length === 11) {
    numeroFinal = `54${soloDigitos}`;
  }

  const query = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${numeroFinal}${query}`;
}

/**
 * Formatea la fecha de la última asistencia:
 * - Si está dentro de los 15 días: "Hace X días" (o "Hoy" / "Ayer").
 * - Si supera los 15 días: "El DD/MM/AAAA".
 */
export function formatearUltimaAsistencia(fechaIso: string | null): string {
  if (!fechaIso) return "Sin asistencias previas";
  const fecha = new Date(fechaIso);
  if (isNaN(fecha.getTime())) return "Sin asistencias previas";

  const ahora = new Date();
  const msPorDia = 1000 * 60 * 60 * 24;
  const difDias = Math.floor((ahora.getTime() - fecha.getTime()) / msPorDia);

  if (difDias < 0) {
    return `El ${formatearFecha(fechaIso)}`;
  }
  if (difDias === 0) {
    return "Hoy";
  }
  if (difDias === 1) {
    return "Ayer";
  }
  if (difDias <= 15) {
    return `Hace ${difDias} días`;
  }
  return `El ${formatearFecha(fechaIso)}`;
}
