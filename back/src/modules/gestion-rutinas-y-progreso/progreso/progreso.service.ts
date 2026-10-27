import { ValidationError } from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import {
  AccesoAAlumno,
  type AlumnoLookup,
  type AlumnosACargo,
  type ProfesoraLookup,
} from "../acceso-a-alumno.js";
import { MEDIDAS } from "./medida.catalogo.js";
import type { RegistrarProgresoInput } from "./progreso.schemas.js";
import type { ProgresoRepository } from "./progreso.repository.js";
import type { RegistroDeProgreso } from "./progreso.types.js";

// Componente Progreso de GestionRutinasYProgreso: la evolución física del alumno (US-27 y US-28). Lo carga
// la propietaria o la profesora que lo tiene a cargo; el alumno y el tutor de un menor solo lo leen.
export class ProgresoService {
  private readonly acceso: AccesoAAlumno;

  constructor(
    private readonly repositorio: ProgresoRepository,
    aCargo: AlumnosACargo,
    alumnos: AlumnoLookup,
    profesoras: ProfesoraLookup,
  ) {
    this.acceso = new AccesoAAlumno(aCargo, alumnos, profesoras);
  }

  async registrar(input: RegistrarProgresoInput, solicitante: Solicitante): Promise<RegistroDeProgreso> {
    const idProfesora = await this.acceso.autorizarEscritura(
      input.id_alumno,
      input.id_profesora,
      solicitante,
    );

    const hoy = fechaActualArgentina();
    const fecha = input.fecha ?? hoy;
    if (fecha > hoy) throw new ValidationError("La fecha de la medición no puede ser futura");

    return this.repositorio.crear({
      id_alumno: input.id_alumno,
      id_profesora: idProfesora,
      fecha,
      observaciones: input.observaciones,
      medidas: input.medidas.map(({ codigo, valor }) => ({ codigo, unidad: MEDIDAS[codigo].unidad, valor })),
    });
  }

  // Lista vacía si todavía no hay mediciones (estado vacío del portal).
  async listarDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<RegistroDeProgreso[]> {
    await this.acceso.verificarLectura(idAlumno, solicitante);
    return this.repositorio.listarDeAlumno(idAlumno);
  }
}
