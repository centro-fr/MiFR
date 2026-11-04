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

// Mock de US-23 con el contrato del back (gestion-honorarios: liquidacion y tarifa-honorario). Las
// tarifas van con el contrato que le pedimos al back: el porcentaje por alumno, uno solo para todo el
// estudio (sin profesora), y la hora de suplencia, una por profesora. El back todavía pide profesora
// también para el porcentaje.
//
// Los alumnos e inscripciones salen de data/honorarios.ts (copia de la base local), no de los de
// alumnos.ts: registrar un cobro en otra pantalla del mock no cambia estos honorarios.

const VER = { rol: "PROPIETARIA", permiso: "HONORARIOS_VER_TODOS" } as const;
const LIQUIDAR = { rol: "PROPIETARIA", permiso: "HONORARIOS_LIQUIDAR" } as const;

const periodoSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

// Los CHECK de tarifas_honorario: valor > 0 y PORCENTAJE <= 100. El tipo de cada una sale del concepto
// (regla del Sprint 5): por alumno, un porcentaje de lo cobrado; por hora de suplencia, un monto fijo.
const registrarTarifaSchema = z.discriminatedUnion("concepto", [
  z.object({
    concepto: z.literal("ALUMNO_A_CARGO"),
    tipo_valor: z.literal("PORCENTAJE"),
    valor: z.number().positive().max(100),
    fecha_vigencia_desde: z.string().date(),
  }),
  z.object({
    concepto: z.literal("HORA_SUPLENCIA"),
    id_profesora: z.number().int().positive(),
    tipo_valor: z.literal("MONTO_FIJO"),
    valor: z.number().positive().max(99_999_999.99),
    fecha_vigencia_desde: z.string().date(),
  }),
]);

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
    profesora_titular: profesora(clase.id_prof_ausente),
    profesora_suplente: profesora(clase.id_prof_suplente),
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
    inscripcion: detalle.id_inscripcion === null ? null : inscripcionDeLaLinea(detalle.id_inscripcion),
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

// Como CierreMensualHonorarios del back: desde el día DIA_CIERRE_HONORARIOS (5 al principio) el mes
// anterior se recalcula y se cierra solo, aunque nadie lo haya calculado. Lo pagado no se toca.
function diaDeCierre(): number {
  const valor = db.parametros.find(({ clave }) => clave === "DIA_CIERRE_HONORARIOS")?.valor;
  return typeof valor === "number" ? valor : 5;
}

function cerrarMesAnteriorSiCorresponde(): void {
  const hoy = hoyEnArgentina();
  if (Number(hoy.slice(8, 10)) < diaDeCierre()) return;
  const [anio = 0, mes = 0] = hoy.slice(0, 7).split("-").map(Number);
  const anterior = new Date(Date.UTC(anio, mes - 2, 1)).toISOString().slice(0, 7);
  const { desde } = limitesDelPeriodo(anterior);
  const delMes = () => db.liquidaciones.filter((l) => l.periodo_desde === desde);
  if (delMes().some((l) => l.estado === "BORRADOR") || delMes().length === 0) {
    liquidarPeriodo(db, anterior, db.profesoras.filter((p) => p.fecha_baja === null).map((p) => p.id_profesora));
  }
  for (const liquidacion of delMes()) {
    if (liquidacion.estado === "BORRADOR") liquidacion.estado = "CERRADA";
  }
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
    cerrarMesAnteriorSiCorresponde();
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
    return HttpResponse.json(db.tarifasHonorario.map(tarifaConDatos));
  }),

  http.post("*/api/v1/tarifas-honorario", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, LIQUIDAR);
    if (denegado) return denegado;
    const cuerpo = registrarTarifaSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const datos = cuerpo.data;
    const id_profesora = datos.concepto === "HORA_SUPLENCIA" ? datos.id_profesora : null;
    if (datos.fecha_vigencia_desde < hoyEnArgentina()) {
      return errorApi(400, "VALIDATION_ERROR", "La vigencia no puede empezar en el pasado");
    }
    if (id_profesora !== null && !db.profesoras.some((p) => p.id_profesora === id_profesora)) {
      return errorApi(400, "VALIDATION_ERROR", `La profesora ${id_profesora} no existe`);
    }
    // Como el back: cada alcance (el porcentaje general o la hora de una profesora) tiene su historia.
    const delAlcance = db.tarifasHonorario.filter((t) => t.concepto === datos.concepto && t.id_profesora === id_profesora);
    if (delAlcance.some((t) => t.fecha_vigencia_desde >= datos.fecha_vigencia_desde)) {
      return errorApi(409, "TARIFA_SUPERPUESTA", "Ya hay una tarifa que rige desde esa fecha o después");
    }
    // La nueva cierra la vigente del mismo alcance el día anterior a empezar.
    for (const tarifa of delAlcance) {
      if (tarifa.fecha_vigencia_hasta === null || tarifa.fecha_vigencia_hasta >= datos.fecha_vigencia_desde) {
        tarifa.fecha_vigencia_hasta = diaAnterior(datos.fecha_vigencia_desde);
      }
    }
    const nueva: TarifaHonorarioMock = {
      id_tarifa: Math.max(0, ...db.tarifasHonorario.map((t) => t.id_tarifa)) + 1,
      id_profesora,
      concepto: datos.concepto,
      tipo_valor: datos.tipo_valor,
      valor: datos.valor,
      fecha_vigencia_desde: datos.fecha_vigencia_desde,
      fecha_vigencia_hasta: null,
    };
    db.tarifasHonorario.push(nueva);
    return HttpResponse.json(tarifaConDatos(nueva), { status: 201 });
  }),
];
