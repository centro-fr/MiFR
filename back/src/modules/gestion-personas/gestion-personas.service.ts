import { ConflictError, ForbiddenError, ValidationError } from "../../shared/errors/app-error.js";
import type { Solicitante } from "../../shared/utils/solicitante.types.js";
import type { EstadoHabilitacion } from "../calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.types.js";
import type { HabilitacionDeInscripcion } from "../gestion-cuotas-y-pagos/cuota/cuota.types.js";
import type { IInfoCuotas } from "../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoInscripciones } from "../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { InscripcionConDatos } from "../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type { IInfoHorarios } from "../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { AlumnoService } from "./alumno/alumno.service.js";
import type { ActualizarAlumnoInput, CrearAlumnoInput, ListarAlumnoQuery } from "./alumno/alumno.schemas.js";
import type { Alumno, FiltroAlumno, PaginaAlumnos } from "./alumno/alumno.types.js";
import type {
  AlumnoDadoDeAlta,
  AlumnoEnListado,
  FichaAlumno,
  ILogicaPersonas,
  InscripcionConSituacion,
  PaginaListadoAlumnos,
  SituacionCuota,
} from "./interface/i-logica-personas.js";
import type { ProfesorService } from "./profesor/profesor.service.js";
import type { CrearProfesoraInput } from "./profesor/profesor.schemas.js";
import type { Profesora } from "./profesor/profesor.types.js";

// US-09: la profesora modifica contacto y observaciones; el resto es de la propietaria.
const CAMPOS_QUE_EDITA_LA_PROFESORA = new Set([
  "telefono",
  "direccion",
  "cont_emerg_nombre",
  "cont_emerg_telefono",
  "observaciones",
]);

// El estado de cuota se calcula en cada consulta y no se guarda, así que la base no puede filtrarlo
// ni paginarlo: se calcula para todos los alumnos que cumplen los otros filtros y se pagina en
// memoria. El tope evita que un listado sin acotar lea la tabla entera.
export const TOPE_FILTRO_ESTADO_CUOTA = 500;

type SituacionDelAlumno = Pick<AlumnoEnListado, "inscripcion" | "situacion_cuota">;
const SIN_INSCRIPCION_VIGENTE: SituacionDelAlumno = { inscripcion: null, situacion_cuota: null };

function aSituacionCuota(habilitacion: HabilitacionDeInscripcion | undefined): SituacionCuota | null {
  if (!habilitacion) return null;
  return {
    estado: habilitacion.estado,
    fecha_vencimiento: habilitacion.fechaVencimiento,
    dias_restantes: habilitacion.diasRestantes,
    puede_asistir: habilitacion.puedeAsistir,
    tiene_pago_pendiente: habilitacion.tienePagoPendiente,
  };
}

function inscripcionesConSituacion(
  inscripciones: InscripcionConDatos[],
  habilitaciones: Map<number, HabilitacionDeInscripcion>,
): InscripcionConSituacion[] {
  return inscripciones.map((inscripcion) => ({
    ...inscripcion,
    situacion_cuota: aSituacionCuota(habilitaciones.get(inscripcion.id_inscripcion)),
  }));
}

// Los alumnos a cargo de una profesora, los filtros por plan, profesora y actividad, y el plan de
// cada alumno salen de las inscripciones, que son de otro subsistema (IInfoInscripciones), y la
// situación de cuota de Cuota (IInfoCuotas). Por eso las reglas de US-09 y US-10 que los cruzan con
// Alumno viven acá y no en el componente.
export class GestionPersonasService implements ILogicaPersonas {
  constructor(
    private readonly profesoras: ProfesorService,
    private readonly horarios: IInfoHorarios,
    private readonly alumnos: AlumnoService,
    private readonly inscripciones: IInfoInscripciones,
    private readonly cuotas: IInfoCuotas,
  ) {}

  crearProfesora(input: CrearProfesoraInput): Promise<Profesora> {
    return this.profesoras.crear(input);
  }

  listarProfesoras(): Promise<Profesora[]> {
    return this.profesoras.listar();
  }

  async darDeBajaProfesora(id: number): Promise<Profesora> {
    if (await this.horarios.tieneActivosDeProfesora(id)) {
      throw new ConflictError("Debe dar de baja los horarios activos antes que a la profesora");
    }
    return this.profesoras.darDeBaja(id);
  }

  // Una profesora carga al tutor con sus datos: elegir una cuenta existente por su id queda para la
  // propietaria. Y del tutor que resulte solo ve el nombre, porque puede ser una cuenta que ya existía
  // y cuyos datos personales no le corresponde ver.
  async crearAlumno(input: CrearAlumnoInput, solicitante: Solicitante): Promise<AlumnoDadoDeAlta> {
    const alumno = await this.alumnos.crear(input, solicitante);
    if (solicitante.esPropietaria || !alumno.responsable) return alumno;

    const { id_usuario, nombre, apellido } = alumno.responsable;
    return { ...alumno, responsable: { id_usuario, nombre, apellido } };
  }

  async listarAlumnos(consulta: ListarAlumnoQuery, solicitante: Solicitante): Promise<PaginaListadoAlumnos> {
    const { id_plan, id_profesora, id_actividad, estado_cuota, ...filtro } = consulta;
    const ids = await this.alumnosAlAlcance({ id_plan, id_profesora, id_actividad }, solicitante);
    if (ids === null) return paginaVacia(filtro);
    if (estado_cuota) return this.listarPorEstadoDeCuota({ ...filtro, ids }, estado_cuota);

    const pagina = await this.alumnos.listar({ ...filtro, ids });
    const situaciones = await this.situacionPorAlumno(pagina.datos.map(({ id_alumno }) => id_alumno));
    return { ...pagina, datos: alumnosConSituacion(pagina.datos, situaciones) };
  }

  // Quién pide se verifica antes de buscar al alumno: a una profesora, un alumno que no existe le
  // responde 403, igual que uno ajeno, y no le cuenta qué ids existen.
  async obtenerAlumnoPorId(id: number, solicitante: Solicitante): Promise<FichaAlumno> {
    const inscripciones = await this.inscripciones.listarVigentesDeAlumno(id);
    await this.verificarQueLoTieneACargo(inscripciones, solicitante);
    const alumno = await this.alumnos.obtenerPorId(id);
    const deLaBaja = alumno.estado === "BAJA" ? await this.inscripciones.listarDeLaUltimaBaja(id) : [];
    const [habilitaciones, historial] = await Promise.all([
      this.cuotas.habilitacionDeInscripciones(
        [...inscripciones, ...deLaBaja].map(({ id_inscripcion }) => id_inscripcion),
      ),
      solicitante.esPropietaria ? this.cuotas.historialDeAlumno(id) : null,
    ]);
    return {
      ...alumno,
      inscripciones: inscripcionesConSituacion(inscripciones, habilitaciones),
      inscripciones_de_la_baja: inscripcionesConSituacion(deLaBaja, habilitaciones),
      historial_cuotas: historial,
    };
  }

  async actualizarAlumno(
    id: number,
    input: ActualizarAlumnoInput,
    solicitante: Solicitante,
  ): Promise<Alumno> {
    if (!solicitante.esPropietaria) {
      const ajenos = Object.keys(input).filter((campo) => !CAMPOS_QUE_EDITA_LA_PROFESORA.has(campo));
      if (ajenos.length > 0) {
        throw new ForbiddenError(
          `La profesora solo modifica contacto y observaciones (no ${ajenos.join(", ")})`,
        );
      }
      await this.verificarQueLoTieneACargo(await this.inscripciones.listarVigentesDeAlumno(id), solicitante);
    }
    return this.alumnos.actualizar(id, input);
  }

  // Los alumnos que dejan ver los filtros por inscripción y lo que tiene a cargo quien pide (US-10):
  // undefined si no hay que restringir, null si no puede haber ninguno.
  private async alumnosAlAlcance(
    filtro: Pick<ListarAlumnoQuery, "id_plan" | "id_profesora" | "id_actividad">,
    solicitante: Solicitante,
  ): Promise<number[] | null | undefined> {
    const aCargoDe = await this.profesoraACargo(solicitante);
    if (aCargoDe === null) return null;
    if (aCargoDe !== undefined && filtro.id_profesora !== undefined && filtro.id_profesora !== aCargoDe) {
      return null;
    }

    const id_profesora = aCargoDe ?? filtro.id_profesora;
    const { id_plan, id_actividad } = filtro;
    if (id_plan === undefined && id_profesora === undefined && id_actividad === undefined) return undefined;
    const ids = await this.inscripciones.obtenerIdsDeAlumnos({ id_plan, id_profesora, id_actividad });
    return ids.length > 0 ? ids : null;
  }

  private async listarPorEstadoDeCuota(
    filtro: FiltroAlumno,
    estado: EstadoHabilitacion,
  ): Promise<PaginaListadoAlumnos> {
    const candidatos = await this.alumnos.listarIds(filtro, TOPE_FILTRO_ESTADO_CUOTA + 1);
    if (candidatos.length > TOPE_FILTRO_ESTADO_CUOTA) {
      throw new ValidationError(
        `Hay más de ${TOPE_FILTRO_ESTADO_CUOTA} alumnos para filtrar por estado de cuota: acote la búsqueda con otro filtro`,
      );
    }

    const situaciones = await this.situacionPorAlumno(candidatos);
    const coinciden = candidatos.filter((id) => situaciones.get(id)?.situacion_cuota?.estado === estado);
    const idsDeLaPagina = coinciden.slice(filtro.offset, filtro.offset + filtro.limit);
    const alumnos = await this.alumnos.buscarPorIds(idsDeLaPagina);
    const porId = new Map(alumnos.map((alumno) => [alumno.id_alumno, alumno]));
    return {
      datos: alumnosConSituacion(
        idsDeLaPagina.flatMap((id) => porId.get(id) ?? []),
        situaciones,
      ),
      total: coinciden.length,
      limit: filtro.limit,
      offset: filtro.offset,
    };
  }

  // La inscripción vigente más reciente de cada alumno y su situación de cuota, en dos consultas.
  private async situacionPorAlumno(idsAlumnos: number[]): Promise<Map<number, SituacionDelAlumno>> {
    const resumenes = await this.inscripciones.resumirInscripcionesVigentes(idsAlumnos);
    const habilitaciones = await this.cuotas.habilitacionDeInscripciones(
      resumenes.map(({ id_inscripcion }) => id_inscripcion),
    );
    return new Map(
      resumenes.map((resumen) => [
        resumen.id_alumno,
        {
          inscripcion: resumen,
          situacion_cuota: aSituacionCuota(habilitaciones.get(resumen.id_inscripcion)),
        },
      ]),
    );
  }

  // undefined: ve a todos (propietaria). Si no, el id de la profesora de su usuario, o null si no
  // tiene un perfil de profesora activo, y entonces no tiene alumnos a cargo.
  private async profesoraACargo(solicitante: Solicitante): Promise<number | null | undefined> {
    if (solicitante.esPropietaria) return undefined;
    const profesora = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    return profesora?.id_profesora ?? null;
  }

  private async verificarQueLoTieneACargo(
    inscripciones: InscripcionConDatos[],
    solicitante: Solicitante,
  ): Promise<void> {
    const aCargoDe = await this.profesoraACargo(solicitante);
    if (aCargoDe === undefined) return;
    if (!inscripciones.some(({ id_profesora }) => id_profesora === aCargoDe)) {
      throw new ForbiddenError("Solo puede ver y editar a los alumnos que tiene a cargo");
    }
  }
}

function alumnosConSituacion(
  alumnos: Alumno[],
  situaciones: Map<number, SituacionDelAlumno>,
): AlumnoEnListado[] {
  return alumnos.map((alumno) => ({
    ...alumno,
    ...(situaciones.get(alumno.id_alumno) ?? SIN_INSCRIPCION_VIGENTE),
  }));
}

function paginaVacia({ limit, offset }: Pick<PaginaAlumnos, "limit" | "offset">): PaginaListadoAlumnos {
  return { datos: [], total: 0, limit, offset };
}
