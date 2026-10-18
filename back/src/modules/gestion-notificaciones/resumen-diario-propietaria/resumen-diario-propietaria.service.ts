import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import { registrarError } from "../../../shared/utils/registro-errores.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoPagos } from "../../gestion-cuotas-y-pagos/pago/interface/i-info-pagos.js";
import type { BloqueDelResumen, ResumenDiario } from "./resumen-diario-propietaria.types.js";

// Componente "ResumenDiarioPropietaria" de la vista arquitectónica (GestionNotificaciones, <<process>>):
// junta lo que la propietaria tiene que resolver en el día (US-26). Se calcula al pedirlo, así que no
// guarda nada. La notificación diaria RESUMEN_DIARIO llega cuando exista el componente Notificacion.
export class ResumenDiarioPropietariaService {
  constructor(
    private readonly pagos: IInfoPagos,
    private readonly cuotas: IInfoCuotas,
  ) {}

  async obtener(): Promise<ResumenDiario> {
    const hoy = fechaActualArgentina();
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
}
