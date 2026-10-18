import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { CuotaParaAviso } from "../../gestion-cuotas-y-pagos/cuota/cuota.types.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoParametros } from "../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IRegistroNotificaciones } from "../notificacion/interface/i-registro-notificaciones.js";
import type { NuevaNotificacion } from "../notificacion/notificacion.types.js";

// Componente PlanificadorNotificaciones (<<process>>) de la vista arquitectónica (US-25). Los avisos de
// cuota no los dispara ninguna acción: ocurren porque pasa el tiempo (patrones.md). Cuota decide qué
// cuotas avisar y de qué tipo; acá se decide a quién y con qué texto, y Notificacion los guarda sin
// duplicarlos. Lo corren el intervalo de index.ts y la consulta de las notificaciones propias.
export class PlanificadorNotificacionesService {
  // Granularidad de día: con el único de la base volver a generar es inofensivo, pero no hace falta
  // recorrer las cuotas en cada consulta. Si una corrida falla, la próxima lo vuelve a intentar.
  private ultimoDiaGenerado: number | null = null;

  constructor(
    private readonly cuotas: IInfoCuotas,
    private readonly parametros: IInfoParametros,
    private readonly notificaciones: IRegistroNotificaciones,
  ) {}

  async generarAvisosDelDia(ahora: Date = new Date()): Promise<number> {
    const hoy = fechaActualArgentina(ahora);
    if (this.ultimoDiaGenerado === hoy.getTime()) return 0;
    const registrados = await this.generarAvisos(hoy);
    this.ultimoDiaGenerado = hoy.getTime();
    return registrados;
  }

  // Devuelve cuántos avisos nuevos guardó: los que ya existían no cuentan.
  async generarAvisos(hoy: Date): Promise<number> {
    const diasPrevios = await this.parametros.obtener("DIAS_AVISO_VENCIMIENTO");
    const cuotas = await this.cuotas.paraAvisoDeVencimiento(hoy, diasPrevios);
    return this.notificaciones.registrar(cuotas.map((cuota) => avisoDeCuota(cuota, hoy)));
  }
}

// El tutor es el usuario del sistema de un menor (US-06): sus avisos le llegan a él. Un alumno que cumple
// 18 años conserva el tutor hasta que se edita su ficha, y puede no tener cuenta propia (email NULL).
function avisoDeCuota(cuota: CuotaParaAviso, hoy: Date): NuevaNotificacion {
  const { alumno } = cuota;
  const deQuien =
    alumno.id_usuario_responsable === null ? "Tu cuota" : `La cuota de ${alumno.nombre} ${alumno.apellido}`;
  return {
    id_usuario: alumno.id_usuario_responsable ?? alumno.id_usuario,
    tipo: cuota.tipo,
    id_cuota: cuota.id_cuota,
    mensaje: `${deQuien} del plan ${cuota.nombre_plan} ${cuandoVence(cuota, hoy)}.`,
  };
}

function cuandoVence({ tipo, fecha_vencimiento }: CuotaParaAviso, hoy: Date): string {
  const fecha = formatoArgentino(fecha_vencimiento);
  if (fecha_vencimiento.getTime() === hoy.getTime()) return `vence hoy, ${fecha}`;
  return tipo === "CUOTA_VENCIDA" ? `venció el ${fecha}` : `vence el ${fecha}`;
}

// Las fechas de las columnas DATE llegan a las 00:00 UTC: el día UTC es el día argentino.
function formatoArgentino(fecha: Date): string {
  const [anio, mes, dia] = fecha.toISOString().slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}
