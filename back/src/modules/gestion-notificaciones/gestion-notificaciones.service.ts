import type { ILogicaNotificaciones } from "./interface/i-logica-notificaciones.js";
import type { ResumenDiarioPropietariaService } from "./resumen-diario-propietaria/resumen-diario-propietaria.service.js";
import type { ResumenDiario } from "./resumen-diario-propietaria/resumen-diario-propietaria.types.js";

// Realiza ILogicaNotificaciones pasando cada operación a su componente.
export class GestionNotificacionesService implements ILogicaNotificaciones {
  constructor(private readonly resumenDiario: ResumenDiarioPropietariaService) {}

  obtenerResumenDiario(): Promise<ResumenDiario> {
    return this.resumenDiario.obtener();
  }
}
