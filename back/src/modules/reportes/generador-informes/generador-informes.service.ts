import { fechaActualArgentina, rangoDeDiasArgentinos } from "../../../shared/utils/fecha-argentina.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoPagos } from "../../gestion-cuotas-y-pagos/pago/interface/i-info-pagos.js";
import type { IInfoAlumnos } from "../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoPlanes } from "../../gestion-servicio-entrenamiento/plan/interface/i-info-planes.js";
import type {
  EstadisticasInscripciones,
  EstadisticasPlanes,
  FiltroCobranza,
  FiltroCuotasVencidas,
  FiltroInscripciones,
  FiltroPlanes,
  InformeCobranza,
  InformeCuotasVencidas,
  ItemEstadisticaMes,
  ItemEstadisticaPlan,
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
}
