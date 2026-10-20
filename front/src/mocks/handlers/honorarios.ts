import { delay, http, HttpResponse } from "msw";
import { z } from "zod";
import { db } from "@/mocks/db";
import { limitesDelPeriodo, liquidarPeriodo, sumarMontos } from "@/mocks/calculo-honorarios";
import {
  ALUMNOS_HONORARIOS,
  CLASES_SUPLIDAS_HONORARIOS,
  INSCRIPCIONES_HONORARIOS,
  PLANES_HONORARIOS,
  type LiquidacionDetalleMock,
  type LiquidacionMock,
  type TarifaHonorarioMock,
} from "@/mocks/data/honorarios";
import { hoyEnArgentina } from "@/mocks/precios";
import { errorApi, idDeRuta, idInvalido, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de US-23 con el contrato que espera el front (features/honorarios/schemas/honorarios.ts):
// /liquidaciones y /tarifas-honorario según back/SPRINT-4.md. El back todavía no los tiene.
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
  return { id_profesora: idProfesora, nombre: usuario?.nombre ?? "", apellido: usuario?.apellido ?? "" };
}

function detallesDe(idLiquidacion: number): LiquidacionDetalleMock[] {
  return db.liquidacionDetalles.filter((detalle) => detalle.id_liquidacion === idLiquidacion);
}

function resumen(liquidacion: LiquidacionMock) {
  const detalles = detallesDe(liquidacion.id_liquidacion);
  const deAlumnos = detalles.filter((d) => d.concepto === "ALUMNO_A_CARGO");
  return {
    id_liquidacion: liquidacion.id_liquidacion,
    estado: liquidacion.estado,
    fecha_liquidacion: liquidacion.fecha_liquidacion,
    monto_total: liquidacion.monto_total,
    profesora: profesora(liquidacion.id_profesora),
    cantidad_alumnos: deAlumnos.length,
    subtotal_alumnos: sumarMontos(deAlumnos.map((d) => d.monto)),
    subtotal_suplencias: sumarMontos(detalles.filter((d) => d.concepto !== "ALUMNO_A_CARGO").map((d) => d.monto)),
  };
}

function informe(periodo: string) {
  const { desde, hasta } = limitesDelPeriodo(periodo);
  const liquidaciones = db.liquidaciones.filter((l) => l.periodo_desde === desde);
  return {
    periodo,
    periodo_desde: diaComoFecha(desde),
    periodo_hasta: diaComoFecha(hasta),
    total_general: sumarMontos(liquidaciones.map((l) => l.monto_total)),
    liquidaciones: liquidaciones.map(resumen),
  };
}

function tarifaAplicada(idTarifa: number) {
  const tarifa = db.tarifasHonorario.find((t) => t.id_tarifa === idTarifa)!;
  return { id_tarifa: tarifa.id_tarifa, tipo_valor: tarifa.tipo_valor, valor: tarifa.valor };
}

function detalleConDatos(detalle: LiquidacionDetalleMock) {
  const base = { id_liq_detalle: detalle.id_liq_detalle, concepto: detalle.concepto, monto: detalle.monto, tarifa: tarifaAplicada(detalle.id_tarifa) };
  if (detalle.concepto === "ALUMNO_A_CARGO") {
    const inscripcion = INSCRIPCIONES_HONORARIOS.find((i) => i.id_inscripcion === detalle.id_inscripcion)!;
    return {
      ...base,
      inscripcion: {
        id_inscripcion: inscripcion.id_inscripcion,
        estado: inscripcion.estado,
        fecha_baja: inscripcion.fecha_baja,
        alumno: ALUMNOS_HONORARIOS.find((a) => a.id_alumno === inscripcion.id_alumno)!,
        plan: PLANES_HONORARIOS.find((p) => p.id_plan === inscripcion.id_plan)!,
      },
      clase: null,
    };
  }
  const clase = CLASES_SUPLIDAS_HONORARIOS.find((c) => c.id_clase === detalle.id_clase)!;
  return {
    ...base,
    inscripcion: null,
    clase: {
      id_clase: clase.id_clase,
      fecha_clase: diaComoFecha(clase.fecha_clase),
      hora_inicio: horaComoFecha(clase.hora_inicio),
      hora_fin: horaComoFecha(clase.hora_fin),
      actividad: { id_actividad: clase.id_actividad, nombre: clase.actividad },
      profesora_ausente: profesora(clase.id_prof_ausente),
      profesora_suplente: profesora(clase.id_prof_suplente),
    },
  };
}

function tarifaConDatos(tarifa: TarifaHonorarioMock) {
  const plan = PLANES_HONORARIOS.find((p) => p.id_plan === tarifa.id_plan) ?? null;
  return {
    ...tarifa,
    plan,
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
    if (!liquidacion) return errorApi(404, "NOT_FOUND", "La liquidación no existe");
    if (liquidacion.estado !== desde) return errorApi(409, "ESTADO_INVALIDO", mensaje);
    liquidacion.estado = hacia;
    return HttpResponse.json(resumen(liquidacion));
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
      return errorApi(400, "PERIODO_FUTURO", "No se puede liquidar un mes que todavía no empezó");
    }
    const delMes = db.liquidaciones.filter((l) => l.periodo_desde === limitesDelPeriodo(periodo).desde);
    if (delMes.length > 0 && delMes.every((l) => l.estado !== "BORRADOR")) {
      return errorApi(409, "LIQUIDACIONES_CERRADAS", "Todas las liquidaciones del mes ya están cerradas");
    }
    const activas = db.profesoras.filter((p) => p.fecha_baja === null).map((p) => p.id_profesora);
    const advertencias = liquidarPeriodo(db, periodo, activas);
    return HttpResponse.json({ ...informe(periodo), advertencias }, { status: 201 });
  }),

  http.get("*/api/v1/liquidaciones/:id", async ({ request, params }) => {
    await delay(300);
    const denegado = verificarAcceso(request, VER);
    if (denegado) return denegado;
    if (idDeRuta(params.id) === null) return idInvalido();
    const liquidacion = buscarLiquidacion(params.id);
    if (!liquidacion) return errorApi(404, "NOT_FOUND", "La liquidación no existe");
    return HttpResponse.json({
      id_liquidacion: liquidacion.id_liquidacion,
      estado: liquidacion.estado,
      monto_total: liquidacion.monto_total,
      profesora: profesora(liquidacion.id_profesora),
      detalles: detallesDe(liquidacion.id_liquidacion).map(detalleConDatos),
    });
  }),

  http.post("*/api/v1/liquidaciones/:id/cerrar", cambiarEstado("BORRADOR", "CERRADA", "Solo se cierra una liquidación en revisión")),
  http.post("*/api/v1/liquidaciones/:id/pagar", cambiarEstado("CERRADA", "PAGADA", "Solo se marca como abonada una liquidación cerrada")),

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
    if (!db.profesoras.some((p) => p.id_profesora === nueva.id_profesora)) return errorApi(404, "NOT_FOUND", "La profesora no existe");
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
