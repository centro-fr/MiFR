import { delay, http, HttpResponse } from "msw";
import { z } from "zod";
import { generarAvisosDeCuota, generarResumenDiario } from "@/mocks/avisos";
import { db } from "@/mocks/db";
import type { InscripcionMock, PagoMock } from "@/mocks/data/inscripciones";
import type { UsuarioSemilla } from "@/mocks/data/semilla";
import { hoyEnArgentina, precioVigenteDePlan } from "@/mocks/precios";
import { situacionCuotaDe } from "@/mocks/situacion-cuota";
import { profesoraConNombre } from "@/mocks/handlers/serializar";
import { errorApi, idDeRuta, idInvalido, usuarioDeLaSesion, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de GET /resumen-diario (US-26), de GET/PATCH /parametros (parametros-sistema.routes.ts) y de
// las notificaciones propias (notificacion.routes.ts), con las respuestas de sus .openapi.ts. El resumen se calcula sobre la base compartida del mock: las
// mismas transferencias, cobros y cuotas que muestran las otras pantallas y los contadores del menú.

const UNA_HORA_EN_MS = 3_600_000;
const UN_DIA_EN_MS = 86_400_000;
// El back manda las 5 más viejas o más atrasadas de cada bloque.
const CASOS_POR_BLOQUE = 5;

function sumar(montos: number[]): number {
  return montos.reduce((total, monto) => total + Math.round(monto * 100), 0) / 100;
}

function inscripcionDe(pago: PagoMock): InscripcionMock {
  return db.inscripciones.find((i) => i.id_inscripcion === pago.id_inscripcion)!;
}

function alumnoDe(inscripcion: InscripcionMock) {
  const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno)!;
  const usuario = db.usuariosPersonas.find((u) => u.id_usuario === alumno.id_usuario)!;
  return { id_alumno: alumno.id_alumno, nombre: usuario.nombre, apellido: usuario.apellido };
}

function profesoraDe(idProfesora: number) {
  const { usuario } = profesoraConNombre(db.profesoras.find((p) => p.id_profesora === idProfesora)!);
  return { id_profesora: idProfesora, nombre: usuario.nombre, apellido: usuario.apellido };
}

function nombrePlan(idPlan: number): string {
  return db.planes.find((p) => p.id_plan === idPlan)?.nombre ?? "";
}

// TransferenciaEnRevision del back, con lo que agrega el resumen.
function transferenciaEnRevision(pago: PagoMock) {
  const inscripcion = inscripcionDe(pago);
  const horas = Math.floor((Date.now() - new Date(pago.fecha_pago).getTime()) / UNA_HORA_EN_MS);
  return {
    ...pago,
    alumno: alumnoDe(inscripcion),
    plan: nombrePlan(inscripcion.id_plan),
    monto_esperado: precioVigenteDePlan(inscripcion.id_plan)?.precio ?? pago.monto,
    tipo: inscripcion.estado === "PREINSCRIPTA" ? "PRIMERA_CUOTA" : "RENOVACION",
    horas_desde_la_carga: horas,
    supera_24_horas: horas >= 24,
  };
}

function bloqueTransferencias() {
  const pendientes = db.pagos
    .filter((pago) => pago.forma_pago === "TRANSFERENCIA" && pago.estado === "PENDIENTE")
    .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))
    .map(transferenciaEnRevision);
  return {
    cantidad: pendientes.length,
    total: sumar(pendientes.map((p) => p.monto)),
    supera_24_horas: pendientes.filter((p) => p.horas_desde_la_carga >= 24).length,
    por_superar_24_horas: pendientes.filter((p) => p.horas_desde_la_carga >= 12 && p.horas_desde_la_carga < 24).length,
    mas_antiguas: pendientes.slice(0, CASOS_POR_BLOQUE),
  };
}

function diasDesde(instante: string): number {
  const dia = (fecha: Date) => new Date(fecha.getTime() - 3 * UNA_HORA_EN_MS).toISOString().slice(0, 10);
  const desde = new Date(`${dia(new Date(instante))}T00:00:00.000Z`).getTime();
  return Math.round((new Date(`${hoyEnArgentina()}T00:00:00.000Z`).getTime() - desde) / UN_DIA_EN_MS);
}

// CobroSinRendir: el efectivo que cobró una profesora y todavía no entregó (US-19).
function cobroSinRendir(pago: PagoMock) {
  const inscripcion = inscripcionDe(pago);
  return {
    id_pago: pago.id_pago,
    monto: pago.monto,
    fecha_pago: pago.fecha_pago,
    alumno: alumnoDe(inscripcion),
    plan: nombrePlan(inscripcion.id_plan),
    cuota: { numero: 1, vencimiento: inscripcion.fecha_inicio },
    profesora: profesoraDe(pago.id_profesora_cobra!),
    dias_sin_rendir: diasDesde(pago.fecha_pago),
  };
}

function bloqueEfectivo() {
  const sinRendir = db.pagos
    .filter((pago) => pago.forma_pago === "EFECTIVO" && pago.id_profesora_cobra !== null && !pago.rendido)
    .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago));
  const ids = [...new Set(sinRendir.map((pago) => pago.id_profesora_cobra!))];
  return {
    cantidad: sinRendir.length,
    total: sumar(sinRendir.map((pago) => pago.monto)),
    profesoras: ids.map((id) => {
      const propios = sinRendir.filter((pago) => pago.id_profesora_cobra === id);
      return { ...profesoraDe(id), cantidad: propios.length, total: sumar(propios.map((pago) => pago.monto)) };
    }),
    mas_antiguo: sinRendir[0] ? cobroSinRendir(sinRendir[0]) : null,
  };
}

interface CuotaVencida {
  id_inscripcion: number;
  alumno: ReturnType<typeof alumnoDe>;
  plan: { id_plan: number; nombre: string };
  profesora: ReturnType<typeof profesoraDe>;
  fecha_vencimiento: string;
  dias_vencida: number;
  monto_estimado: number | null;
}

function totales(cuotas: CuotaVencida[]) {
  return { cantidad: cuotas.length, monto_estimado: sumar(cuotas.map((c) => c.monto_estimado ?? 0)) };
}

function agrupar<T>(cuotas: CuotaVencida[], clave: (c: CuotaVencida) => number, datos: (c: CuotaVencida) => T) {
  const ids = [...new Set(cuotas.map(clave))];
  return ids.map((id) => {
    const delGrupo = cuotas.filter((c) => clave(c) === id);
    return { ...datos(delGrupo[0]), ...totales(delGrupo) };
  });
}

// Las cuotas mensuales vencidas (pasado el período de gracia), con el monto al precio de hoy.
function bloqueCuotasVencidas() {
  const vencidas: CuotaVencida[] = db.inscripciones
    .filter((i) => i.estado === "ACTIVA" && db.planes.find((p) => p.id_plan === i.id_plan)?.tipo === "MENSUAL")
    .flatMap((inscripcion) => {
      const situacion = situacionCuotaDe(inscripcion);
      if (situacion.estado !== "VENCIDA") return [];
      return [
        {
          id_inscripcion: inscripcion.id_inscripcion,
          alumno: alumnoDe(inscripcion),
          plan: { id_plan: inscripcion.id_plan, nombre: nombrePlan(inscripcion.id_plan) },
          profesora: profesoraDe(inscripcion.id_profesora),
          fecha_vencimiento: situacion.fecha_vencimiento!,
          dias_vencida: -(situacion.dias_restantes ?? 0),
          monto_estimado: precioVigenteDePlan(inscripcion.id_plan)?.precio ?? null,
        },
      ];
    });
  return {
    ...totales(vencidas),
    cantidad_alumnos: new Set(vencidas.map((c) => c.alumno.id_alumno)).size,
    sin_precio: vencidas.filter((c) => c.monto_estimado === null).length,
    por_profesora: agrupar(vencidas, (c) => c.profesora.id_profesora, (c) => c.profesora),
    por_plan: agrupar(vencidas, (c) => c.plan.id_plan, (c) => c.plan),
    mas_atrasadas: [...vencidas].sort((a, b) => b.dias_vencida - a.dias_vencida).slice(0, CASOS_POR_BLOQUE),
  };
}

function resumenDiario() {
  const transferencias = bloqueTransferencias();
  const efectivo = bloqueEfectivo();
  const cuotas_vencidas = bloqueCuotasVencidas();
  return {
    fecha: `${hoyEnArgentina()}T00:00:00.000Z`,
    transferencias,
    efectivo,
    cuotas_vencidas,
    bloques_con_error: [],
    sin_novedades: transferencias.cantidad === 0 && efectivo.cantidad === 0 && cuotas_vencidas.cantidad === 0,
  };
}

// armarMensajeResumen del back: el texto de la notificación diaria, con los montos sin formato.
function mensajeDelResumen(resumen: ReturnType<typeof resumenDiario>): string {
  if (resumen.sin_novedades) return "Todo al día";
  const { transferencias, efectivo, cuotas_vencidas } = resumen;
  const partes: string[] = [];
  const s = (cantidad: number) => (cantidad > 1 ? "s" : "");
  if (transferencias.cantidad > 0) {
    partes.push(`${transferencias.cantidad} transferencia${s(transferencias.cantidad)} por confirmar ($${transferencias.total})`);
  }
  if (efectivo.cantidad > 0) {
    partes.push(`${efectivo.cantidad} cobro${s(efectivo.cantidad)} en efectivo sin rendir ($${efectivo.total})`);
  }
  if (cuotas_vencidas.cantidad_alumnos > 0) {
    partes.push(
      `${cuotas_vencidas.cantidad_alumnos} alumno${s(cuotas_vencidas.cantidad_alumnos)} con cuotas vencidas ($${cuotas_vencidas.monto_estimado})`,
    );
  }
  return partes.length > 0 ? `Resumen diario: ${partes.join(", ")}.` : "Todo al día";
}

// Lo que en el back hacen el intervalo de index.ts y la consulta de la bandeja.
function generarAvisosDelDia(): void {
  generarAvisosDeCuota();
  generarResumenDiario(() => mensajeDelResumen(resumenDiario()));
}

// La sesión del mock es de `usuarios` y los avisos de cuota van a `usuariosPersonas` (los alumnos y
// tutores del DER): se reconoce a la persona por el email, como en mis-transferencias.
function idsDeLaPersona(usuario: UsuarioSemilla): number[] {
  const persona = db.usuariosPersonas.find((u) => u.email !== null && u.email === usuario.email);
  return persona ? [usuario.id_usuario, persona.id_usuario] : [usuario.id_usuario];
}

function notificacionesDe(usuario: UsuarioSemilla) {
  const ids = idsDeLaPersona(usuario);
  return db.notificaciones.filter((n) => ids.includes(n.id_usuario));
}

// NotificacionPropia: sin el destinatario.
function propia({ id_notificacion, tipo, id_cuota, mensaje, fecha_generacion, leida }: (typeof db.notificaciones)[number]) {
  return { id_notificacion, tipo, id_cuota, mensaje, fecha_generacion, leida };
}

// paginacionSchema(20) del back: limit de 1 a 100 y offset, los dos solo dígitos.
function paginacionDe(url: URL): { limit: number; offset: number } | null {
  const limit = url.searchParams.get("limit") ?? "20";
  const offset = url.searchParams.get("offset") ?? "0";
  if (!/^\d{1,3}$/.test(limit) || !/^\d{1,9}$/.test(offset)) return null;
  const cantidad = Number(limit);
  return cantidad >= 1 && cantidad <= 100 ? { limit: cantidad, offset: Number(offset) } : null;
}

// Las no leídas primero y, en cada grupo, de la más nueva a la más vieja.
function enOrdenDeBandeja(a: (typeof db.notificaciones)[number], b: (typeof db.notificaciones)[number]): number {
  if (a.leida !== b.leida) return a.leida ? 1 : -1;
  return b.fecha_generacion.localeCompare(a.fecha_generacion) || b.id_notificacion - a.id_notificacion;
}

// VALOR_POR_CLAVE de parametros-sistema.schemas.ts: qué valor admite cada parámetro.
const entero = (minimo: number, maximo: number) => z.number().int().min(minimo).max(maximo);
const VALOR_POR_CLAVE: Record<string, z.ZodTypeAny> = {
  DATOS_BANCARIOS_CBU: z.string().trim().max(100),
  DATOS_BANCARIOS_ALIAS: z.string().trim().max(100),
  DATOS_BANCARIOS_TITULAR: z.string().trim().max(100),
  VENCIDOS_PUEDEN_ASISTIR: z.boolean(),
  MINUTOS_CIERRE_ASISTENCIA: entero(0, 1440),
  DIAS_RESERVA_PREINSCRIPCION: entero(0, 365),
  DIAS_AVISO_VENCIMIENTO: entero(0, 30),
  INASISTENCIAS_CONSECUTIVAS_INACTIVO: entero(1, 30),
  HORA_RESUMEN_DIARIO: z.string().trim().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  DIA_CIERRE_HONORARIOS: entero(1, 28),
};

const EDITAR_PARAMETROS = { rol: "PROPIETARIA", permiso: "PARAMETROS_EDITAR" } as const;

export const notificacionesHandlers = [
  http.get("*/api/v1/resumen-diario", async ({ request }) => {
    await delay(400);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA" });
    if (denegado) return denegado;
    const resumen = resumenDiario();
    generarResumenDiario(() => mensajeDelResumen(resumen));
    return HttpResponse.json(resumen);
  }),

  http.get("*/api/v1/notificaciones/mias", async ({ request }) => {
    await delay(300);
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    const paginacion = paginacionDe(new URL(request.url));
    if (!paginacion) return idInvalido();
    generarAvisosDelDia();
    const propias = notificacionesDe(usuario).sort(enOrdenDeBandeja);
    return HttpResponse.json({
      datos: propias.slice(paginacion.offset, paginacion.offset + paginacion.limit).map(propia),
      total: propias.length,
      no_leidas: propias.filter((n) => !n.leida).length,
      ...paginacion,
    });
  }),

  http.post("*/api/v1/notificaciones/leidas", async ({ request }) => {
    await delay(300);
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    const sinLeer = notificacionesDe(usuario).filter((n) => !n.leida);
    for (const notificacion of sinLeer) notificacion.leida = true;
    return HttpResponse.json({ marcadas: sinLeer.length });
  }),

  http.post("*/api/v1/notificaciones/:id/leida", async ({ request, params }) => {
    await delay(200);
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    // Una de otra persona responde 404, igual que una que no existe.
    const notificacion = notificacionesDe(usuario).find((n) => n.id_notificacion === id);
    if (!notificacion) return errorApi(404, "NOT_FOUND", "Notificación no encontrada");
    notificacion.leida = true;
    return HttpResponse.json(propia(notificacion));
  }),

  http.get("*/api/v1/parametros", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, EDITAR_PARAMETROS);
    if (denegado) return denegado;
    return HttpResponse.json(db.parametros);
  }),

  http.patch("*/api/v1/parametros/:clave", async ({ request, params }) => {
    await delay(400);
    const denegado = verificarAcceso(request, EDITAR_PARAMETROS);
    if (denegado) return denegado;
    const parametro = db.parametros.find((p) => p.clave === params.clave);
    const esquema = typeof params.clave === "string" ? VALOR_POR_CLAVE[params.clave] : undefined;
    if (!parametro || !esquema) return errorApi(400, "VALIDATION_ERROR", "El parámetro no existe");
    const cuerpo = z.object({ valor: esquema }).safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "El valor no es válido para este parámetro");
    parametro.valor = cuerpo.data.valor as string | number | boolean;
    parametro.fecha_actualizacion = new Date().toISOString();
    return HttpResponse.json(parametro);
  }),
];
