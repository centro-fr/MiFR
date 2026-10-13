import type {
  ActualizarHorariosInput,
  CambiarPlanInput,
  CrearInscripcionInput,
  DarDeBajaAlumnoInput,
  ReactivarAlumnoInput,
} from "./inscripcion/inscripcion.schemas.js";
import { ConflictError } from "../../shared/errors/app-error.js";
import type { IUnidadDeTrabajo } from "../../shared/db/transaccion.js";
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
import type {
  CambiarSuplenciaInput,
  ListarSuplenciasQuery,
  RegistrarSuplenciaInput,
} from "./suplencia/suplencia.schemas.js";
import type { SuplenciaService } from "./suplencia/suplencia.service.js";
import type { SuplenciaConDatos, SuplenciaRegistrada } from "./suplencia/suplencia.types.js";

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
    private readonly unidadDeTrabajo: IUnidadDeTrabajo,
    private readonly suplencias: SuplenciaService,
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

  listarClasesDeHoy(solicitante: Solicitante): Promise<ClaseDelDia[]> {
    return this.listarClasesDelDia(solicitante);
  }

  // Corrección de la propietaria (US-20): materializa las clases de ese día, si todavía no existían.
  listarClasesDeFecha(fecha: Date, solicitante: Solicitante): Promise<ClaseDelDia[]> {
    return this.listarClasesDelDia(solicitante, fecha);
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

  // Cruza Clase y Asistencia, que el diagrama no conecta en ese sentido: una clase con alguien marcado
  // ya se dio y no se cancela. Las dos lecturas y el cambio de estado van bajo el bloqueo de la clase.
  // Cancelar dos veces devuelve la clase sin tocar nada. Se relee después de confirmar: la lectura
  // no va por la transacción y adentro todavía vería la clase sin cancelar.
  async cancelarClase(idClase: number, solicitante: Solicitante): Promise<ClaseConDatos> {
    await this.unidadDeTrabajo.ejecutar(async () => {
      const estado = await this.clases.bloquearParaCancelar(idClase);
      if (estado !== "PROGRAMADA") return;
      if (await this.asistencias.tieneMarcasManuales(idClase)) {
        throw new ConflictError("La clase ya tiene asistencias marcadas: no se puede cancelar");
      }
      await this.clases.cancelar(idClase);
    });
    return this.clases.obtenerPara(idClase, solicitante);
  }

  listarSuplencias(filtro: ListarSuplenciasQuery): Promise<SuplenciaConDatos[]> {
    return this.suplencias.listar(filtro);
  }

  registrarSuplencia(input: RegistrarSuplenciaInput, idUsuario: number): Promise<SuplenciaRegistrada> {
    return this.suplencias.registrar(input, idUsuario);
  }

  cambiarSuplencia(
    idClase: number,
    input: CambiarSuplenciaInput,
    idUsuario: number,
  ): Promise<SuplenciaConDatos> {
    return this.suplencias.cambiar(idClase, input, idUsuario);
  }

  eliminarSuplencia(idClase: number): Promise<SuplenciaConDatos> {
    return this.suplencias.eliminar(idClase);
  }

  // Materializa antes de cerrar: una clase que ya terminó y nadie había pedido sale cerrada. La
  // cantidad son los que están en la lista (sin pre-inscriptos); el cupo disponible, el de hoy, que
  // descuenta también las pre-inscripciones con la reserva vigente.
  private async listarClasesDelDia(solicitante: Solicitante, fecha?: Date): Promise<ClaseDelDia[]> {
    await this.clases.materializarDelDia(solicitante, fecha);
    await this.cierreAsistencia.procesarCierresAutomaticos();
    const clases = await this.clases.listarDelDia(solicitante, fecha);
    const idsHorarios = clases.map(({ id_horario }) => id_horario);
    const [inscriptos, ocupados] = await Promise.all([
      this.inscripciones.contarInscriptosParaAsistencia(idsHorarios, fecha ?? fechaActualArgentina()),
      this.inscripciones.contarLugaresOcupados(idsHorarios),
    ]);
    return clases.map((clase) => {
      const cupo = clase.horario.cupo_maximo ?? clase.horario.actividad.cupo_maximo;
      const ocupado = ocupados.get(clase.id_horario) ?? 0;
      return {
        ...clase,
        inscriptos: inscriptos.get(clase.id_horario) ?? 0,
        cupo_disponible: cupo === null ? null : cupo - ocupado,
      };
    });
  }
}
