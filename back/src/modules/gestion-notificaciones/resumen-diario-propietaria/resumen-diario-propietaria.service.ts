import { fechaActualArgentina, horaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import { registrarError } from "../../../shared/utils/registro-errores.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoPagos } from "../../gestion-cuotas-y-pagos/pago/interface/i-info-pagos.js";
import type { IInfoParametros } from "../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IInfoUsuarios } from "../../gestion-usuarios/usuario/interface/i-info-usuarios.js";
import type { IRegistroNotificaciones } from "../notificacion/interface/i-registro-notificaciones.js";
import type { BloqueDelResumen, ResumenDiario } from "./resumen-diario-propietaria.types.js";

// Componente "ResumenDiarioPropietaria" de la vista arquitectónica (GestionNotificaciones, <<process>>):
// junta lo que la propietaria tiene que resolver en el día (US-26). Se calcula al pedirlo para la pantalla
// y, a partir de HORA_RESUMEN_DIARIO, genera la notificación diaria in-app para cada propietaria activa.
export class ResumenDiarioPropietariaService {
  private ultimoDiaGenerado: number | null = null;

  constructor(
    private readonly pagos: IInfoPagos,
    private readonly cuotas: IInfoCuotas,
    private readonly parametros: IInfoParametros,
    private readonly usuarios: IInfoUsuarios,
    private readonly notificaciones: IRegistroNotificaciones,
  ) {}

  async obtener(hoy: Date = fechaActualArgentina()): Promise<ResumenDiario> {
    const bloquesConError: BloqueDelResumen[] = [];
    // Un bloque que falla no deja sin resumen a la propietaria: sale null y el error va al log.
    const armar = async <T>(bloque: BloqueDelResumen, consulta: () => Promise<T>): Promise<T | null> => {
      try {
        return await consulta();
      } catch (error) {
        bloquesConError.push(bloque);
        registrarError(`RESUMEN_DIARIO_${bloque.toUpperCase()}`, error);
        return null;
      }
    };

    const [transferencias, efectivo, cuotasVencidas] = await Promise.all([
      armar("transferencias", () => this.pagos.resumenTransferenciasPendientes()),
      armar("efectivo", () => this.pagos.resumenEfectivoPendiente()),
      armar("cuotas_vencidas", () => this.cuotas.resumenCuotasVencidas(hoy)),
    ]);

    return {
      fecha: hoy,
      transferencias,
      efectivo,
      cuotas_vencidas: cuotasVencidas,
      bloques_con_error: bloquesConError,
      sin_novedades:
        transferencias?.cantidad === 0 && efectivo?.cantidad === 0 && cuotasVencidas?.cantidad === 0,
    };
  }

  // Genera la notificación diaria a partir de HORA_RESUMEN_DIARIO para todas las propietarias activas.
  async generarResumenDiario(ahora: Date = new Date()): Promise<number> {
    const hoy = fechaActualArgentina(ahora);
    if (this.ultimoDiaGenerado === hoy.getTime()) return 0;

    const horaActual = horaActualArgentina(ahora);
    const horaConfigurada = await this.parametros.obtener("HORA_RESUMEN_DIARIO");
    if (horaActual < horaConfigurada) return 0;

    const propietarias = await this.usuarios.listarPropietariasActivas();
    if (propietarias.length === 0) return 0;

    const resumen = await this.obtener(hoy);
    const mensaje = armarMensajeResumen(resumen);

    let guardadas = 0;
    for (const propietaria of propietarias) {
      const guardo = await this.notificaciones.registrarResumenDiario(
        propietaria.id_usuario,
        mensaje,
        ahora,
        hoy,
      );
      if (guardo) guardadas++;
    }

    this.ultimoDiaGenerado = hoy.getTime();
    return guardadas;
  }
}

function armarMensajeResumen(resumen: ResumenDiario): string {
  if (resumen.sin_novedades) {
    return "Todo al día";
  }
  const partes: string[] = [];
  if (resumen.transferencias && resumen.transferencias.cantidad > 0) {
    partes.push(
      `${resumen.transferencias.cantidad} transferencia${resumen.transferencias.cantidad > 1 ? "s" : ""} por confirmar ($${resumen.transferencias.total})`,
    );
  }
  if (resumen.efectivo && resumen.efectivo.cantidad > 0) {
    partes.push(
      `${resumen.efectivo.cantidad} cobro${resumen.efectivo.cantidad > 1 ? "s" : ""} en efectivo sin rendir ($${resumen.efectivo.total})`,
    );
  }
  if (resumen.cuotas_vencidas && resumen.cuotas_vencidas.cantidad_alumnos > 0) {
    partes.push(
      `${resumen.cuotas_vencidas.cantidad_alumnos} alumno${resumen.cuotas_vencidas.cantidad_alumnos > 1 ? "s" : ""} con cuotas vencidas ($${resumen.cuotas_vencidas.monto_estimado})`,
    );
  }
  return partes.length > 0 ? `Resumen diario: ${partes.join(", ")}.` : "Todo al día";
}
