import { delay, http, HttpResponse } from "msw";
import { z } from "zod";
import { db } from "@/mocks/db";
import { limitesDelPeriodo, liquidarPeriodo, sumarMontos } from "@/mocks/calculo-honorarios";
import {
  ALUMNOS_HONORARIOS,
  CLASES_SUPLIDAS_HONORARIOS,
  INSCRIPCIONES_HONORARIOS,
  type LiquidacionDetalleMock,
  type LiquidacionMock,
  type TarifaHonorarioMock,
} from "@/mocks/data/honorarios";
import { hoyEnArgentina } from "@/mocks/precios";
import { errorApi, idDeRuta, idInvalido, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de US-23 con el contrato del back (gestion-honorarios: liquidacion y tarifa-honorario). Los
// campos que el front le pidió al back y todavía no existen no se mockean: el mock no los inventa.
//
// Los alumnos e inscripciones salen de data/honorarios.ts (copia de la base local), no de los de
// alumnos.ts: registrar un cobro en otra pantalla del mock no cambia estos honorarios.

const VER = { rol: "PROPIETARIA", permiso: "HONORARIOS_VER_TODOS" } as const;
const LIQUIDAR = { rol: "PROPIETARIA", permiso: "HONORARIOS_LIQUIDAR" } as const;

const periodoSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const registrarTarifaSchema = z
  .object({
    id_profesora: z.number().int().positive(),
    concepto: z.enum(["ALUMNO_A_CARGO", "HORA_SUPLENCIA"]),
    id_plan: z.number().int().positive().nullable(),
    tipo_valor: z.enum(["PORCENTAJE", "MONTO_FIJO"]),
    valor: z.number().positive().max(99_999_999.99),
    fecha_vigencia_desde: z.string().date(),
  })
  // Los CHECK de tarifas_honorario: PORCENTAJE <= 100 y HORA_SUPLENCIA sin plan.
  .refine((t) => t.tipo_valor !== "PORCENTAJE" || t.valor <= 100)
  .refine((t) => t.concepto === "ALUMNO_A_CARGO" || t.id_plan === null);

const diaComoFecha = (dia: string) => `${dia}T00:00:00.000Z`;
const horaComoFecha = (hora: string) => `1970-01-01T${hora}:00.000Z`;

function profesora(idProfesora: number) {
  const fila = db.profesoras.find((p) => p.id_profesora === idProfesora);
  const usuario = db.usuarios.find((u) => u.id_usuario === fila?.id_usuario);
  return { id_profesora: idProfesora, usuario: { nombre: usuario?.nombre ?? "", apellido: usuario?.apellido ?? "" } };
}

function detallesDe(idLiquidacion: number): LiquidacionDetalleMock[] {
  return db.liquidacionDetalles.filter((detalle) => detalle.id_liquidacion === idLiquidacion);
}

// LiquidacionConProfesora del back.
function liquidacionConProfesora(liquidacion: LiquidacionMock) {
  const detalles = detallesDe(liquidacion.id_liquidacion);
  const lineasAlumnos = detalles.filter((d) => d.concepto === "ALUMNO_A_CARGO");
  const lineasSuplencias = detalles.filter((d) => d.concepto === "CLASE_SUPLIDA" || d.concepto === "DESCUENTO_AUSENCIA");

  return {
    ...liquidacion,
    periodo_desde: diaComoFecha(liquidacion.periodo_desde),
    periodo_hasta: diaComoFecha(liquidacion.periodo_hasta),
    profesora: profesora(liquidacion.id_profesora),
    cantidad_alumnos: lineasAlumnos.length,
    subtotal_alumnos: sumarMontos(lineasAlumnos.map((d) => d.monto)),
    subtotal_suplencias: sumarMontos(lineasSuplencias.map((d) => d.monto)),
  };
}

function informe(periodo: string) {
  const { desde } = limitesDelPeriodo(periodo);
  const liquidaciones = db.liquidaciones
    .filter((l) => l.periodo_desde === desde)
    .sort((a, b) => a.id_profesora - b.id_profesora);
  return {
    periodo,
    total_general: sumarMontos(liquidaciones.map((l) => l.monto_total)),
    liquidaciones: liquidaciones.map(liquidacionConProfesora),
  };
}

function alumnoDeLaLinea(idInscripcion: number) {
  const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === idInscripcion);
  if (inscripcion) {
    const alumno = db.alumnos.find((a) => a.id_alumno === inscripcion.id_alumno);
    const persona = db.usuariosPersonas.find((u) => u.id_usuario === alumno?.id_usuario);
    if (persona) {
      return {
        id_alumno: inscripcion.id_alumno,
        nombre: persona.nombre,
        apellido: persona.apellido,
      };
    }
  }
  const inscripcionMock = INSCRIPCIONES_HONORARIOS.find((i) => i.id_inscripcion === idInscripcion);
  if (inscripcionMock) {
    const alumnoMock = ALUMNOS_HONORARIOS.find((a) => a.id_alumno === inscripcionMock.id_alumno);
    if (alumnoMock) return alumnoMock;
  }
  return { id_alumno: 0, nombre: "Alumno", apellido: `#${idInscripcion}` };
}

function inscripcionDeLaLinea(idInscripcion: number) {
  const inscripcion = db.inscripciones.find((i) => i.id_inscripcion === idInscripcion);
  if (!inscripcion) return undefined;
  const plan = db.planes.find((p) => p.id_plan === inscripcion.id_plan);
  return {
    estado: inscripcion.estado as "ACTIVA" | "BAJA",
    fecha_baja: inscripcion.fecha_baja,
    plan: {
      id_plan: inscripcion.id_plan,
      nombre: plan?.nombre ?? `Plan ${inscripcion.id_plan}`,
    },
  };
}

function claseDeLaLinea(idClase: number) {
  const clase = CLASES_SUPLIDAS_HONORARIOS.find((c) => c.id_clase === idClase)!;
  return {
    fecha_clase: diaComoFecha(clase.fecha_clase),
    hora_inicio: horaComoFecha(clase.hora_inicio),
    hora_fin: horaComoFecha(clase.hora_fin),
    actividad: clase.actividad,
  };
}

// DetalleLiquidacion del back: la tarifa va solo por id.
function detalleConDatos(detalle: LiquidacionDetalleMock) {
  return {
    id_liq_detalle: detalle.id_liq_detalle,
    id_tarifa: detalle.id_tarifa,
    concepto: detalle.concepto,
    id_inscripcion: detalle.id_inscripcion,
    id_clase: detalle.id_clase,
    monto: detalle.monto,
    alumno: detalle.id_inscripcion === null ? null : alumnoDeLaLinea(detalle.id_inscripcion),
    inscripcion: detalle.id_inscripcion === null ? undefined : inscripcionDeLaLinea(detalle.id_inscripcion),
    clase: detalle.id_clase === null ? null : claseDeLaLinea(detalle.id_clase),
  };
}

function liquidacionDetallada(liquidacion: LiquidacionMock) {
  return { ...liquidacionConProfesora(liquidacion), detalles: detallesDe(liquidacion.id_liquidacion).map(detalleConDatos) };
}

function tarifaConDatos(tarifa: TarifaHonorarioMock) {
  return {
    ...tarifa,
    fecha_vigencia_desde: diaComoFecha(tarifa.fecha_vigencia_desde),
    fecha_vigencia_hasta: tarifa.fecha_vigencia_hasta && diaComoFecha(tarifa.fecha_vigencia_hasta),
  };
}

function diaAnterior(dia: string): string {
  return new Date(new Date(diaComoFecha(dia)).getTime() - 86_400_000).toISOString().slice(0, 10);
}

function buscarLiquidacion(valor: string | readonly string[] | undefined) {
  const id = idDeRuta(valor);
  return id === null ? undefined : db.liquidaciones.find((l) => l.id_liquidacion === id);
}

// BORRADOR → CERRADA → PAGADA, sin vuelta atrás.
function cambiarEstado(desde: LiquidacionMock["estado"], hacia: LiquidacionMock["estado"], mensaje: string) {
  return async ({ request, params }: { request: Request; params: Record<string, string | readonly string[] | undefined> }) => {
    await delay(300);
    const denegado = verificarAcceso(request, LIQUIDAR);
    if (denegado) return denegado;
    if (idDeRuta(params.id) === null) return idInvalido();
    const liquidacion = buscarLiquidacion(params.id);
    if (!liquidacion) return errorApi(404, "NOT_FOUND", "No se encontraron esos honorarios");
    if (liquidacion.estado !== desde) return errorApi(409, "ESTADO_INVALIDO", mensaje);
    liquidacion.estado = hacia;
    return HttpResponse.json(liquidacionDetallada(liquidacion));
  };
}

export const honorariosHandlers = [
  http.get("*/api/v1/liquidaciones", async ({ request }) => {
    await delay(400);
    const denegado = verificarAcceso(request, VER);
    if (denegado) return denegado;
    const periodo = periodoSchema.safeParse(new URL(request.url).searchParams.get("periodo"));
    if (!periodo.success) return errorApi(400, "VALIDATION_ERROR", "El período tiene que ser AAAA-MM");
    return HttpResponse.json(informe(periodo.data));
  }),

  http.post("*/api/v1/liquidaciones", async ({ request }) => {
    await delay(700);
    const denegado = verificarAcceso(request, LIQUIDAR);
    if (denegado) return denegado;
    const cuerpo = z.object({ periodo: periodoSchema }).safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "El período tiene que ser AAAA-MM");
    const { periodo } = cuerpo.data;
    if (periodo > hoyEnArgentina().slice(0, 7)) {
      return errorApi(400, "VALIDATION_ERROR", "El período todavía no empezó");
    }
    const { desde, hasta } = limitesDelPeriodo(periodo);
    const sinRecalcular = db.liquidaciones
      .filter((l) => l.periodo_desde === desde && l.estado !== "BORRADOR")
      .map((l) => l.id_profesora);
    const activas = db.profesoras.filter((p) => p.fecha_baja === null).map((p) => p.id_profesora);
    // El back informa en cada advertencia el día con el que buscó la tarifa; el front no lo usa.
    const advertencias = liquidarPeriodo(db, periodo, activas).map((a) => ({ ...a, fecha: diaComoFecha(hasta) }));
    return HttpResponse.json({ ...informe(periodo), advertencias, sin_recalcular: sinRecalcular });
  }),

  http.get("*/api/v1/liquidaciones/:id", async ({ request, params }) => {
    await delay(300);
    const denegado = verificarAcceso(request, VER);
    if (denegado) return denegado;
    if (idDeRuta(params.id) === null) return idInvalido();
    const liquidacion = buscarLiquidacion(params.id);
    if (!liquidacion) return errorApi(404, "NOT_FOUND", "No se encontraron esos honorarios");
    return HttpResponse.json(liquidacionDetallada(liquidacion));
  }),

  http.post("*/api/v1/liquidaciones/:id/cerrar", cambiarEstado("BORRADOR", "CERRADA", "Solo se cierran los honorarios en revisión")),
  http.post("*/api/v1/liquidaciones/:id/pagar", cambiarEstado("CERRADA", "PAGADA", "Solo se marcan como abonados los honorarios cerrados")),

  http.get("*/api/v1/tarifas-honorario", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, VER);
    if (denegado) return denegado;
    const idProfesora = new URL(request.url).searchParams.get("id_profesora");
    const tarifas = idProfesora ? db.tarifasHonorario.filter((t) => t.id_profesora === Number(idProfesora)) : db.tarifasHonorario;
    return HttpResponse.json(tarifas.map(tarifaConDatos));
  }),

  http.post("*/api/v1/tarifas-honorario", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, LIQUIDAR);
    if (denegado) return denegado;
    const cuerpo = registrarTarifaSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const nueva = cuerpo.data;
    if (nueva.fecha_vigencia_desde < hoyEnArgentina()) {
      return errorApi(400, "VALIDATION_ERROR", "La vigencia no puede empezar en el pasado");
    }
    if (!db.profesoras.some((p) => p.id_profesora === nueva.id_profesora)) {
      return errorApi(400, "VALIDATION_ERROR", `La profesora ${nueva.id_profesora} no existe`);
    }
    const mismas = db.tarifasHonorario.filter(
      (t) => t.id_profesora === nueva.id_profesora && t.concepto === nueva.concepto && t.id_plan === nueva.id_plan,
    );
    if (mismas.some((t) => t.fecha_vigencia_desde >= nueva.fecha_vigencia_desde)) {
      return errorApi(409, "TARIFA_SUPERPUESTA", "Ya hay una tarifa que rige desde esa fecha o después");
    }
    // Como plan_precios: la nueva cierra la vigente el día anterior a empezar.
    for (const tarifa of mismas) {
      if (tarifa.fecha_vigencia_hasta === null || tarifa.fecha_vigencia_hasta >= nueva.fecha_vigencia_desde) {
        tarifa.fecha_vigencia_hasta = diaAnterior(nueva.fecha_vigencia_desde);
      }
    }
    const tarifa: TarifaHonorarioMock = {
      id_tarifa: Math.max(0, ...db.tarifasHonorario.map((t) => t.id_tarifa)) + 1,
      ...nueva,
      fecha_vigencia_hasta: null,
    };
    db.tarifasHonorario.push(tarifa);
    return HttpResponse.json(tarifaConDatos(tarifa), { status: 201 });
  }),
];
