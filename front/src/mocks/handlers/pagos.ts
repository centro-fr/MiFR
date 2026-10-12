import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { db, siguienteId } from "@/mocks/db";
import { precioVigenteDePlan } from "@/mocks/precios";
import type { InscripcionMock, PagoMock } from "@/mocks/data/inscripciones";
import type { UsuarioSemilla } from "@/mocks/data/semilla";
import { errorApi, usuarioDeLaSesion, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de POST /pagos/efectivo y POST /pagos/transferencia-recibida (pago.routes.ts), con las
// reglas de pago.service.ts. El primer pago de una pre-inscripción da el alta definitiva (US-07).
// El mock no guarda cuotas: cada pago lleva un id_cuota nuevo.

const monto = z
  .number()
  .positive()
  .max(99_999_999.99)
  .refine((valor) => Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6);

const efectivoSchema = z.object({
  id_inscripcion: z.number().int().positive(),
  monto,
  confirmar_monto_distinto: z.boolean().default(false),
});

const transferenciaRecibidaSchema = efectivoSchema.extend({
  fecha_hora_transferencia: z
    .string()
    .datetime({ offset: true })
    .refine((valor) => new Date(valor) <= new Date(), { message: "La transferencia no puede ser futura" }),
  titular_cuenta_origen: z.string().trim().min(1).max(80).optional(),
});

function precioVigente(idPlan: number): number | undefined {
  return precioVigenteDePlan(idPlan)?.precio;
}

// Lo que el back rechaza antes de cobrar: inscripción inexistente, alumno de baja, plan sin precio
// o un monto distinto del vigente sin confirmar.
function errorAntesDeCobrar(inscripcion: InscripcionMock | undefined, cuerpo: z.infer<typeof efectivoSchema>) {
  if (!inscripcion) return errorApi(404, "NOT_FOUND", "Inscripción no encontrada");
  const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno)!;
  if (inscripcion.estado === "BAJA" || alumno.estado === "BAJA") {
    return errorApi(409, "CONFLICT", "El alumno está dado de baja");
  }
  const esperado = precioVigente(inscripcion.id_plan);
  if (esperado === undefined) return errorApi(409, "CONFLICT", "El plan no tiene un precio vigente hoy");
  if (cuerpo.monto !== esperado && !cuerpo.confirmar_monto_distinto) {
    return errorApi(
      409,
      "MONTO_DISTINTO",
      `El monto no coincide con el esperado (${esperado}). Para registrarlo igual, confirmá el monto distinto`,
    );
  }
  return null;
}

// Alta definitiva (inscripcion.service.ts y alumno.repository.ts): la inscripción pasa a ACTIVA, el
// alumno a ACTIVO, y su usuario y el de su tutor quedan habilitados para entrar. Con la inscripción
// ya activa no hace nada: un segundo pago es una cuota más.
function activarSiEsPrimerPago(inscripcion: InscripcionMock): void {
  if (inscripcion.estado !== "PREINSCRIPTA") return;
  inscripcion.estado = "ACTIVA";
  const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno)!;
  alumno.estado = "ACTIVO";
  for (const usuario of db.usuariosPersonas) {
    if (usuario.id_usuario === alumno.id_usuario || usuario.id_usuario === alumno.id_usuario_responsable) {
      usuario.estado = "ACTIVO";
    }
  }
}

function nuevoPago(datos: Pick<PagoMock, "forma_pago" | "monto" | "id_usuario_registra"> & Partial<PagoMock>): PagoMock {
  const ahora = new Date().toISOString();
  const pago: PagoMock = {
    id_pago: siguienteId(db.pagos.map((p) => p.id_pago)),
    id_cuota: siguienteId(db.pagos.map((p) => p.id_cuota)),
    estado: "CONFIRMADO",
    fecha_pago: ahora,
    titular_cuenta_origen: null,
    fecha_hora_transferencia: null,
    id_profesora_cobra: null,
    rendido: true,
    fecha_rendicion: null,
    id_usuario_confirma: datos.id_usuario_registra,
    fecha_confirmacion: ahora,
    motivo_rechazo: null,
    observaciones: null,
    ...datos,
  };
  db.pagos.push(pago);
  return pago;
}

// Cobra la profesora a cargo de la inscripción o la propietaria; lo que cobra una profesora
// queda pendiente de rendición (US-19).
function cobroEnEfectivo(usuario: UsuarioSemilla, inscripcion: InscripcionMock, montoCobrado: number) {
  if (usuario.roles.includes("PROPIETARIA")) {
    return nuevoPago({ forma_pago: "EFECTIVO", monto: montoCobrado, id_usuario_registra: usuario.id_usuario });
  }
  const profesora = db.profesoras.find((p) => p.id_usuario === usuario.id_usuario);
  if (profesora?.id_profesora !== inscripcion.id_profesora) return null;
  return nuevoPago({
    forma_pago: "EFECTIVO",
    monto: montoCobrado,
    id_usuario_registra: usuario.id_usuario,
    id_profesora_cobra: profesora.id_profesora,
    rendido: false,
  });
}

async function leerCuerpo<T extends z.ZodTypeAny>(request: Request, esquema: T) {
  return esquema.safeParse(await request.json().catch(() => null)) as z.SafeParseReturnType<unknown, z.infer<T>>;
}

export const pagosHandlers = [
  http.post("*/api/v1/pagos/efectivo", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { permiso: "PAGOS_REGISTRAR" });
    if (denegado) return denegado;
    const cuerpo = await leerCuerpo(request, efectivoSchema);
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === cuerpo.data.id_inscripcion);
    const rechazo = errorAntesDeCobrar(inscripcion, cuerpo.data);
    if (rechazo) return rechazo;

    const pago = cobroEnEfectivo(usuarioDeLaSesion(request)!, inscripcion!, cuerpo.data.monto);
    if (!pago) return errorApi(403, "FORBIDDEN", "Solo cobra la profesora a cargo de la inscripción o la propietaria");
    activarSiEsPrimerPago(inscripcion!);
    return HttpResponse.json(pago, { status: 201 });
  }),

  // Para cuando la propietaria ya vio el ingreso en su cuenta: queda confirmada en el acto.
  http.post("*/api/v1/pagos/transferencia-recibida", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PAGOS_CONFIRMAR" });
    if (denegado) return denegado;
    const cuerpo = await leerCuerpo(request, transferenciaRecibidaSchema);
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === cuerpo.data.id_inscripcion);
    const rechazo = errorAntesDeCobrar(inscripcion, cuerpo.data);
    if (rechazo) return rechazo;

    const pago = nuevoPago({
      forma_pago: "TRANSFERENCIA",
      monto: cuerpo.data.monto,
      id_usuario_registra: usuarioDeLaSesion(request)!.id_usuario,
      fecha_hora_transferencia: new Date(cuerpo.data.fecha_hora_transferencia).toISOString(),
      titular_cuenta_origen: cuerpo.data.titular_cuenta_origen ?? null,
    });
    activarSiEsPrimerPago(inscripcion!);
    return HttpResponse.json(pago, { status: 201 });
  }),
];
