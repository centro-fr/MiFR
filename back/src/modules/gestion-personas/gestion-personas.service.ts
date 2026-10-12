import { ConflictError, ForbiddenError } from "../../shared/errors/app-error.js";
import type { Solicitante } from "../../shared/utils/solicitante.types.js";
import type { HabilitacionDeInscripcion } from "../gestion-cuotas-y-pagos/cuota/cuota.types.js";
import type { IInfoCuotas } from "../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoInscripciones } from "../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { InscripcionConDatos } from "../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type { IInfoHorarios } from "../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { AlumnoService } from "./alumno/alumno.service.js";
import type { ActualizarAlumnoInput, CrearAlumnoInput, ListarAlumnoQuery } from "./alumno/alumno.schemas.js";
import type { Alumno, PaginaAlumnos } from "./alumno/alumno.types.js";
import type {
  AlumnoDadoDeAlta,
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

function conSituacion(
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
    if (!solicitante.esPropietaria && input.tutor && "id_usuario" in input.tutor) {
      throw new ForbiddenError(
        "Una profesora carga los datos del tutor; elegir una cuenta existente es de la propietaria",
      );
    }
    const alumno = await this.alumnos.crear(input);
    if (solicitante.esPropietaria || !alumno.responsable) return alumno;

    const { id_usuario, nombre, apellido } = alumno.responsable;
    return { ...alumno, responsable: { id_usuario, nombre, apellido } };
  }

  async listarAlumnos(consulta: ListarAlumnoQuery, solicitante: Solicitante): Promise<PaginaListadoAlumnos> {
    const { id_plan, id_profesora, id_actividad, ...filtro } = consulta;
    const aCargoDe = await this.profesoraACargo(solicitante);
    if (
      aCargoDe === null ||
      (aCargoDe !== undefined && id_profesora !== undefined && id_profesora !== aCargoDe)
    ) {
      return paginaVacia(filtro);
    }

    const profesora = aCargoDe ?? id_profesora;
    const filtraPorInscripcion =
      id_plan !== undefined || profesora !== undefined || id_actividad !== undefined;
    const ids = filtraPorInscripcion
      ? await this.inscripciones.obtenerIdsDeAlumnos({ id_plan, id_profesora: profesora, id_actividad })
      : undefined;
    if (ids?.length === 0) return paginaVacia(filtro);

    const pagina = await this.alumnos.listar({ ...filtro, ids });
    const resumenes = await this.inscripciones.resumirInscripcionesVigentes(
      pagina.datos.map(({ id_alumno }) => id_alumno),
    );
    const resumenPorAlumno = new Map(resumenes.map((resumen) => [resumen.id_alumno, resumen]));
    const habilitaciones = await this.cuotas.habilitacionDeInscripciones(
      resumenes.map(({ id_inscripcion }) => id_inscripcion),
    );
    return {
      ...pagina,
      datos: pagina.datos.map((alumno) => {
        const inscripcion = resumenPorAlumno.get(alumno.id_alumno) ?? null;
        return {
          ...alumno,
          inscripcion,
          situacion_cuota: inscripcion
            ? aSituacionCuota(habilitaciones.get(inscripcion.id_inscripcion))
            : null,
        };
      }),
    };
  }

  async obtenerAlumnoPorId(id: number, solicitante: Solicitante): Promise<FichaAlumno> {
    const alumno = await this.alumnos.obtenerPorId(id);
    const inscripciones = await this.inscripciones.listarVigentesDeAlumno(id);
    await this.verificarQueLoTieneACargo(inscripciones, solicitante);
    const deLaBaja = alumno.estado === "BAJA" ? await this.inscripciones.listarDeLaUltimaBaja(id) : [];
    const habilitaciones = await this.cuotas.habilitacionDeInscripciones(
      [...inscripciones, ...deLaBaja].map(({ id_inscripcion }) => id_inscripcion),
    );
    return {
      ...alumno,
      inscripciones: conSituacion(inscripciones, habilitaciones),
      inscripciones_de_la_baja: conSituacion(deLaBaja, habilitaciones),
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

function paginaVacia({ limit, offset }: Pick<PaginaAlumnos, "limit" | "offset">): PaginaListadoAlumnos {
  return { datos: [], total: 0, limit, offset };
}
