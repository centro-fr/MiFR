import type { SituacionCuotaApi } from "@/features/alumnos/schemas/alumno";
import type { InscripcionMock } from "@/mocks/data/inscripciones";
import type { NotificacionMock } from "@/mocks/data/notificaciones";
import { db, siguienteId } from "@/mocks/db";
import { situacionCuotaDe } from "@/mocks/situacion-cuota";

type NuevaNotificacion = Pick<NotificacionMock, "id_usuario" | "tipo" | "id_cuota" | "id_alumno" | "mensaje">;

function registrar(nueva: NuevaNotificacion): void {
  db.notificaciones.push({
    ...nueva,
    id_notificacion: siguienteId(db.notificaciones.map((n) => n.id_notificacion)),
    fecha_generacion: new Date().toISOString(),
    leida: false,
  });
}

function yaSeAviso({ id_usuario, id_cuota, tipo }: NuevaNotificacion): boolean {
  return db.notificaciones.some((n) => n.id_usuario === id_usuario && n.id_cuota === id_cuota && n.tipo === tipo);
}

// "2026-11-13T00:00:00.000Z" → "13/11/2026". Las fechas de vencimiento son días UTC, como en el back.
function formatoArgentino(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

// El mock no guarda cuotas (situacion-cuota.ts): la vigente es la del último pago confirmado.
function idCuotaVigente(inscripcion: InscripcionMock): number | null {
  const confirmados = db.pagos.filter((p) => p.id_inscripcion === inscripcion.id_inscripcion && p.estado === "CONFIRMADO");
  return confirmados.length > 0 ? Math.max(...confirmados.map((p) => p.id_cuota)) : null;
}

// Sin días de gracia, el aviso de vencida sale el mismo día del vencimiento (tipoDeAviso del back).
function tipoDeAviso({ estado, dias_restantes }: SituacionCuotaApi, diasPrevios: number, diasGracia: number) {
  if (dias_restantes === null) return null;
  if (estado === "VENCIDA" || (diasGracia === 0 && dias_restantes === 0)) return "CUOTA_VENCIDA" as const;
  if (estado === "AL_DIA" && dias_restantes <= diasPrevios) return "CUOTA_POR_VENCER" as const;
  return null;
}

/** Avisos de cuota: 3 días antes para el alumno/tutor, y para la propietaria solo cuotas vencidas con nombre y apellido. */
export function generarAvisosDeCuota(): void {
  // Siempre 3 días de aviso previo antes de vencer
  const diasPrevios = 3;
  for (const inscripcion of db.inscripciones) {
    const plan = db.planes.find((p) => p.id_plan === inscripcion.id_plan);
    const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno);
    if (inscripcion.estado !== "ACTIVA" || plan?.tipo !== "MENSUAL" || !alumno || alumno.estado === "BAJA") continue;

    const situacion = situacionCuotaDe(inscripcion);
    const idCuota = idCuotaVigente(inscripcion);
    const tipo = tipoDeAviso(situacion, diasPrevios, plan.dias_gracia);
    if (situacion.tiene_pago_pendiente || !situacion.fecha_vencimiento || idCuota === null || !tipo) continue;

    const persona = db.usuariosPersonas.find((u) => u.id_usuario === alumno.id_usuario);
    const nombreCompleto = persona ? `${persona.nombre} ${persona.apellido}`.trim() : "el alumno";

    // Aviso para el alumno / tutor:
    const deQuien = alumno.id_usuario_responsable === null ? "Tu cuota" : `La cuota de ${nombreCompleto}`;
    const fecha = formatoArgentino(situacion.fecha_vencimiento);
    const cuando = situacion.dias_restantes === 0 ? `vence hoy, ${fecha}` : tipo === "CUOTA_VENCIDA" ? `venció el ${fecha}` : `vence el ${fecha}`;
    const destinatarioAlumno = alumno.id_usuario_responsable ?? alumno.id_usuario;

    const avisoAlumno: NuevaNotificacion = {
      id_usuario: destinatarioAlumno,
      tipo,
      id_cuota: idCuota,
      id_alumno: alumno.id_alumno,
      mensaje: `${deQuien} del plan ${plan.nombre} ${cuando}.`,
    };
    if (!yaSeAviso(avisoAlumno)) registrar(avisoAlumno);

    // Para la propietaria: SOLO cuotas vencidas nombrando nombre y apellido del alumno vencido
    if (tipo === "CUOTA_VENCIDA") {
      for (const propietaria of db.usuarios.filter((u) => u.roles.includes("PROPIETARIA") && u.estado !== "INACTIVO")) {
        const avisoPropietaria: NuevaNotificacion = {
          id_usuario: propietaria.id_usuario,
          tipo: "CUOTA_VENCIDA",
          id_cuota: idCuota,
          id_alumno: alumno.id_alumno,
          mensaje: `La cuota de ${nombreCompleto} venció.`,
        };
        if (!yaSeAviso(avisoPropietaria)) registrar(avisoPropietaria);
      }
    }
  }
}

/** Desactivada: ya no se generan notificaciones de resumen diario en la campanita */
export function generarResumenDiario(_armarMensaje?: () => string): void {
  // La notificación de resumen diario fue eliminada; el resumen sigue disponible en el dashboard.
}
