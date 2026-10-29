import { delay, http, HttpResponse } from "msw";
import { z } from "zod";
import { db } from "@/mocks/db";
import { altasHistoricas } from "@/mocks/data/altas-historicas";
import { asistenciaHistorica, type MarcaDeAsistencia } from "@/mocks/data/asistencia-historica";
import { hoyEnArgentina } from "@/mocks/precios";
import { errorApi, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de GET /reportes/asistencia (US-33) y /reportes/inscripciones (US-35) con el contrato del back
// (reportes/generador-informes): mismos filtros, paginación, orden y redondeo. Las marcas de asistencia
// salen del historial fijo más las clases que se cierren en vivo desde el mock de asistencia; las
// altas, de los alumnos de db más el historial de altas.

const ACCESO = { rol: "PROPIETARIA", permiso: "REPORTES_COBRANZA_VER" } as const;

const id = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive());
const consultaSchema = z
  .object({
    desde: z.string().date().optional(),
    hasta: z.string().date().optional(),
    id_alumno: id.optional(),
    id_profesora: id.optional(),
    id_actividad: id.optional(),
    incluir_bajas: z.enum(["true", "false"]).default("false"),
    limit: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(100)).default("50"),
    offset: z.string().regex(/^\d+$/).transform(Number).default("0"),
  })
  .refine(({ desde, hasta }) => !desde || !hasta || desde <= hasta);

// Se arman una vez: son fijos hasta ayer y recorrerlos en cada pedido sería trabajo repetido.
const HISTORIAL = asistenciaHistorica(db, hoyEnArgentina());
const ALTAS_HISTORICAS = altasHistoricas(
  db.planes.map((plan) => plan.id_plan),
  db.profesoras.map((profesora) => profesora.id_profesora),
  hoyEnArgentina(),
);

const NOMBRES_MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const inscripcionesSchema = z
  .object({
    desde: z.string().date().optional(),
    hasta: z.string().date().optional(),
    anio: z.string().regex(/^\d{4}$/).transform(Number).pipe(z.number().int().min(2000).max(2100)).optional(),
    id_plan: id.optional(),
    id_profesora: id.optional(),
  })
  .refine(({ desde, hasta }) => !desde || !hasta || desde <= hasta);

/** AAAA-MM-DD de Argentina (UTC-3) de un instante guardado en UTC. */
function diaArgentino(instante: string): string {
  return new Date(Date.parse(instante) - 3 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Las altas definitivas como las cuenta el back (contarAltasPorMes): alumnos que no son INACTIVO
 * (pre-inscriptos), por su fecha de alta, y con plan o profesora si alguna inscripción suya los tiene.
 */
function fechasDeAlta(idPlan: number | undefined, idProfesora: number | undefined): string[] {
  const deDb = db.alumnos
    .filter((alumno) => alumno.estado !== "INACTIVO")
    .filter((alumno) =>
      db.inscripciones.some(
        (i) =>
          i.id_alumno === alumno.id_alumno &&
          (idPlan === undefined || i.id_plan === idPlan) &&
          (idProfesora === undefined || i.id_profesora === idProfesora),
      ) || (idPlan === undefined && idProfesora === undefined),
    )
    .map((alumno) => diaArgentino(alumno.fecha_alta));
  const historicas = ALTAS_HISTORICAS.filter(
    (alta) => (idPlan === undefined || alta.id_plan === idPlan) && (idProfesora === undefined || alta.id_profesora === idProfesora),
  ).map((alta) => alta.fecha);
  return [...deDb, ...historicas];
}

const claveDeMes = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, "0")}`;

/** Un elemento por mes del período, también los que no tuvieron altas, como ItemEstadisticaMes del back. */
function mesesDelPeriodo(desde: string, hasta: string, fechas: string[]) {
  const porMes = new Map<string, number>();
  for (const fecha of fechas.filter((f) => f >= desde && f <= hasta)) porMes.set(fecha.slice(0, 7), (porMes.get(fecha.slice(0, 7)) ?? 0) + 1);
  const meses = [];
  let anterior: number | null = null;
  let [anio, mes] = [Number(desde.slice(0, 4)), Number(desde.slice(5, 7))];
  while (claveDeMes(anio, mes) <= hasta.slice(0, 7)) {
    const cantidad = porMes.get(claveDeMes(anio, mes)) ?? 0;
    meses.push({
      mes,
      anio,
      nombre_mes: NOMBRES_MESES[mes - 1],
      cantidad,
      diferencia_mes_anterior: anterior === null ? null : cantidad - anterior,
      porcentaje_variacion: anterior === null || anterior === 0 ? null : Math.round(((cantidad - anterior) / anterior) * 10000) / 100,
    });
    anterior = cantidad;
    if (mes === 12) {
      anio += 1;
      mes = 1;
    } else {
      mes += 1;
    }
  }
  return meses;
}

/** Las marcas de las clases que el mock de asistencia ya cerró (DICTADA). */
function marcasEnVivo(): MarcaDeAsistencia[] {
  return db.clases.flatMap((clase) => {
    const horario = db.horarios.find((h) => h.id_horario === clase.id_horario);
    if (clase.estado !== "DICTADA" || !horario) return [];
    return db.asistencias
      .filter((registro) => registro.id_clase === clase.id_clase)
      .map((registro) => ({
        fecha: clase.fecha_clase.slice(0, 10),
        id_horario: horario.id_horario,
        id_actividad: horario.id_actividad,
        id_profesora: horario.id_profesora,
        id_alumno: registro.id_alumno,
        asistio: registro.asistio,
      }));
  });
}

function todasLasMarcas(): MarcaDeAsistencia[] {
  const enVivo = marcasEnVivo();
  const cerradasEnVivo = new Set(enVivo.map((marca) => `${marca.fecha}-${marca.id_horario}`));
  return [...HISTORIAL.filter((marca) => !cerradasEnVivo.has(`${marca.fecha}-${marca.id_horario}`)), ...enVivo];
}

function agruparPor(marcas: MarcaDeAsistencia[], clave: (marca: MarcaDeAsistencia) => number): Map<number, MarcaDeAsistencia[]> {
  const grupos = new Map<number, MarcaDeAsistencia[]>();
  for (const marca of marcas) {
    const grupo = grupos.get(clave(marca));
    if (grupo) grupo.push(marca);
    else grupos.set(clave(marca), [marca]);
  }
  return grupos;
}

function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 10000) / 100 : 0;
}

function persona(idUsuario: number) {
  const usuario = db.usuariosPersonas.find((u) => u.id_usuario === idUsuario) ?? db.usuarios.find((u) => u.id_usuario === idUsuario);
  return { nombre: usuario?.nombre ?? "", apellido: usuario?.apellido ?? "" };
}

function porApellido(a: { apellido: string; nombre: string; id: number }, b: { apellido: string; nombre: string; id: number }): number {
  return a.apellido.localeCompare(b.apellido, "es") || a.nombre.localeCompare(b.nombre, "es") || a.id - b.id;
}

function resumirPorAlumno(marcas: MarcaDeAsistencia[]) {
  const porAlumno = agruparPor(marcas, (marca) => marca.id_alumno);
  return [...porAlumno.entries()]
    .map(([idAlumno, propias]) => {
      const alumno = db.alumnos.find((a) => a.id_alumno === idAlumno)!;
      const asistencias = propias.filter((marca) => marca.asistio).length;
      return {
        id: idAlumno,
        ...persona(alumno.id_usuario),
        item: {
          id_alumno: idAlumno,
          ...persona(alumno.id_usuario),
          estado: alumno.estado,
          clases_previstas: propias.length,
          asistencias,
          inasistencias: propias.length - asistencias,
          porcentaje_asistencia: porcentaje(asistencias, propias.length),
        },
      };
    })
    .sort(porApellido)
    .map(({ item }) => item);
}

function resumirPorProfesora(marcas: MarcaDeAsistencia[]) {
  const porProfesora = agruparPor(marcas, (marca) => marca.id_profesora);
  return [...porProfesora.entries()]
    .map(([idProfesora, propias]) => {
      const profesora = db.profesoras.find((p) => p.id_profesora === idProfesora);
      const datos = profesora ? persona(profesora.id_usuario) : { nombre: "", apellido: "" };
      const asistencias = propias.filter((marca) => marca.asistio).length;
      return {
        id: idProfesora,
        ...datos,
        item: {
          id_profesora: idProfesora,
          ...datos,
          clases_dictadas: new Set(propias.map((marca) => `${marca.fecha}-${marca.id_horario}`)).size,
          cantidad_alumnos: new Set(propias.map((marca) => marca.id_alumno)).size,
          asistencias,
          porcentaje_promedio: porcentaje(asistencias, propias.length),
        },
      };
    })
    .sort(porApellido)
    .map(({ item }) => item);
}

export const reportesHandlers = [
  http.get("*/api/v1/reportes/inscripciones", async ({ request }) => {
    await delay(400);
    const denegado = verificarAcceso(request, ACCESO);
    if (denegado) return denegado;
    const consulta = inscripcionesSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!consulta.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const { desde: desdePedido, hasta: hastaPedido, anio: anioPedido, id_plan, id_profesora } = consulta.data;

    // Como el back: rango explícito, o el año pedido, o el año en curso; siempre de enero a diciembre.
    const anio = anioPedido ?? Number(hoyEnArgentina().slice(0, 4));
    const conRango = desdePedido !== undefined && hastaPedido !== undefined;
    const desde = conRango ? desdePedido : `${anio}-01-01`;
    const hasta = conRango ? hastaPedido : `${anio}-12-31`;
    const meses = mesesDelPeriodo(desde, hasta, fechasDeAlta(id_plan, id_profesora));
    const total = meses.reduce((suma, mes) => suma + mes.cantidad, 0);
    const pico = meses.reduce<(typeof meses)[number] | null>((mejor, mes) => (mes.cantidad > 0 && (!mejor || mes.cantidad > mejor.cantidad) ? mes : mejor), null);

    return HttpResponse.json({
      periodo: { desde, hasta, anio: conRango ? (anioPedido ?? null) : anio },
      resumen: {
        total_altas: total,
        promedio_mensual: meses.length > 0 ? Math.round((total / meses.length) * 100) / 100 : 0,
        mes_pico: pico && { mes: pico.mes, anio: pico.anio, nombre_mes: pico.nombre_mes, cantidad: pico.cantidad },
      },
      meses,
    });
  }),

  http.get("*/api/v1/reportes/asistencia", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, ACCESO);
    if (denegado) return denegado;
    const consulta = consultaSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!consulta.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const filtro = consulta.data;

    const hasta = filtro.hasta ?? hoyEnArgentina();
    const desde = filtro.desde ?? `${hasta.slice(0, 8)}01`;
    const incluirBajas = filtro.incluir_bajas === "true";
    const marcas = todasLasMarcas().filter((marca) => {
      const alumno = db.alumnos.find((a) => a.id_alumno === marca.id_alumno);
      return (
        marca.fecha >= desde &&
        marca.fecha <= hasta &&
        (filtro.id_alumno === undefined || marca.id_alumno === filtro.id_alumno) &&
        (filtro.id_profesora === undefined || marca.id_profesora === filtro.id_profesora) &&
        (filtro.id_actividad === undefined || marca.id_actividad === filtro.id_actividad) &&
        alumno !== undefined &&
        (incluirBajas || alumno.estado !== "BAJA")
      );
    });

    const alumnos = resumirPorAlumno(marcas);
    const profesoras = resumirPorProfesora(marcas);
    const asistencias = marcas.filter((marca) => marca.asistio).length;
    return HttpResponse.json({
      periodo: { desde, hasta },
      resumen: {
        clases_dictadas: profesoras.reduce((total, p) => total + p.clases_dictadas, 0),
        asistencias,
        inasistencias: marcas.length - asistencias,
        porcentaje_asistencia: porcentaje(asistencias, marcas.length),
      },
      por_profesora: profesoras,
      datos: alumnos.slice(filtro.offset, filtro.offset + filtro.limit),
      total: alumnos.length,
      limit: filtro.limit,
      offset: filtro.offset,
    });
  }),
];
