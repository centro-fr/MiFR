import type {
  ActualizarHorariosInput,
  CambiarPlanInput,
  CrearInscripcionInput,
  DarDeBajaAlumnoInput,
  ReactivarAlumnoInput,
} from "./inscripcion/inscripcion.schemas.js";
import { fechaActualArgentina } from "../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../shared/utils/solicitante.types.js";
import type { HabilitacionDeInscripcion } from "../gestion-cuotas-y-pagos/cuota/cuota.types.js";
import type { IInfoCuotas } from "../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { AsistenciaService } from "./asistencia/asistencia.service.js";
import type { MarcarAsistenciaInput } from "./asistencia/asistencia.types.js";
import type { CierreAsistenciaService } from "./cierre-asistencia/cierre-asistencia.service.js";
import type { ClaseService } from "./clase/clase.service.js";
import type { ClaseConDatos } from "./clase/clase.types.js";
import type { InscripcionService } from "./inscripcion/inscripcion.service.js";
import type {
  AsistenciaDeClase,
  ClaseDelDia,
  ILogicaInscripcionesYClases,
  SituacionCuotaEnClase,
} from "./interface/i-logica-inscripciones-y-clases.js";
import type { FiltroInscripciones, InscripcionConDatos } from "./inscripcion/inscripcion.types.js";

function aSituacionCuota(habilitacion: HabilitacionDeInscripcion | undefined): SituacionCuotaEnClase | null {
  if (!habilitacion) return null;
  return {
    estado: habilitacion.estado,
    fecha_vencimiento: habilitacion.fechaVencimiento,
    dias_restantes: habilitacion.diasRestantes,
    puede_asistir: habilitacion.puedeAsistir,
    tiene_pago_pendiente: habilitacion.tienePagoPendiente,
  };
}

// Realiza ILogicaInscripcionesYClases pasando cada operación a su componente. Las reglas que cruzan
// componentes que el diagrama no conecta viven acá: el estado de cuota (IInfoCuotas) de la lista de
// asistencia y la cantidad de inscriptos de cada clase, porque Clase no conoce a Inscripcion.
export class GestionInscripcionesYClasesService implements ILogicaInscripcionesYClases {
  constructor(
    private readonly inscripciones: InscripcionService,
    private readonly cuotas: IInfoCuotas,
    private readonly clases: ClaseService,
    private readonly asistencias: AsistenciaService,
    private readonly cierreAsistencia: CierreAsistenciaService,
  ) {}

  crearInscripcion(input: CrearInscripcionInput, solicitante: Solicitante): Promise<InscripcionConDatos> {
    return this.inscripciones.crear(input, solicitante);
  }

  listarInscripciones(filtro: FiltroInscripciones, solicitante: Solicitante): Promise<InscripcionConDatos[]> {
    return this.inscripciones.listar(filtro, solicitante);
  }

  obtenerInscripcion(id: number, solicitante: Solicitante): Promise<InscripcionConDatos> {
    return this.inscripciones.obtenerPara(id, solicitante);
  }

  darDeBajaAlumno(idAlumno: number, input: DarDeBajaAlumnoInput): Promise<void> {
    return this.inscripciones.darDeBajaAlumno(idAlumno, input);
  }

  // US-07: quien nunca pagó no vuelve activo, sino pre-inscripto. Inscripcion no conoce los pagos y
  // Cuota ya depende de IInfoInscripciones, así que el cruce lo hace el subsistema con IInfoCuotas.
  async reactivarAlumno(idAlumno: number, input: ReactivarAlumnoInput): Promise<InscripcionConDatos> {
    const yaPago = await this.cuotas.tuvoPagoConfirmado(idAlumno);
    return this.inscripciones.reactivarAlumno(idAlumno, input, yaPago ? "ACTIVA" : "PREINSCRIPTA");
  }

  cambiarPlan(id: number, input: CambiarPlanInput): Promise<InscripcionConDatos> {
    return this.inscripciones.cambiarPlan(id, input);
  }

  actualizarHorarios(id: number, input: ActualizarHorariosInput): Promise<InscripcionConDatos> {
    return this.inscripciones.actualizarHorarios(id, input);
  }

  // Materializa antes de cerrar: una clase de hoy que ya terminó y nadie había pedido sale cerrada.
  async listarClasesDeHoy(solicitante: Solicitante): Promise<ClaseDelDia[]> {
    await this.clases.materializarDelDia(solicitante);
    await this.cierreAsistencia.procesarCierresAutomaticos();
    const clases = await this.clases.listarDelDia(solicitante);
    const inscriptos = await this.inscripciones.contarInscriptosParaAsistencia(
      clases.map(({ id_horario }) => id_horario),
      fechaActualArgentina(),
    );
    return clases.map((clase) => {
      const cantidad = inscriptos.get(clase.id_horario) ?? 0;
      const cupo = clase.horario.cupo_maximo ?? clase.horario.actividad.cupo_maximo;
      return { ...clase, inscriptos: cantidad, cupo_disponible: cupo === null ? null : cupo - cantidad };
    });
  }

  async obtenerAsistenciaDeClase(idClase: number, solicitante: Solicitante): Promise<AsistenciaDeClase> {
    await this.cierreAsistencia.procesarCierresAutomaticos();
    const clase = await this.clases.obtenerPara(idClase, solicitante);
    const inscriptos = await this.asistencias.listarDeClase(clase);
    const habilitaciones = await this.cuotas.habilitacionDeInscripciones(
      inscriptos.map(({ id_inscripcion }) => id_inscripcion),
    );
    return {
      clase,
      inscriptos: inscriptos.map((inscripto) => ({
        ...inscripto,
        situacion_cuota: aSituacionCuota(habilitaciones.get(inscripto.id_inscripcion)),
      })),
    };
  }

  // Antes de marcar se cierran las ventanas vencidas: una profesora no marca fuera de término
  // aunque el cierre automático todavía no haya pasado.
  async marcarAsistencia(
    idClase: number,
    idAlumno: number,
    input: MarcarAsistenciaInput,
    solicitante: Solicitante,
  ): Promise<void> {
    await this.cierreAsistencia.procesarCierresAutomaticos();
    await this.asistencias.marcar(idClase, idAlumno, input, solicitante);
  }

  async marcarTodosPresentes(idClase: number, solicitante: Solicitante): Promise<void> {
    await this.cierreAsistencia.procesarCierresAutomaticos();
    await this.asistencias.marcarTodosPresentes(idClase, solicitante);
  }

  cerrarAsistencia(idClase: number, solicitante: Solicitante): Promise<ClaseConDatos> {
    return this.cierreAsistencia.cerrarManualmente(idClase, solicitante);
  }
}
