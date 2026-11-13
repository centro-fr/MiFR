import { NotFoundError } from "../../../shared/errors/app-error.js";
import type { HabilitacionDeInscripcion } from "../../gestion-cuotas-y-pagos/cuota/cuota.types.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type {
  EstadoSeguimientoInactividad,
  MarcaDeSeguimiento,
  RachaDeInasistencia,
  SeguimientoInactividad,
} from "../../gestion-inscripciones-y-clases/asistencia/asistencia.types.js";
import type { IInfoAsistencia } from "../../gestion-inscripciones-y-clases/asistencia/interface/i-info-asistencia.js";
import type { InscripcionParaInactividad } from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { Alumno } from "../../gestion-personas/alumno/alumno.types.js";
import type { IInfoAlumnos } from "../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { IInfoParametros } from "../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type {
  AlumnoInactivo,
  FiltroAlumnosInactivos,
  PaginaAlumnosInactivos,
} from "./detector-inactividad.types.js";

interface Candidata {
  inscripcion: InscripcionParaInactividad;
  racha: RachaDeInasistencia;
  estadoCuota: AlumnoInactivo["estado_cuota"];
  marca: MarcaDeSeguimiento | undefined;
}

// Componente DetectorInactividad de Reportes (capa no persistente, US-22). No guarda nada: en cada
// consulta junta las inscripciones activas, sus rachas de inasistencia y su cuota. Solo pide cuotas y
// alumnos de las que ya superan el umbral, que son pocas. La marca de gestión la guarda Asistencia.
export class DetectorInactividadService {
  constructor(
    private readonly inscripciones: IInfoInscripciones,
    private readonly asistencias: IInfoAsistencia,
    private readonly cuotas: IInfoCuotas,
    private readonly alumnos: IInfoAlumnos,
    private readonly parametros: IInfoParametros,
  ) {}

  async listar(filtro: FiltroAlumnosInactivos): Promise<PaginaAlumnosInactivos> {
    const umbral = await this.parametros.obtener("INASISTENCIAS_CONSECUTIVAS_INACTIVO");
    const minimo = Math.max(umbral, filtro.minimo_inasistencias ?? 0);
    const candidatas = await this.candidatas(filtro, minimo);
    const visibles = candidatas.filter(({ marca }) =>
      coincideLaGestion(marca, filtro.estado_gestion, filtro.incluir_ignorados),
    );
    const pagina = visibles.slice(filtro.offset, filtro.offset + filtro.limit);
    const alumnos = await this.alumnosPorId(pagina);

    return {
      datos: pagina.map((candidata) => aAlumnoInactivo(candidata, alumnos)),
      total: visibles.length,
      umbral,
      limit: filtro.limit,
      offset: filtro.offset,
    };
  }

  // Solo se marca una inscripción que puede aparecer en el listado: activa, de plan mensual y de un
  // alumno no dado de baja. Otra responde 404, igual que una que no existe.
  async registrarSeguimiento(
    idInscripcion: number,
    estado: EstadoSeguimientoInactividad,
    idUsuario: number,
  ): Promise<SeguimientoInactividad> {
    const [inscripcion] = await this.inscripciones.listarParaInactividad({ id_inscripcion: idInscripcion });
    if (!inscripcion) throw new NotFoundError("Inscripción no encontrada");
    return this.asistencias.registrarSeguimiento(idInscripcion, estado, idUsuario);
  }

  async quitarSeguimiento(idInscripcion: number): Promise<void> {
    if (!(await this.asistencias.quitarSeguimiento(idInscripcion))) {
      throw new NotFoundError("La inscripción no tiene una marca de seguimiento");
    }
  }

  // Las de más inasistencias primero; a igual racha, la que no viene hace más tiempo.
  private async candidatas(filtro: FiltroAlumnosInactivos, minimo: number): Promise<Candidata[]> {
    const inscripciones = await this.inscripciones.listarParaInactividad({
      id_profesora: filtro.id_profesora,
      id_plan: filtro.id_plan,
    });
    const rachas = await this.asistencias.rachasDeInasistencia(inscripciones.map(idDe));
    const conRacha = inscripciones.flatMap((inscripcion) => {
      const racha = rachas.get(inscripcion.id_inscripcion);
      return racha && racha.inasistencias_consecutivas >= minimo ? [{ inscripcion, racha }] : [];
    });

    const ids = conRacha.map(({ inscripcion }) => inscripcion.id_inscripcion);
    const [habilitaciones, marcas] = await Promise.all([
      this.cuotas.habilitacionDeInscripciones(ids),
      this.asistencias.seguimientosVigentes(ids),
    ]);
    return conRacha
      .flatMap(({ inscripcion, racha }) => {
        const estadoCuota = estadoAlDia(habilitaciones.get(inscripcion.id_inscripcion));
        if (estadoCuota === null) return [];
        return [{ inscripcion, racha, estadoCuota, marca: marcas.get(inscripcion.id_inscripcion) }];
      })
      .sort(
        (a, b) =>
          b.racha.inasistencias_consecutivas - a.racha.inasistencias_consecutivas ||
          tiempo(a.racha.fecha_ultima_asistencia) - tiempo(b.racha.fecha_ultima_asistencia) ||
          a.inscripcion.id_inscripcion - b.inscripcion.id_inscripcion,
      );
  }

  private async alumnosPorId(pagina: Candidata[]): Promise<Map<number, Alumno>> {
    if (pagina.length === 0) return new Map();
    const ids = [...new Set(pagina.map(({ inscripcion }) => inscripcion.id_alumno))];
    const alumnos = await this.alumnos.buscarPorIds(ids);
    return new Map(alumnos.map((alumno) => [alumno.id_alumno, alumno]));
  }
}

function idDe({ id_inscripcion }: InscripcionParaInactividad): number {
  return id_inscripcion;
}

// En los días de gracia todavía puede asistir, así que sigue al día para la retención (decisión de
// SPRINT-4.md). VENCIDA y PENDIENTE_DE_PAGO son cobranza, no retención.
function estadoAlDia(
  habilitacion: HabilitacionDeInscripcion | undefined,
): AlumnoInactivo["estado_cuota"] | null {
  const estado = habilitacion?.estado;
  return estado === "AL_DIA" || estado === "POR_VENCER" ? estado : null;
}

// Quien nunca asistió va antes que cualquiera que asistió alguna vez.
function tiempo(fecha: Date | null): number {
  return fecha?.getTime() ?? Number.NEGATIVE_INFINITY;
}

function coincideLaGestion(
  marca: MarcaDeSeguimiento | undefined,
  estado: FiltroAlumnosInactivos["estado_gestion"],
  incluirIgnorados?: boolean,
): boolean {
  const actual = marca?.estado ?? "PENDIENTE";
  if (estado !== undefined) return actual === estado;
  return incluirIgnorados ? true : actual !== "IGNORADO";
}

function aAlumnoInactivo(
  { inscripcion, racha, estadoCuota, marca }: Candidata,
  alumnos: Map<number, Alumno>,
): AlumnoInactivo {
  // El alumno de una inscripción activa existe siempre: la FK lo garantiza.
  const { id_alumno, usuario, responsable } = alumnos.get(inscripcion.id_alumno) as Alumno;
  return {
    id_inscripcion: inscripcion.id_inscripcion,
    alumno: { id_alumno, ...contacto(usuario) },
    tutor: responsable ? contacto(responsable) : null,
    profesora: inscripcion.profesora,
    plan: inscripcion.plan,
    estado_cuota: estadoCuota,
    inasistencias_consecutivas: racha.inasistencias_consecutivas,
    fecha_ultima_asistencia: racha.fecha_ultima_asistencia,
    gestion: { estado: marca?.estado ?? "PENDIENTE", fecha_registro: marca?.fecha_registro ?? null },
  };
}

function contacto({ nombre, apellido, telefono, email }: Alumno["usuario"]) {
  return { nombre, apellido, telefono, email };
}
