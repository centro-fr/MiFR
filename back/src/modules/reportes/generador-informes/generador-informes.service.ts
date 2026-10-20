import { fechaActualArgentina, rangoDeDiasArgentinos } from "../../../shared/utils/fecha-argentina.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoPagos } from "../../gestion-cuotas-y-pagos/pago/interface/i-info-pagos.js";
import type { AsistenciaDeAlumno } from "../../gestion-inscripciones-y-clases/asistencia/asistencia.types.js";
import type { IInfoAsistencia } from "../../gestion-inscripciones-y-clases/asistencia/interface/i-info-asistencia.js";
import type { IInfoAlumnos } from "../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { HorarioRespuesta } from "../../gestion-servicio-entrenamiento/horario/horario.types.js";
import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { IInfoPlanes } from "../../gestion-servicio-entrenamiento/plan/interface/i-info-planes.js";
import type {
  EstadisticasInscripciones,
  EstadisticasPlanes,
  FiltroCobranza,
  FiltroCuotasVencidas,
  FiltroInformeAsistencia,
  FiltroInscripciones,
  FiltroOcupacion,
  FiltroPlanes,
  InformeAsistencia,
  InformeCobranza,
  InformeCuotasVencidas,
  InformeOcupacion,
  ItemAsistenciaAlumno,
  ItemEstadisticaMes,
  ItemEstadisticaPlan,
  ItemOcupacionHorario,
  NivelOcupacion,
  TotalPorFormaPago,
} from "./generador-informes.types.js";

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// US-37: verde por debajo del 60 %, amarillo hasta el 84 %, naranja hasta el 99 % y rojo al llenarse. Se
// compara en enteros para que 17 de 20 sea CASI_LLENO sin depender del redondeo.
const UMBRALES_OCUPACION: readonly [number, NivelOcupacion][] = [
  [100, "COMPLETO"],
  [85, "CASI_LLENO"],
  [60, "MODERADO"],
];

function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 10000) / 100 : 0;
}

function sumar<T>(filas: T[], valor: (fila: T) => number): number {
  return filas.reduce((total, fila) => total + valor(fila), 0);
}

function nivelDeOcupacion(inscriptos: number, cupo: number | null): NivelOcupacion {
  if (cupo === null) return "SIN_CUPO";
  return UMBRALES_OCUPACION.find(([minimo]) => inscriptos * 100 >= minimo * cupo)?.[1] ?? "LIBRE";
}

function itemAsistenciaAlumno(fila: AsistenciaDeAlumno): ItemAsistenciaAlumno {
  return {
    id_alumno: fila.id_alumno,
    nombre: fila.nombre,
    apellido: fila.apellido,
    estado: fila.estado,
    clases_previstas: fila.clases_previstas,
    asistencias: fila.clases_asistidas,
    inasistencias: fila.clases_previstas - fila.clases_asistidas,
    porcentaje_asistencia: porcentaje(fila.clases_asistidas, fila.clases_previstas),
  };
}

function itemOcupacion(horario: HorarioRespuesta, inscriptos: number): ItemOcupacionHorario {
  const { actividad, profesora } = horario;
  const cupo = horario.cupo_maximo_efectivo;
  return {
    id_horario: horario.id_horario,
    dia_semana: horario.dia_semana,
    hora_inicio: horario.hora_inicio,
    hora_fin: horario.hora_fin,
    actividad: {
      id_actividad: actividad.id_actividad,
      nombre: actividad.nombre,
      modalidad: actividad.modalidad,
    },
    profesora: {
      id_profesora: profesora.id_profesora,
      nombre: profesora.usuario.nombre,
      apellido: profesora.usuario.apellido,
    },
    cupo_maximo: cupo,
    inscriptos,
    porcentaje_ocupacion: cupo === null ? null : porcentaje(inscriptos, cupo),
    nivel: nivelDeOcupacion(inscriptos, cupo),
  };
}

function resumirOcupacion(datos: ItemOcupacionHorario[]): InformeOcupacion["resumen"] {
  const conCupo = datos.filter(
    (item): item is ItemOcupacionHorario & { cupo_maximo: number } => item.cupo_maximo !== null,
  );
  const por_nivel: Record<NivelOcupacion, number> = {
    LIBRE: 0,
    MODERADO: 0,
    CASI_LLENO: 0,
    COMPLETO: 0,
    SIN_CUPO: 0,
  };
  for (const { nivel } of datos) por_nivel[nivel] += 1;
  return {
    total_horarios: datos.length,
    ocupacion_total: porcentaje(
      sumar(conCupo, ({ inscriptos }) => inscriptos),
      sumar(conCupo, ({ cupo_maximo }) => cupo_maximo),
    ),
    por_nivel,
  };
}

// Componente GeneradorInformes de Reportes (capa de negocio no persistente).
// Coordina consultas analíticas a través de interfaces IInfo* de los subsistemas persistentes,
// computando agregaciones, porcentajes y resúmenes para la toma de decisiones de la propietaria.
export class GeneradorInformesService {
  constructor(
    private readonly cuotas: IInfoCuotas,
    private readonly pagos: IInfoPagos,
    private readonly planes: IInfoPlanes,
    private readonly inscripciones: IInfoInscripciones,
    private readonly alumnos: IInfoAlumnos,
    private readonly asistencias: IInfoAsistencia,
    private readonly horarios: IInfoHorarios,
  ) {}

  // US-34: informe de alumnos con cuota vencida (fuera del período de gracia), con deuda exigible y días de mora.
  async informeCuotasVencidas(filtro: FiltroCuotasVencidas): Promise<InformeCuotasVencidas> {
    const hoy = fechaActualArgentina();
    const todas = await this.cuotas.cuotasVencidasDetalladas(hoy);

    const filtradas = todas.filter((item) => {
      if (filtro.desde && item.fecha_vencimiento < filtro.desde) return false;
      if (filtro.hasta && item.fecha_vencimiento > filtro.hasta) return false;
      if (filtro.id_profesora !== undefined && item.profesora.id_profesora !== filtro.id_profesora)
        return false;
      if (filtro.id_alumno !== undefined && item.alumno.id_alumno !== filtro.id_alumno) return false;
      if (filtro.id_plan !== undefined && item.plan.id_plan !== filtro.id_plan) return false;
      return true;
    });

    const alumnosIds = new Set(filtradas.map((item) => item.alumno.id_alumno));
    const montoTotal = filtradas.reduce((acc, item) => acc + item.monto_adeudado, 0);
    const promedio = alumnosIds.size > 0 ? Math.round((montoTotal / alumnosIds.size) * 100) / 100 : 0;

    // Agrupación por profesora
    const porProfesoraMap = new Map<
      number,
      { id_profesora: number; nombre: string; apellido: string; alumnos: Set<number>; monto_total: number }
    >();
    for (const item of filtradas) {
      const prof = item.profesora;
      let entrada = porProfesoraMap.get(prof.id_profesora);
      if (!entrada) {
        entrada = {
          id_profesora: prof.id_profesora,
          nombre: prof.nombre,
          apellido: prof.apellido,
          alumnos: new Set<number>(),
          monto_total: 0,
        };
        porProfesoraMap.set(prof.id_profesora, entrada);
      }
      entrada.alumnos.add(item.alumno.id_alumno);
      entrada.monto_total += item.monto_adeudado;
    }

    const por_profesora = Array.from(porProfesoraMap.values()).map((p) => ({
      id_profesora: p.id_profesora,
      nombre: p.nombre,
      apellido: p.apellido,
      cantidad_alumnos: p.alumnos.size,
      monto_total: p.monto_total,
    }));

    // Ordenamiento por defecto: mayor días vencida primero, luego monto adeudado descendente
    filtradas.sort((a, b) => b.dias_vencida - a.dias_vencida || b.monto_adeudado - a.monto_adeudado);

    const pagina = filtradas.slice(filtro.offset, filtro.offset + filtro.limit);

    return {
      periodo: {
        desde: filtro.desde ? filtro.desde.toISOString().slice(0, 10) : null,
        hasta: filtro.hasta ? filtro.hasta.toISOString().slice(0, 10) : null,
      },
      resumen: {
        total_alumnos_vencidos: alumnosIds.size,
        monto_total_adeudado: montoTotal,
        promedio_deuda_alumno: promedio,
      },
      por_profesora,
      datos: pagina.map((item) => ({
        ...item,
        fecha_vencimiento: item.fecha_vencimiento.toISOString().slice(0, 10),
      })),
      total: filtradas.length,
      limit: filtro.limit,
      offset: filtro.offset,
    };
  }

  // Informe de cobranza por período: cuotas cobradas y pagos CONFIRMADOS agrupados por forma de pago.
  async informeCobranza(filtro: FiltroCobranza): Promise<InformeCobranza> {
    const hoy = fechaActualArgentina();
    const desde = filtro.desde ?? new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
    const hasta = filtro.hasta ?? hoy;

    const resultado = await this.pagos.obtenerCobranza(
      {
        desde,
        hasta,
        forma_pago: filtro.forma_pago,
        id_profesora: filtro.id_profesora,
      },
      {
        limit: filtro.limit,
        offset: filtro.offset,
      },
    );

    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let totalCobrado = 0;
    let cantidadPagos = 0;

    for (const t of resultado.totalesPorForma) {
      totalCobrado += t.total;
      cantidadPagos += t.cantidad;
      if (t.forma_pago === "EFECTIVO") totalEfectivo += t.total;
      if (t.forma_pago === "TRANSFERENCIA") totalTransferencia += t.total;
    }

    const por_forma_pago: TotalPorFormaPago[] = resultado.totalesPorForma.map((t) => ({
      forma_pago: t.forma_pago,
      total: t.total,
      cantidad: t.cantidad,
      porcentaje: totalCobrado > 0 ? Math.round((t.total / totalCobrado) * 10000) / 100 : 0,
    }));

    return {
      periodo: {
        desde: desde.toISOString().slice(0, 10),
        hasta: hasta.toISOString().slice(0, 10),
      },
      resumen: {
        total_cobrado: totalCobrado,
        total_efectivo: totalEfectivo,
        total_transferencia: totalTransferencia,
        cantidad_pagos: cantidadPagos,
      },
      por_forma_pago,
      datos: resultado.pagos.map((p) => ({
        ...p,
        fecha_pago: p.fecha_pago.toISOString(),
      })),
      total: resultado.total,
      limit: filtro.limit,
      offset: filtro.offset,
    };
  }

  // US-36: estadísticas de planes más elegidos ordenados por cantidad de alumnos e ingreso estimado.
  async estadisticasPlanes(filtro: FiltroPlanes): Promise<EstadisticasPlanes> {
    const hoy = fechaActualArgentina();
    const [planes, conteos] = await Promise.all([
      this.planes.listarVigentes({ id_actividad_exclusiva: filtro.id_actividad }),
      this.inscripciones.contarActivasPorPlan({
        id_profesora: filtro.id_profesora,
        id_actividad: filtro.id_actividad,
      }),
    ]);

    const precios = new Map<number, number | null>();
    await Promise.all(
      planes.map(async (p) => {
        const precio = await this.planes.precioVigente(p.id_plan, hoy);
        precios.set(p.id_plan, precio ? precio.precio : null);
      }),
    );

    let totalAlumnosActivos = 0;
    let ingresoEstimadoTotal = 0;

    const items: ItemEstadisticaPlan[] = planes.map((plan) => {
      const cantidad_alumnos = conteos.get(plan.id_plan) ?? 0;
      const precio_vigente = precios.get(plan.id_plan) ?? null;
      const ingreso_estimado = cantidad_alumnos * (precio_vigente ?? 0);

      totalAlumnosActivos += cantidad_alumnos;
      ingresoEstimadoTotal += ingreso_estimado;

      return {
        id_plan: plan.id_plan,
        nombre: plan.nombre,
        tipo: plan.tipo,
        actividad_exclusiva: plan.actividad_exclusiva
          ? {
              id_actividad: plan.actividad_exclusiva.id_actividad,
              nombre: plan.actividad_exclusiva.nombre,
            }
          : null,
        cantidad_alumnos,
        porcentaje: 0,
        precio_vigente,
        ingreso_estimado,
      };
    });

    for (const item of items) {
      item.porcentaje =
        totalAlumnosActivos > 0 ? Math.round((item.cantidad_alumnos / totalAlumnosActivos) * 10000) / 100 : 0;
    }

    // Ordenar de mayor a menor cantidad de alumnos, desempate por nombre
    items.sort((a, b) => b.cantidad_alumnos - a.cantidad_alumnos || a.nombre.localeCompare(b.nombre));

    return {
      resumen: {
        total_alumnos_activos: totalAlumnosActivos,
        ingreso_estimado_total: ingresoEstimadoTotal,
        total_planes: items.length,
      },
      planes: items,
    };
  }

  // US-35: estadísticas de nuevas inscripciones agrupadas por mes, calculadas sobre altas definitivas de alumnos.
  async estadisticasInscripciones(filtro: FiltroInscripciones): Promise<EstadisticasInscripciones> {
    const hoy = fechaActualArgentina();
    const anioActual = hoy.getUTCFullYear();

    let desde: Date;
    let hasta: Date;
    let anioSeleccionado: number | null = null;

    if (filtro.desde && filtro.hasta) {
      desde = filtro.desde;
      hasta = filtro.hasta;
      if (filtro.anio) anioSeleccionado = filtro.anio;
    } else if (filtro.anio) {
      anioSeleccionado = filtro.anio;
      desde = new Date(Date.UTC(anioSeleccionado, 0, 1));
      hasta = new Date(Date.UTC(anioSeleccionado, 11, 31));
    } else {
      anioSeleccionado = anioActual;
      desde = new Date(Date.UTC(anioSeleccionado, 0, 1));
      hasta = new Date(Date.UTC(anioSeleccionado, 11, 31));
    }

    const { inicio, fin } = rangoDeDiasArgentinos(desde, hasta);
    const conteos = await this.alumnos.contarAltasPorMes({
      inicio,
      fin,
      id_plan: filtro.id_plan,
      id_profesora: filtro.id_profesora,
    });

    const conteoPorClave = new Map<string, number>();
    for (const c of conteos) {
      conteoPorClave.set(`${c.anio}-${c.mes}`, c.total);
    }

    const meses: ItemEstadisticaMes[] = [];
    let curAnio = desde.getUTCFullYear();
    let curMes = desde.getUTCMonth() + 1;
    const finAnio = hasta.getUTCFullYear();
    const finMes = hasta.getUTCMonth() + 1;

    let prevCantidad: number | null = null;
    let totalAltas = 0;
    let mesPico: { mes: number; anio: number; nombre_mes: string; cantidad: number } | null = null;

    while (curAnio < finAnio || (curAnio === finAnio && curMes <= finMes)) {
      const cantidad = conteoPorClave.get(`${curAnio}-${curMes}`) ?? 0;
      totalAltas += cantidad;

      const nombre_mes = NOMBRES_MESES[curMes - 1];

      let diferencia_mes_anterior: number | null = null;
      let porcentaje_variacion: number | null = null;

      if (prevCantidad !== null) {
        diferencia_mes_anterior = cantidad - prevCantidad;
        porcentaje_variacion =
          prevCantidad > 0 ? Math.round(((cantidad - prevCantidad) / prevCantidad) * 10000) / 100 : null;
      }

      if (!mesPico || cantidad > mesPico.cantidad) {
        if (cantidad > 0) {
          mesPico = { mes: curMes, anio: curAnio, nombre_mes, cantidad };
        }
      }

      meses.push({
        mes: curMes,
        anio: curAnio,
        nombre_mes,
        cantidad,
        diferencia_mes_anterior,
        porcentaje_variacion,
      });

      prevCantidad = cantidad;

      curMes++;
      if (curMes > 12) {
        curMes = 1;
        curAnio++;
      }
    }

    const promedio = meses.length > 0 ? Math.round((totalAltas / meses.length) * 100) / 100 : 0;

    return {
      periodo: {
        desde: desde.toISOString().slice(0, 10),
        hasta: hasta.toISOString().slice(0, 10),
        anio: anioSeleccionado,
      },
      resumen: {
        total_altas: totalAltas,
        promedio_mensual: promedio,
        mes_pico: mesPico,
      },
      meses,
    };
  }

  // US-33: solo clases dictadas, con las inasistencias que registró el cierre (US-21). Por defecto, el
  // mes en curso hasta hoy. Los totales son del período entero; el detalle por alumno, paginado.
  async informeAsistencia(filtro: FiltroInformeAsistencia): Promise<InformeAsistencia> {
    const hasta = filtro.hasta ?? fechaActualArgentina();
    const desde = filtro.desde ?? new Date(Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), 1));
    const consulta = {
      desde,
      hasta,
      id_alumno: filtro.id_alumno,
      id_profesora: filtro.id_profesora,
      id_actividad: filtro.id_actividad,
      incluir_bajas: filtro.incluir_bajas,
    };
    const [alumnos, profesoras] = await Promise.all([
      this.asistencias.resumirPorAlumno(consulta),
      this.asistencias.resumirPorProfesora(consulta),
    ]);
    const previstas = sumar(alumnos, ({ clases_previstas }) => clases_previstas);
    const asistencias = sumar(alumnos, ({ clases_asistidas }) => clases_asistidas);

    return {
      periodo: { desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) },
      resumen: {
        // Cada clase tiene una sola profesora dictante: la suma no cuenta dos veces una clase.
        clases_dictadas: sumar(profesoras, ({ clases_dictadas }) => clases_dictadas),
        asistencias,
        inasistencias: previstas - asistencias,
        porcentaje_asistencia: porcentaje(asistencias, previstas),
      },
      por_profesora: profesoras.map((profesora) => ({
        id_profesora: profesora.id_profesora,
        nombre: profesora.nombre,
        apellido: profesora.apellido,
        clases_dictadas: profesora.clases_dictadas,
        cantidad_alumnos: profesora.alumnos,
        asistencias: profesora.clases_asistidas,
        porcentaje_promedio: porcentaje(profesora.clases_asistidas, profesora.clases_previstas),
      })),
      datos: alumnos.slice(filtro.offset, filtro.offset + filtro.limit).map(itemAsistenciaAlumno),
      total: alumnos.length,
      limit: filtro.limit,
      offset: filtro.offset,
    };
  }

  // US-37: inscriptos activos de cada horario vigente contra el cupo del horario o, si no tiene, el de
  // la actividad. Una pre-inscripción no cuenta: todavía no es un alumno activo.
  async informeOcupacion(filtro: FiltroOcupacion): Promise<InformeOcupacion> {
    const horarios = (await this.horarios.listarVigentes()).filter(
      (horario) =>
        (filtro.id_actividad === undefined || horario.id_actividad === filtro.id_actividad) &&
        (filtro.id_profesora === undefined || horario.id_profesora === filtro.id_profesora) &&
        (filtro.modalidad === undefined || horario.actividad.modalidad === filtro.modalidad),
    );
    const inscriptos = await this.inscripciones.contarInscriptosParaAsistencia(
      horarios.map(({ id_horario }) => id_horario),
      fechaActualArgentina(),
    );
    const datos = horarios.map((horario) => itemOcupacion(horario, inscriptos.get(horario.id_horario) ?? 0));
    return { resumen: resumirOcupacion(datos), datos };
  }
}
