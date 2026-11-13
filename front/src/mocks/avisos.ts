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

// El aviso sale cuando la cuota cambia de estado, como en el back (TIPO_DE_AVISO_POR_ESTADO de cuota.service.ts).
function tipoDeAviso({ estado }: SituacionCuotaApi) {
  if (estado === "POR_VENCER") return "CUOTA_POR_VENCER" as const;
  if (estado === "VENCIDA") return "CUOTA_VENCIDA" as const;
  return null;
}

// El último día de gracia: hasta entonces la cuota está por vencer.
function finDeGracia(fechaVencimiento: string, diasGracia: number): string {
  return new Date(new Date(fechaVencimiento).getTime() + diasGracia * 86_400_000).toISOString();
}

/**
 * Avisos de cuota: al alumno o tutor cuando la cuota pasa a por vencer o vencida, y a la propietaria y
 * a la profesora a cargo solo las vencidas, con el nombre del alumno.
 */
export function generarAvisosDeCuota(): void {
  for (const inscripcion of db.inscripciones) {
    const plan = db.planes.find((p) => p.id_plan === inscripcion.id_plan);
    const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno);
    if (inscripcion.estado !== "ACTIVA" || plan?.tipo !== "MENSUAL" || !alumno || alumno.estado === "BAJA") continue;

    const situacion = situacionCuotaDe(inscripcion);
    const idCuota = idCuotaVigente(inscripcion);
    const tipo = tipoDeAviso(situacion);
    if (situacion.tiene_pago_pendiente || !situacion.fecha_vencimiento || idCuota === null || !tipo) continue;

    const persona = db.usuariosPersonas.find((u) => u.id_usuario === alumno.id_usuario);
    const nombreCompleto = persona ? `${persona.nombre} ${persona.apellido}`.trim() : "el alumno";

    // Aviso para el alumno / tutor:
    const deQuien = alumno.id_usuario_responsable === null ? "Tu cuota" : `La cuota de ${nombreCompleto}`;
    const vencio = `venció el ${formatoArgentino(situacion.fecha_vencimiento)}`;
    const cuando =
      tipo === "CUOTA_POR_VENCER"
        ? `${vencio}: hay tiempo de renovarla hasta el ${formatoArgentino(finDeGracia(situacion.fecha_vencimiento, plan.dias_gracia))}`
        : `${vencio} y ya pasaron los días de gracia`;
    const destinatarioAlumno = alumno.id_usuario_responsable ?? alumno.id_usuario;

    const avisoAlumno: NuevaNotificacion = {
      id_usuario: destinatarioAlumno,
      tipo,
      id_cuota: idCuota,
      id_alumno: alumno.id_alumno,
      mensaje: `${deQuien} del plan ${plan.nombre} ${cuando}.`,
    };
    if (!yaSeAviso(avisoAlumno)) registrar(avisoAlumno);

    // Para la propietaria y profesora a cargo: SOLO cuotas vencidas nombrando nombre y apellido del alumno vencido
    if (tipo === "CUOTA_VENCIDA") {
      // Propietarias
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

      // Profesora a cargo del alumno
      const profe = db.profesoras.find((p) => p.id_profesora === inscripcion.id_profesora && p.fecha_baja === null);
      if (profe) {
        const usuarioProfe = db.usuarios.find((u) => u.id_usuario === profe.id_usuario && u.estado !== "INACTIVO");
        if (usuarioProfe) {
          const avisoProfesora: NuevaNotificacion = {
            id_usuario: usuarioProfe.id_usuario,
            tipo: "CUOTA_VENCIDA",
            id_cuota: idCuota,
            id_alumno: alumno.id_alumno,
            mensaje: `La cuota de ${nombreCompleto} venció.`,
          };
          if (!yaSeAviso(avisoProfesora)) registrar(avisoProfesora);
        }
      }
    }
  }
}
