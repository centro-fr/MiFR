import type { SeguimientoInactividad } from "../gestion-inscripciones-y-clases/asistencia/asistencia.types.js";
import type { DetectorInactividadService } from "./detector-inactividad/detector-inactividad.service.js";
import type { RegistrarSeguimientoInput } from "./detector-inactividad/detector-inactividad.schemas.js";
import type {
  FiltroAlumnosInactivos,
  PaginaAlumnosInactivos,
} from "./detector-inactividad/detector-inactividad.types.js";
import type { GeneradorInformesService } from "./generador-informes/generador-informes.service.js";
import type {
  EstadisticasInscripciones,
  EstadisticasPlanes,
  FiltroCobranza,
  FiltroCuotasVencidas,
  FiltroInscripciones,
  FiltroPlanes,
  InformeCobranza,
  InformeCuotasVencidas,
} from "./generador-informes/generador-informes.types.js";
import type { ILogicaInformes } from "./interface/i-logica-informes.js";

// Realiza ILogicaInformes pasando cada operación a su componente (DetectorInactividad o GeneradorInformes).
export class ReportesService implements ILogicaInformes {
  constructor(
    private readonly detectorInactividad: DetectorInactividadService,
    private readonly generadorInformes: GeneradorInformesService,
  ) {}

  listarAlumnosInactivos(filtro: FiltroAlumnosInactivos): Promise<PaginaAlumnosInactivos> {
    return this.detectorInactividad.listar(filtro);
  }

  registrarSeguimientoInactividad(
    idInscripcion: number,
    { estado }: RegistrarSeguimientoInput,
    idUsuario: number,
  ): Promise<SeguimientoInactividad> {
    return this.detectorInactividad.registrarSeguimiento(idInscripcion, estado, idUsuario);
  }

  quitarSeguimientoInactividad(idInscripcion: number): Promise<void> {
    return this.detectorInactividad.quitarSeguimiento(idInscripcion);
  }

  informeCuotasVencidas(filtro: FiltroCuotasVencidas): Promise<InformeCuotasVencidas> {
    return this.generadorInformes.informeCuotasVencidas(filtro);
  }

  informeCobranza(filtro: FiltroCobranza): Promise<InformeCobranza> {
    return this.generadorInformes.informeCobranza(filtro);
  }

  estadisticasPlanes(filtro: FiltroPlanes): Promise<EstadisticasPlanes> {
    return this.generadorInformes.estadisticasPlanes(filtro);
  }

  estadisticasInscripciones(filtro: FiltroInscripciones): Promise<EstadisticasInscripciones> {
    return this.generadorInformes.estadisticasInscripciones(filtro);
  }
}
