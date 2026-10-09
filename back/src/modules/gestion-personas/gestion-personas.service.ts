import { ConflictError, ForbiddenError } from "../../shared/errors/app-error.js";
import type { Solicitante } from "../../shared/utils/solicitante.js";
import type { IInfoInscripciones } from "../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { InscripcionConDatos } from "../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type { IInfoHorarios } from "../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { AlumnoService } from "./alumno/alumno.service.js";
import type { ActualizarAlumnoInput, CrearAlumnoInput, ListarAlumnoQuery } from "./alumno/alumno.schemas.js";
import type { Alumno, PaginaAlumnos } from "./alumno/alumno.types.js";
import type { FichaAlumno, ILogicaPersonas, PaginaListadoAlumnos } from "./interface/i-logica-personas.js";
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

// Los alumnos a cargo de una profesora, los filtros por plan, profesora y actividad, y el plan de
// cada alumno salen de las inscripciones, que son de otro subsistema (IInfoInscripciones). Por
// eso las reglas de US-09 y US-10 que los cruzan con Alumno viven acá y no en el componente.
export class GestionPersonasService implements ILogicaPersonas {
  constructor(
    private readonly profesoras: ProfesorService,
    private readonly horarios: IInfoHorarios,
    private readonly alumnos: AlumnoService,
    private readonly inscripciones: IInfoInscripciones,
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

  crearAlumno(input: CrearAlumnoInput): Promise<Alumno> {
    return this.alumnos.crear(input);
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
    return {
      ...pagina,
      datos: pagina.datos.map((alumno) => ({
        ...alumno,
        inscripcion: resumenPorAlumno.get(alumno.id_alumno) ?? null,
      })),
    };
  }

  async obtenerAlumnoPorId(id: number, solicitante: Solicitante): Promise<FichaAlumno> {
    const alumno = await this.alumnos.obtenerPorId(id);
    const inscripciones = await this.inscripciones.listarVigentesDeAlumno(id);
    await this.verificarQueLoTieneACargo(inscripciones, solicitante);
    return { ...alumno, inscripciones };
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
