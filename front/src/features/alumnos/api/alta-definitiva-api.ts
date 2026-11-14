import { isAxiosError } from "axios";
import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  inscripcionPendienteApiSchema,
  paginaAlumnosApiSchema,
  type AlumnoEnListadoApi,
  type InscripcionPendienteApi,
  type RegistrarEfectivoBody,
  type RegistrarTransferenciaRecibidaBody,
} from "@/features/alumnos/schemas/alta-definitiva";
import { diaDesdeNumero, horaDesdeApi } from "@/features/horarios/utils/cronograma";
import { fichaAlumnoApiSchema } from "@/features/alumnos/schemas/alumno";
import type { PreInscripcionPendiente } from "@/types/alta-definitiva";

// El máximo que acepta el back por página. Un centro chico no llega a 100 pre-inscripciones
// pendientes a la vez; si pasara, hay que paginar acá y en la pantalla.
const LIMITE = "100";

function aPendiente(inscripcion: InscripcionPendienteApi, alumno: AlumnoEnListadoApi): PreInscripcionPendiente {
  const { usuario, responsable } = alumno;
  return {
    idInscripcion: String(inscripcion.id_inscripcion),
    idAlumno: String(alumno.id_alumno),
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    dni: usuario.dni,
    email: usuario.email,
    telefono: usuario.telefono,
    // DATE viaja como medianoche UTC: se queda solo la fecha (ver alumnos-api.ts).
    fechaNacimiento: usuario.fecha_nacimiento.slice(0, 10),
    tutor: responsable && { nombre: responsable.nombre, apellido: responsable.apellido, telefono: responsable.telefono },
    idPlan: String(inscripcion.plan.id_plan),
    idPromocion: inscripcion.id_promocion,
    nombrePlan: inscripcion.plan.nombre,
    precio: inscripcion.plan_precio.precio,
    profesora: `${inscripcion.profesora.usuario.nombre} ${inscripcion.profesora.usuario.apellido}`,
    horarios: inscripcion.horarios.map(({ horario }) => ({
      dia: diaDesdeNumero(horario.dia_semana),
      horaInicio: horaDesdeApi(horario.hora_inicio),
      horaFin: horaDesdeApi(horario.hora_fin),
      actividad: horario.actividad.nombre,
    })),
    fechaPreInscripcion: inscripcion.fecha_alta,
    reserva: inscripcion.reserva && {
      // DATE viaja como medianoche UTC: se queda solo la fecha.
      vence: inscripcion.reserva.vence.slice(0, 10),
      vencida: inscripcion.reserva.vencida,
    },
  };
}

// Un alumno activo que suma un plan nuevo también espera ese primer pago, pero no figura entre los
// INACTIVO: se lo busca por su ficha, que además confirma que la inscripción sigue pre-inscripta.
// Son pocos a la vez (una consulta por alumno, no por inscripción).
async function alumnosActivosConPlanNuevo(idsAlumnos: number[]) {
  const fichas = await Promise.all(
    idsAlumnos.map(async (id) => fichaAlumnoApiSchema.parse((await apiClient.get(`/alumnos/${id}`)).data)),
  );
  return new Map(
    fichas.map((ficha) => [
      ficha.id_alumno,
      {
        alumno: ficha,
        preInscriptas: new Set(ficha.inscripciones.filter((i) => i.estado === "PREINSCRIPTA").map((i) => i.id_inscripcion)),
      },
    ]),
  );
}

/**
 * Pre-inscripciones que esperan su primer pago. Las inscripciones traen plan, precio, profesora y
 * horarios; los alumnos INACTIVO, DNI, contacto y tutor. Solo el alumno ya activo que suma un plan
 * se pide aparte.
 */
export async function listarPreInscripcionesPendientes(): Promise<PreInscripcionPendiente[]> {
  const [respuestaInscripciones, respuestaAlumnos] = await Promise.all([
    apiClient.get("/inscripciones", { params: { estado: "PREINSCRIPTA", limit: LIMITE } }),
    apiClient.get("/alumnos", { params: { estado: "INACTIVO", limit: LIMITE } }),
  ]);
  const inscripciones = z.array(inscripcionPendienteApiSchema).parse(respuestaInscripciones.data);
  const inactivos = new Map(
    paginaAlumnosApiSchema.parse(respuestaAlumnos.data).datos.map((alumno) => [alumno.id_alumno, alumno]),
  );
  const sinAlumnoInactivo = [...new Set(inscripciones.map((i) => i.id_alumno).filter((id) => !inactivos.has(id)))];
  const activos = await alumnosActivosConPlanNuevo(sinAlumnoInactivo);
  return inscripciones.flatMap((inscripcion) => {
    const inactivo = inactivos.get(inscripcion.id_alumno);
    if (inactivo) return [aPendiente(inscripcion, inactivo)];
    const activo = activos.get(inscripcion.id_alumno);
    // Sin el alumno, o con la inscripción ya activa, no hay nada que cobrar: pasa si se activó
    // entre una consulta y la otra.
    return activo?.preInscriptas.has(inscripcion.id_inscripcion) ? [aPendiente(inscripcion, activo.alumno)] : [];
  });
}

// El primer pago da el alta definitiva en el back (pago.openapi.ts): no hay un endpoint de "alta".
export async function registrarPrimerPagoEnEfectivo(cuerpo: RegistrarEfectivoBody): Promise<void> {
  await apiClient.post("/pagos/efectivo", cuerpo);
}

// Un pre-inscripto todavía no puede entrar al sistema para informar su transferencia: la
// propietaria la registra cuando la ve en su cuenta y queda confirmada en el acto.
export async function registrarTransferenciaRecibida(cuerpo: RegistrarTransferenciaRecibidaBody): Promise<void> {
  await apiClient.post("/pagos/transferencia-recibida", cuerpo);
}

export interface InformarTransferenciaPrimerPagoBody {
  id_inscripcion: number;
  monto: number;
  id_promocion?: number;
  /** Sin ella, el back usa el momento en que la recibe. */
  fecha_hora_transferencia?: string;
  titular_cuenta_origen?: string;
  observaciones?: string;
}

// Cuando la profesora informa la transferencia de una primera cuota, queda PENDIENTE
// hasta que la propietaria la revise y confirme para dar el alta definitiva.
export async function informarTransferenciaPrimerPago(cuerpo: InformarTransferenciaPrimerPagoBody): Promise<void> {
  await apiClient.post("/pagos/transferencia", cuerpo);
}

/** 409 MONTO_DISTINTO: el monto no es el precio vigente y hay que confirmarlo. */
export function esMontoDistinto(error: unknown): boolean {
  if (!isAxiosError(error) || error.response?.status !== 409) return false;
  const datos = error.response.data as { error?: { code?: string } } | undefined;
  return datos?.error?.code === "MONTO_DISTINTO";
}
