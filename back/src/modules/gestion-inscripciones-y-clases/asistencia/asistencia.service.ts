import { NotFoundError } from "../../../shared/errors/app-error.js";
import type { IUnidadDeTrabajo } from "../../../shared/db/transaccion.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { IInfoInscripciones } from "../inscripcion/interface/i-info-inscripciones.js";
import type { ClaseConDatos } from "../clase/clase.types.js";
import type { IInfoClases } from "../clase/interface/i-info-clases.js";
import type { AsistenciaRepository } from "./asistencia.repository.js";
import type {
  Asistencia,
  EstadoAsistencia,
  InscriptoConAsistencia,
  MarcarAsistenciaInput,
} from "./asistencia.types.js";
import type { IInfoAsistencia } from "./interface/i-info-asistencia.js";

function estadoDe(asistencia: Asistencia | undefined): EstadoAsistencia {
  if (!asistencia) return "sin_marcar";
  return asistencia.asistio ? "presente" : "ausente";
}

// Componente Asistencia de la vista arquitectónica (US-20). La lista sale de los inscriptos vigentes
// del horario el día de la clase (IInfoInscripciones): un dado de baja o alguien de otro horario no
// aparece ni se puede marcar.
export class AsistenciaService implements IInfoAsistencia {
  constructor(
    private readonly repositorio: AsistenciaRepository,
    private readonly clases: IInfoClases,
    private readonly inscripciones: IInfoInscripciones,
    private readonly unidadDeTrabajo: IUnidadDeTrabajo,
  ) {}

  async listarDeClase(clase: ClaseConDatos): Promise<InscriptoConAsistencia[]> {
    const [inscriptos, marcadas] = await Promise.all([
      this.inscripciones.listarParaAsistencia(clase.id_horario, clase.fecha_clase),
      this.repositorio.listarDeClase(clase.id_clase),
    ]);
    const porAlumno = new Map(marcadas.map((asistencia) => [asistencia.id_alumno, asistencia]));
    return inscriptos.map(({ id_alumno, id_inscripcion, alumno }) => {
      const asistencia = porAlumno.get(id_alumno);
      return {
        id_alumno,
        id_inscripcion,
        nombre: alumno.usuario.nombre,
        apellido: alumno.usuario.apellido,
        asistencia: estadoDe(asistencia),
        observaciones: asistencia?.observaciones ?? null,
      };
    });
  }

  // Se guarda en el momento y la última marca vale. Quién y cuándo quedan en la fila.
  async marcar(
    idClase: number,
    idAlumno: number,
    input: MarcarAsistenciaInput,
    solicitante: Solicitante,
  ): Promise<void> {
    const clase = await this.clases.obtenerPara(idClase, solicitante);
    await this.unidadDeTrabajo.ejecutar(async () => {
      await this.clases.bloquearParaMarcar(idClase, solicitante);
      const inscripto = await this.inscripciones.buscarParaAsistencia(
        clase.id_horario,
        idAlumno,
        clase.fecha_clase,
      );
      if (!inscripto) throw new NotFoundError("El alumno no está inscripto en este horario");
      await this.repositorio.marcar(inscripto, input.asistio, this.marcaDe(idClase, solicitante));
    });
  }

  async marcarTodosPresentes(idClase: number, solicitante: Solicitante): Promise<void> {
    const clase = await this.clases.obtenerPara(idClase, solicitante);
    await this.unidadDeTrabajo.ejecutar(async () => {
      await this.clases.bloquearParaMarcar(idClase, solicitante);
      const inscriptos = await this.inscripciones.listarParaAsistencia(clase.id_horario, clase.fecha_clase);
      await this.repositorio.marcarPresentes(inscriptos, this.marcaDe(idClase, solicitante));
    });
  }

  tieneMarcasManuales(idClase: number): Promise<boolean> {
    return this.repositorio.tieneMarcasManuales(idClase);
  }

  async completarAusentes(clase: ClaseConDatos, fechaRegistro: Date): Promise<number> {
    const inscriptos = await this.inscripciones.listarParaAsistencia(clase.id_horario, clase.fecha_clase);
    return this.repositorio.completarAusentes(clase.id_clase, inscriptos, fechaRegistro);
  }

  private marcaDe(idClase: number, solicitante: Solicitante) {
    return { idClase, idUsuario: solicitante.idUsuario, fechaRegistro: new Date() };
  }
}
