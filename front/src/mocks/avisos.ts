import type { SituacionCuotaApi } from "@/features/alumnos/schemas/alumno";
import type { InscripcionMock } from "@/mocks/data/inscripciones";
import type { NotificacionMock } from "@/mocks/data/notificaciones";
import { db, siguienteId } from "@/mocks/db";
import { hoyEnArgentina } from "@/mocks/precios";
import { situacionCuotaDe } from "@/mocks/situacion-cuota";

// Réplica de PlanificadorNotificaciones (US-25) y de la notificación del resumen diario (US-26) del
// back, con sus mismos textos. Como allá, volver a generar no duplica: hay un aviso por cuota y
// tipo, y un resumen por día.

type NuevaNotificacion = Pick<NotificacionMock, "id_usuario" | "tipo" | "id_cuota" | "mensaje">;

const ZONA_ARGENTINA = "America/Argentina/Buenos_Aires";
const FORMATO_DIA = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_ARGENTINA, year: "numeric", month: "2-digit", day: "2-digit" });
const FORMATO_HORA = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA_ARGENTINA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function valorDe(clave: string) {
  return db.parametros.find((parametro) => parametro.clave === clave)?.valor;
}

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

// Los avisos del menor le llegan a su tutor (US-06).
function avisoDeCuota(inscripcion: InscripcionMock, diasPrevios: number): NuevaNotificacion | null {
  const plan = db.planes.find((p) => p.id_plan === inscripcion.id_plan);
  const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno);
  if (inscripcion.estado !== "ACTIVA" || plan?.tipo !== "MENSUAL" || !alumno || alumno.estado === "BAJA") return null;

  const situacion = situacionCuotaDe(inscripcion);
  const idCuota = idCuotaVigente(inscripcion);
  const tipo = tipoDeAviso(situacion, diasPrevios, plan.dias_gracia);
  if (situacion.tiene_pago_pendiente || !situacion.fecha_vencimiento || idCuota === null || !tipo) return null;

  const persona = db.usuariosPersonas.find((u) => u.id_usuario === alumno.id_usuario);
  const deQuien = alumno.id_usuario_responsable === null ? "Tu cuota" : `La cuota de ${persona?.nombre} ${persona?.apellido}`;
  const fecha = formatoArgentino(situacion.fecha_vencimiento);
  const cuando = situacion.dias_restantes === 0 ? `vence hoy, ${fecha}` : tipo === "CUOTA_VENCIDA" ? `venció el ${fecha}` : `vence el ${fecha}`;
  return {
    id_usuario: alumno.id_usuario_responsable ?? alumno.id_usuario,
    tipo,
    id_cuota: idCuota,
    mensaje: `${deQuien} del plan ${plan.nombre} ${cuando}.`,
  };
}

/** Los avisos de cuota por vencer (DIAS_AVISO_VENCIMIENTO antes) y vencida. */
export function generarAvisosDeCuota(): void {
  const diasPrevios = Number(valorDe("DIAS_AVISO_VENCIMIENTO"));
  for (const inscripcion of db.inscripciones) {
    const aviso = avisoDeCuota(inscripcion, diasPrevios);
    if (aviso && !yaSeAviso(aviso)) registrar(aviso);
  }
}

/** A partir de HORA_RESUMEN_DIARIO, uno por día para cada propietaria. El texto se arma solo si hace falta. */
export function generarResumenDiario(armarMensaje: () => string): void {
  if (FORMATO_HORA.format(new Date()) < String(valorDe("HORA_RESUMEN_DIARIO"))) return;
  const hoy = hoyEnArgentina();
  let mensaje: string | null = null;
  for (const { id_usuario } of db.usuarios.filter((u) => u.roles.includes("PROPIETARIA") && u.estado !== "INACTIVO")) {
    const yaLoTiene = db.notificaciones.some(
      (n) => n.id_usuario === id_usuario && n.tipo === "RESUMEN_DIARIO" && FORMATO_DIA.format(new Date(n.fecha_generacion)) === hoy,
    );
    if (yaLoTiene) continue;
    mensaje ??= armarMensaje();
    registrar({ id_usuario, tipo: "RESUMEN_DIARIO", id_cuota: null, mensaje });
  }
}
