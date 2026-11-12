import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { db, siguienteId } from "@/mocks/db";
import { precioVigenteDePlan } from "@/mocks/precios";
import { precioConPromocion, promociones } from "@/mocks/handlers/promociones";
import type { InscripcionMock, PagoMock } from "@/mocks/data/inscripciones";
import type { UsuarioSemilla } from "@/mocks/data/semilla";
import { errorApi, idDeRuta, idInvalido, usuarioDeLaSesion, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de pago.routes.ts con las reglas de pago.service.ts: el cobro en efectivo, la transferencia
// recibida y la revisión de las transferencias que informan los alumnos (US-17). El primer pago de
// una pre-inscripción da el alta definitiva (US-07). El mock no guarda cuotas: cada pago lleva un
// id_cuota nuevo.

const monto = z
  .number()
  .positive()
  .max(99_999_999.99)
  .refine((valor) => Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6);

const efectivoSchema = z.object({
  id_inscripcion: z.number().int().positive(),
  id_promocion: z.number().int().positive().optional(),
  monto,
  confirmar_monto_distinto: z.boolean().default(false),
  observaciones: z.string().max(255).optional(),
});

const transferenciaRecibidaSchema = efectivoSchema.extend({
  fecha_hora_transferencia: z
    .string()
    .datetime({ offset: true })
    .refine((valor) => new Date(valor) <= new Date(), { message: "La transferencia no puede ser futura" }),
  titular_cuenta_origen: z.string().trim().min(1).max(80).optional(),
});

const informarTransferenciaSchema = z.object({
  id_inscripcion: z.number().int().positive(),
  id_promocion: z.number().int().positive().optional(),
  monto,
  fecha_hora_transferencia: z
    .string()
    .datetime({ offset: true })
    .refine((valor) => new Date(valor) <= new Date(), { message: "La transferencia no puede ser futura" }),
  titular_cuenta_origen: z.string().trim().min(1).max(80).optional(),
  observaciones: z.string().max(255).optional(),
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
  const precioLista = precioVigente(inscripcion.id_plan);
  const esperado =
    precioLista === undefined
      ? undefined
      : precioConPromocion(inscripcion.id_plan, precioLista, cuerpo.id_promocion ?? inscripcion.id_promocion);
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

function nuevoPago(
  datos: Pick<PagoMock, "id_inscripcion" | "forma_pago" | "monto" | "id_usuario_registra"> & Partial<PagoMock>,
): PagoMock {
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
function cobroEnEfectivo(
  usuario: UsuarioSemilla,
  inscripcion: InscripcionMock,
  montoCobrado: number,
  observaciones?: string,
  idPromocion?: number,
) {
  const idPromo = idPromocion ?? inscripcion.id_promocion ?? null;
  if (usuario.roles.includes("PROPIETARIA")) {
    return nuevoPago({
      id_inscripcion: inscripcion.id_inscripcion,
      forma_pago: "EFECTIVO",
      monto: montoCobrado,
      id_usuario_registra: usuario.id_usuario,
      observaciones: observaciones ?? null,
      id_promocion: idPromo,
    });
  }
  const profesora = db.profesoras.find((p) => p.id_usuario === usuario.id_usuario);
  if (profesora?.id_profesora !== inscripcion.id_profesora) return null;
  return nuevoPago({
    id_inscripcion: inscripcion.id_inscripcion,
    forma_pago: "EFECTIVO",
    monto: montoCobrado,
    id_usuario_registra: usuario.id_usuario,
    id_profesora_cobra: profesora.id_profesora,
    rendido: false,
    observaciones: observaciones ?? null,
    id_promocion: idPromo,
  });
}

async function leerCuerpo<T extends z.ZodTypeAny>(request: Request, esquema: T) {
  return esquema.safeParse(await request.json().catch(() => null)) as z.ZodSafeParseResult<z.infer<T>>;
}

// ---------- US-17: revisión de transferencias ----------

const UNA_HORA_EN_MS = 3_600_000;
const HORAS_PARA_REVISAR = 24;
const LIMITE_MAXIMO = 100;

const listarTransferenciasQuerySchema = z.object({
  estado: z.enum(["PENDIENTE", "CONFIRMADO", "RECHAZADO"]).optional(),
  id_alumno: z.coerce.number().int().positive().optional(),
  orden: z.enum(["asc", "desc"]).default("asc"),
  limit: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_MAXIMO),
  offset: z.coerce.number().int().min(0).default(0),
});

// Aprobar normalmente no lleva cuerpo (aprobarTransferenciaSchema).
const aprobarSchema = z.object({ confirmar_monto_distinto: z.boolean().default(false) }).default({ confirmar_monto_distinto: false });

// textoSchema(255) del back: obligatorio, con alguna letra y sin caracteres de control.
const rechazarSchema = z.object({
  motivo_rechazo: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine((valor) => /\p{L}/u.test(valor) && !/[\p{Cc}\p{Cf}]/u.test(valor)),
});

// TransferenciaEnRevision: el pago con el alumno y las horas desde que se cargó.
function transferenciaEnRevision(pago: PagoMock) {
  const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === pago.id_inscripcion)!;
  const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno)!;
  const usuario = db.usuariosPersonas.find((u) => u.id_usuario === alumno.id_usuario)!;
  const horas = Math.floor((Date.now() - new Date(pago.fecha_pago).getTime()) / UNA_HORA_EN_MS);
  return {
    ...pago,
    alumno: { id_alumno: alumno.id_alumno, nombre: usuario.nombre, apellido: usuario.apellido },
    horas_desde_la_carga: horas,
    supera_24_horas: pago.estado === "PENDIENTE" && horas >= HORAS_PARA_REVISAR,
  };
}

function idAlumnoDe(pago: PagoMock): number | undefined {
  return db.inscripciones.find((i) => i.id_inscripcion === pago.id_inscripcion)?.id_alumno;
}

// Como pago.repository.ts: solo transferencias, por fecha de carga (por defecto, la más antigua primero).
function listarTransferencias(filtro: z.infer<typeof listarTransferenciasQuerySchema>) {
  const sentido = filtro.orden === "desc" ? -1 : 1;
  return db.pagos
    .filter(
      (pago) =>
        pago.forma_pago === "TRANSFERENCIA" &&
        (filtro.estado === undefined || pago.estado === filtro.estado) &&
        (filtro.id_alumno === undefined || idAlumnoDe(pago) === filtro.id_alumno),
    )
    .sort((a, b) => sentido * (a.fecha_pago.localeCompare(b.fecha_pago) || a.id_pago - b.id_pago))
    .slice(filtro.offset, filtro.offset + filtro.limit)
    .map(transferenciaEnRevision);
}

// transferenciaPendiente de pago.service.ts: 404 si no existe, 409 si ya se resolvió.
function buscarTransferenciaPendiente(id: number | null) {
  const pago = id === null ? undefined : db.pagos.find((p) => p.id_pago === id);
  if (!pago) return { error: errorApi(404, "NOT_FOUND", "Pago no encontrado") };
  if (pago.forma_pago !== "TRANSFERENCIA" || pago.estado !== "PENDIENTE") {
    return { error: errorApi(409, "CONFLICT", "Solo se aprueba o rechaza una transferencia pendiente") };
  }
  return { pago };
}

function resolver(pago: PagoMock, request: Request, cambios: Pick<PagoMock, "estado" | "motivo_rechazo">): PagoMock {
  Object.assign(pago, cambios, {
    id_usuario_confirma: usuarioDeLaSesion(request)!.id_usuario,
    fecha_confirmacion: new Date().toISOString(),
  });
  return pago;
}

// Helper para obtener nombre y apellido de la profesora cobradora
function resolverDatosProfesora(idProf: number | null | undefined): { nombre: string; apellido: string } {
  if (!idProf) return { nombre: "Profesora", apellido: "" };
  const prof = db.profesoras.find((pr) => pr.id_profesora === idProf);
  const usuario = prof
    ? db.usuarios.find((u) => u.id_usuario === prof.id_usuario) ||
      db.usuariosPersonas.find((u) => u.id_usuario === prof.id_usuario)
    : null;
  return {
    nombre: usuario?.nombre ?? "Profesora",
    apellido: usuario?.apellido ?? "",
  };
}

export const pagosHandlers = [
  http.get("*/api/v1/pagos/:id/comprobante", async ({ params, request }) => {
    await delay(200);
    const denegado = verificarAcceso(request);
    if (denegado) return denegado;

    const idPago = Number(params.id);
    const pago = db.pagos.find((p) => p.id_pago === idPago);
    if (!pago) return errorApi(404, "NOT_FOUND", "Pago no encontrado");
    if (pago.estado !== "CONFIRMADO") {
      return errorApi(409, "CONFLICT", "Solo un pago confirmado tiene comprobante");
    }

    const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === pago.id_inscripcion);
    if (!inscripcion) return errorApi(404, "NOT_FOUND", "Inscripción no encontrada");
    const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    const usuarioAlumno = db.usuariosPersonas.find((u) => u.id_usuario === alumno.id_usuario);
    const plan = db.planes.find((p) => p.id_plan === inscripcion.id_plan);
    const usuarioRegistra =
      db.usuarios.find((u) => u.id_usuario === pago.id_usuario_registra) ||
      db.usuariosPersonas.find((u) => u.id_usuario === pago.id_usuario_registra) || {
        nombre: "Administración",
        apellido: "FR",
      };
    const profesora = pago.id_profesora_cobra
      ? db.profesoras.find((pr) => pr.id_profesora === pago.id_profesora_cobra)
      : null;
    const profesoraUsuario = profesora ? db.usuarios.find((u) => u.id_usuario === profesora.id_usuario) : null;
    const idPromo = (pago as { id_promocion?: number | null }).id_promocion ?? inscripcion.id_promocion ?? null;
    const promocionObj = idPromo ? promociones.find((p) => p.id_promocion === idPromo) : null;

    return HttpResponse.json({
      numero: pago.id_pago,
      fecha: pago.fecha_pago,
      forma_pago: pago.forma_pago,
      monto: pago.monto,
      alumno: {
        nombre: usuarioAlumno?.nombre ?? "Alumno",
        apellido: usuarioAlumno?.apellido ?? "",
        dni: usuarioAlumno?.dni ?? null,
      },
      plan: plan?.nombre ?? "Plan",
      promocion: promocionObj ? { codigo: promocionObj.codigo, nombre: promocionObj.nombre } : null,
      cuota: {
        numero: pago.id_cuota,
        vencimiento: pago.fecha_pago,
      },
      registrado_por: {
        nombre: usuarioRegistra.nombre,
        apellido: usuarioRegistra.apellido,
      },
      profesora_cobra: profesoraUsuario
        ? { nombre: profesoraUsuario.nombre, apellido: profesoraUsuario.apellido }
        : null,
    });
  }),

  http.get("*/api/v1/pagos", async ({ request }) => {
    await delay(200);
    const denegado = verificarAcceso(request);
    if (denegado) return denegado;

    const url = new URL(request.url);
    const idInscripcion = url.searchParams.get("id_inscripcion");
    const idAlumno = url.searchParams.get("id_alumno");

    let pagos = [...db.pagos];
    if (idInscripcion) {
      pagos = pagos.filter((p) => p.id_inscripcion === Number(idInscripcion));
    } else if (idAlumno) {
      const inscripcionesAlumno = db.inscripciones
        .filter((i) => i.id_alumno === Number(idAlumno))
        .map((i) => i.id_inscripcion);
      pagos = pagos.filter((p) => inscripcionesAlumno.includes(p.id_inscripcion));
    }

    // Ordenar los más recientes primero
    pagos.sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());

    return HttpResponse.json(pagos);
  }),

  http.post("*/api/v1/pagos/efectivo", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { permiso: "PAGOS_REGISTRAR" });
    if (denegado) return denegado;
    const cuerpo = await leerCuerpo(request, efectivoSchema);
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === cuerpo.data.id_inscripcion);
    const rechazo = errorAntesDeCobrar(inscripcion, cuerpo.data);
    if (rechazo) return rechazo;

    const pago = cobroEnEfectivo(
      usuarioDeLaSesion(request)!,
      inscripcion!,
      cuerpo.data.monto,
      cuerpo.data.observaciones,
      cuerpo.data.id_promocion,
    );
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
      id_inscripcion: inscripcion!.id_inscripcion,
      forma_pago: "TRANSFERENCIA",
      monto: cuerpo.data.monto,
      id_usuario_registra: usuarioDeLaSesion(request)!.id_usuario,
      fecha_hora_transferencia: new Date(cuerpo.data.fecha_hora_transferencia).toISOString(),
      titular_cuenta_origen: cuerpo.data.titular_cuenta_origen ?? null,
      id_promocion: cuerpo.data.id_promocion ?? inscripcion!.id_promocion ?? null,
    });
    activarSiEsPrimerPago(inscripcion!);
    return HttpResponse.json(pago, { status: 201 });
  }),

  // Contrato propuesto al back (decisión de la dueña): la transferencia ya no la informa el alumno,
  // sino la propietaria o la profesora a cargo de la inscripción, desde Estado de cuotas. Queda
  // pendiente de verificación hasta que la propietaria la apruebe (US-17).
  http.post("*/api/v1/pagos/transferencia", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { permiso: "PAGOS_REGISTRAR" });
    if (denegado) return denegado;
    const usuario = usuarioDeLaSesion(request)!;

    const cuerpo = await leerCuerpo(request, informarTransferenciaSchema);
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === cuerpo.data.id_inscripcion);
    if (!inscripcion) return errorApi(404, "NOT_FOUND", "Inscripción no encontrada");

    const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    if (alumno.estado === "BAJA" || inscripcion.estado === "BAJA") {
      return errorApi(409, "CONFLICT", "El alumno está dado de baja");
    }

    // Como el cobro en efectivo: una profesora solo informa la de un alumno a su cargo.
    if (!usuario.roles.includes("PROPIETARIA")) {
      const profesora = db.profesoras.find((p) => p.id_usuario === usuario.id_usuario);
      if (profesora?.id_profesora !== inscripcion.id_profesora) {
        return errorApi(403, "FORBIDDEN", "Solo la profesora a cargo de la inscripción o la propietaria informan la transferencia");
      }
    }

    // US-17 / US-16: verificar que no esté repetida el mismo día por el mismo monto
    const diaTransferencia = new Date(cuerpo.data.fecha_hora_transferencia).toISOString().slice(0, 10);
    const repetida = db.pagos.some((p) => {
      if (p.forma_pago !== "TRANSFERENCIA" || p.monto !== cuerpo.data.monto) return false;
      const insc = db.inscripciones.find((i) => i.id_inscripcion === p.id_inscripcion);
      if (!insc || insc.id_alumno !== alumno.id_alumno) return false;
      const pDia = p.fecha_hora_transferencia
        ? p.fecha_hora_transferencia.slice(0, 10)
        : p.fecha_pago.slice(0, 10);
      return pDia === diaTransferencia;
    });

    if (repetida) {
      return errorApi(409, "CONFLICT", "Ya hay una transferencia de ese alumno por el mismo monto ese día");
    }

    const pago = nuevoPago({
      id_inscripcion: inscripcion.id_inscripcion,
      forma_pago: "TRANSFERENCIA",
      monto: cuerpo.data.monto,
      id_usuario_registra: usuario.id_usuario,
      fecha_hora_transferencia: new Date(cuerpo.data.fecha_hora_transferencia).toISOString(),
      titular_cuenta_origen: cuerpo.data.titular_cuenta_origen ?? null,
      observaciones: cuerpo.data.observaciones ?? null,
    });
    pago.estado = "PENDIENTE";
    pago.rendido = false;

    return HttpResponse.json(pago, { status: 201 });
  }),

  // US-16: Mis transferencias (Alumno o Tutor)
  http.get("*/api/v1/pagos/mis-transferencias", async ({ request }) => {
    await delay(300);
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Sesión no válida");

    const persona = db.usuariosPersonas.find(
      (u) => (usuario.email && u.email === usuario.email) || u.id_usuario === usuario.id_usuario,
    );
    const idsCandidatos = [usuario.id_usuario, ...(persona ? [persona.id_usuario] : [])];

    const misAlumnos = db.alumnos.filter(
      (a) =>
        idsCandidatos.includes(a.id_usuario) ||
        (a.id_usuario_responsable !== null && idsCandidatos.includes(a.id_usuario_responsable)),
    );
    const idsMisAlumnos = misAlumnos.map((a) => a.id_alumno);

    // Historial de pagos del alumno (efectivo y transferencias)
    let transferencias = [...db.pagos];

    // Si tiene alumnos vinculados, filtrar por ellos; si no (ej: propietaria testeando), mostrar todas
    if (idsMisAlumnos.length > 0) {
      const idsInscripciones = db.inscripciones
        .filter((i) => idsMisAlumnos.includes(i.id_alumno))
        .map((i) => i.id_inscripcion);
      transferencias = transferencias.filter((p) => idsInscripciones.includes(p.id_inscripcion));
    }

    transferencias.sort(
      (a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime(),
    );

    const respuesta = transferencias.map((p) => {
      const insc = db.inscripciones.find((i) => i.id_inscripcion === p.id_inscripcion);
      const al = insc ? db.alumnos.find((a) => a.id_alumno === insc.id_alumno) : null;
      const persona = al ? db.usuariosPersonas.find((u) => u.id_usuario === al.id_usuario) : null;
      return {
        ...p,
        alumno: {
          id_alumno: al?.id_alumno ?? 0,
          nombre: persona?.nombre ?? "Alumno",
          apellido: persona?.apellido ?? "",
        },
      };
    });

    return HttpResponse.json(respuesta);
  }),

  http.get("*/api/v1/pagos/transferencias", async ({ request }) => {
    await delay(400);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PAGOS_CONFIRMAR" });
    if (denegado) return denegado;
    const query = listarTransferenciasQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    return HttpResponse.json(listarTransferencias(query.data));
  }),

  // Aprobar da el alta definitiva si es la primera cuota (fachada de gestion-cuotas-y-pagos).
  http.post("*/api/v1/pagos/:id/aprobar", async ({ request, params }) => {
    await delay(600);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PAGOS_CONFIRMAR" });
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    // Sin cuerpo, json() falla: queda undefined y el esquema aplica su valor por defecto.
    const cuerpo = aprobarSchema.safeParse(await request.json().catch(() => undefined));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const { pago, error } = buscarTransferenciaPendiente(id);
    if (error) return error;
    const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === pago.id_inscripcion)!;
    const esperado = precioVigente(inscripcion.id_plan);
    if (esperado !== undefined && pago.monto !== esperado && !cuerpo.data.confirmar_monto_distinto) {
      return errorApi(
        409,
        "MONTO_DISTINTO",
        `El monto no coincide con el esperado (${esperado}). Para registrarlo igual, confirmá el monto distinto`,
      );
    }
    activarSiEsPrimerPago(inscripcion);
    return HttpResponse.json(resolver(pago, request, { estado: "CONFIRMADO", motivo_rechazo: null }));
  }),

  http.post("*/api/v1/pagos/:id/rechazar", async ({ request, params }) => {
    await delay(600);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PAGOS_CONFIRMAR" });
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const cuerpo = await leerCuerpo(request, rechazarSchema);
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const { pago, error } = buscarTransferenciaPendiente(id);
    if (error) return error;
    return HttpResponse.json(resolver(pago, request, { estado: "RECHAZADO", motivo_rechazo: cuerpo.data.motivo_rechazo }));
  }),

  // ---------- US-19: Control y rendición de efectivo ----------

  // GET /api/v1/pagos/efectivo-pendiente
  http.get("*/api/v1/pagos/efectivo-pendiente", async ({ request }) => {
  await delay(350);
  const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PAGOS_RENDICION_VER" });
  if (denegado) return denegado;

  const url = new URL(request.url);
  const idProfParam = url.searchParams.get("id_profesora");
  const idProfFiltro = idProfParam ? Number(idProfParam) : undefined;
  const desdeParam = url.searchParams.get("desde");
  const hastaParam = url.searchParams.get("hasta");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 100)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

  // Cobros en efectivo confirmados de una profesora que no están rendidos
  let cobros = db.pagos.filter(
    (p) =>
      p.forma_pago === "EFECTIVO" &&
      p.estado === "CONFIRMADO" &&
      p.rendido === false &&
      p.id_profesora_cobra !== null &&
      p.id_profesora_cobra !== undefined
  );

  if (idProfFiltro) {
    cobros = cobros.filter((p) => p.id_profesora_cobra === idProfFiltro);
  }

  if (desdeParam) {
    cobros = cobros.filter((p) => p.fecha_pago.slice(0, 10) >= desdeParam);
  }
  if (hastaParam) {
    cobros = cobros.filter((p) => p.fecha_pago.slice(0, 10) <= hastaParam);
  }

  // Orden del más viejo al más nuevo (ascendente)
  cobros.sort((a, b) => new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime());

  // Agrupación por profesora (totales completos)
  const mapaProf = new Map<
    number,
    { id_profesora: number; nombre: string; apellido: string; cantidad: number; total: number }
  >();

  for (const p of cobros) {
    const idProf = p.id_profesora_cobra!;
    if (!mapaProf.has(idProf)) {
      const datosProf = resolverDatosProfesora(idProf);
      mapaProf.set(idProf, {
        id_profesora: idProf,
        nombre: datosProf.nombre,
        apellido: datosProf.apellido,
        cantidad: 0,
        total: 0,
      });
    }
    const entry = mapaProf.get(idProf)!;
    entry.cantidad += 1;
    entry.total += p.monto;
  }

  const totalGeneral = cobros.reduce((acc, p) => acc + p.monto, 0);
  const cantidadGeneral = cobros.length;

  // Detalle paginado
  const cobrosPaginados = cobros.slice(offset, offset + limit).map((p) => {
    const insc = db.inscripciones.find((i) => i.id_inscripcion === p.id_inscripcion);
    const al = insc ? db.alumnos.find((a) => a.id_alumno === insc.id_alumno) : null;
    const persona = al ? db.usuariosPersonas.find((u) => u.id_usuario === al.id_usuario) : null;
    const plan = insc ? db.planes.find((pl) => pl.id_plan === insc.id_plan) : null;
    const datosProf = resolverDatosProfesora(p.id_profesora_cobra);

    const diasSinRendir = Math.max(
      0,
      Math.floor((Date.now() - new Date(p.fecha_pago).getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      id_pago: p.id_pago,
      monto: p.monto,
      fecha_pago: p.fecha_pago,
      dias_sin_rendir: diasSinRendir,
      alumno: {
        id_alumno: al?.id_alumno ?? 0,
        nombre: persona?.nombre ?? "Alumno",
        apellido: persona?.apellido ?? "",
        dni: persona?.dni ?? "",
      },
      plan: plan?.nombre ?? "Plan",
      cuota: {
        numero: 1,
        vencimiento: p.fecha_pago,
      },
      profesora: {
        id_profesora: p.id_profesora_cobra!,
        nombre: datosProf.nombre,
        apellido: datosProf.apellido,
      },
    };
  });

    return HttpResponse.json({
      cantidad: cantidadGeneral,
      total: totalGeneral,
      profesoras: Array.from(mapaProf.values()),
      cobros: cobrosPaginados,
      limit,
      offset,
    });
  }),

  // POST /api/v1/pagos/:id/rendir
  http.post("*/api/v1/pagos/:id/rendir", async ({ request, params }) => {
    await delay(400);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PAGOS_RENDICION_VER" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();

    const pago = db.pagos.find((p) => p.id_pago === id);
    if (!pago) return errorApi(404, "NOT_FOUND", "Cobro no encontrado");

    if (pago.forma_pago !== "EFECTIVO" || !pago.id_profesora_cobra) {
      return errorApi(409, "CONFLICT", "Solo se rinde efectivo cobrado por una profesora");
    }

    if (pago.rendido) {
      return errorApi(409, "CONFLICT", "El cobro ya fue rendido");
    }

    const cuerpo = (await request.json().catch(() => ({}))) as { observaciones?: string };
    const ahora = new Date().toISOString();
    pago.rendido = true;
    pago.fecha_rendicion = ahora;
    if (cuerpo.observaciones) {
      pago.observaciones = cuerpo.observaciones;
    }

    return HttpResponse.json({
      rendidos: [pago.id_pago],
      cantidad: 1,
      total: pago.monto,
      salteados: [],
    });
  }),

  // POST /api/v1/pagos/rendir (en lote)
  http.post("*/api/v1/pagos/rendir", async ({ request }) => {
    await delay(600);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PAGOS_RENDICION_VER" });
    if (denegado) return denegado;

    const cuerpo = (await request.json().catch(() => ({}))) as {
      id_profesora?: number;
      ids_pagos?: number[];
      observaciones?: string;
    };

    let pagosARendir: typeof db.pagos = [];
    const salteados: { id_pago: number; motivo: string }[] = [];

    if (cuerpo.id_profesora) {
      pagosARendir = db.pagos.filter(
        (p) =>
          p.id_profesora_cobra === cuerpo.id_profesora &&
          p.forma_pago === "EFECTIVO" &&
          p.estado === "CONFIRMADO" &&
          !p.rendido
      );
    } else if (Array.isArray(cuerpo.ids_pagos)) {
      for (const idPago of cuerpo.ids_pagos) {
        const p = db.pagos.find((item) => item.id_pago === idPago);
        if (!p) {
          salteados.push({ id_pago: idPago, motivo: "NO_EXISTE" });
        } else if (p.forma_pago !== "EFECTIVO" || !p.id_profesora_cobra) {
          salteados.push({ id_pago: idPago, motivo: "NO_ES_EFECTIVO_DE_PROFESORA" });
        } else if (p.rendido) {
          salteados.push({ id_pago: idPago, motivo: "YA_RENDIDO" });
        } else {
          pagosARendir.push(p);
        }
      }
    } else {
      return errorApi(400, "VALIDATION_ERROR", "Debe indicar id_profesora o ids_pagos");
    }

    const ahora = new Date().toISOString();
    const rendidos: number[] = [];
    let total = 0;

    for (const p of pagosARendir) {
      p.rendido = true;
      p.fecha_rendicion = ahora;
      rendidos.push(p.id_pago);
      total += p.monto;
    }

    return HttpResponse.json({
      rendidos,
      cantidad: rendidos.length,
      total,
      salteados,
    });
  }),

  // GET /api/v1/pagos/rendiciones (historial)
  http.get("*/api/v1/pagos/rendiciones", async ({ request }) => {
    await delay(350);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "PAGOS_RENDICION_VER" });
    if (denegado) return denegado;

    const url = new URL(request.url);
    const idProfParam = url.searchParams.get("id_profesora");
    const idProfFiltro = idProfParam ? Number(idProfParam) : undefined;
    const desdeParam = url.searchParams.get("desde");
    const hastaParam = url.searchParams.get("hasta");
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 100)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

    let rendidos = db.pagos.filter(
      (p) =>
        p.forma_pago === "EFECTIVO" &&
        p.rendido === true &&
        p.fecha_rendicion !== null &&
        p.fecha_rendicion !== undefined
    );

    if (idProfFiltro) {
      rendidos = rendidos.filter((p) => p.id_profesora_cobra === idProfFiltro);
    }

    if (desdeParam) {
      rendidos = rendidos.filter(
        (p) => p.fecha_rendicion && p.fecha_rendicion.slice(0, 10) >= desdeParam
      );
    }
    if (hastaParam) {
      rendidos = rendidos.filter(
        (p) => p.fecha_rendicion && p.fecha_rendicion.slice(0, 10) <= hastaParam
      );
    }

    // Orden descendente por fecha de rendición
    rendidos.sort(
      (a, b) => new Date(b.fecha_rendicion!).getTime() - new Date(a.fecha_rendicion!).getTime()
    );

    const total = rendidos.length;
    const datosPaginados = rendidos.slice(offset, offset + limit).map((p) => {
      const insc = db.inscripciones.find((i) => i.id_inscripcion === p.id_inscripcion);
      const al = insc ? db.alumnos.find((a) => a.id_alumno === insc.id_alumno) : null;
      const persona = al ? db.usuariosPersonas.find((u) => u.id_usuario === al.id_usuario) : null;
      const plan = insc ? db.planes.find((pl) => pl.id_plan === insc.id_plan) : null;
      const datosProf = resolverDatosProfesora(p.id_profesora_cobra);

      return {
        id_pago: p.id_pago,
        monto: p.monto,
        fecha_pago: p.fecha_pago,
        fecha_rendicion: p.fecha_rendicion!,
        alumno: {
          id_alumno: al?.id_alumno ?? 0,
          nombre: persona?.nombre ?? "Alumno",
          apellido: persona?.apellido ?? "",
          dni: persona?.dni ?? "",
        },
        plan: plan?.nombre ?? "Plan",
        cuota: {
          numero: 1,
          vencimiento: p.fecha_pago,
        },
        profesora: {
          id_profesora: p.id_profesora_cobra!,
          nombre: datosProf.nombre,
          apellido: datosProf.apellido,
        },
      };
    });

    return HttpResponse.json({
      datos: datosPaginados,
      total,
      limit,
      offset,
    });
  }),
];
