import { ForbiddenError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import {
  AccesoAAlumno,
  ocultarObservaciones,
  type AlumnoLookup,
  type AlumnosACargo,
  type ProfesoraLookup,
} from "../acceso-a-alumno.js";
import { MEDIDAS } from "./medida.catalogo.js";
import type { ActualizarProgresoInput, RegistrarProgresoInput } from "./progreso.schemas.js";
import type { ProgresoRepository } from "./progreso.repository.js";
import type { MedidaDeRegistro, RegistroDeProgreso } from "./progreso.types.js";

// El código ya lo validó el schema; la unidad la fija el catálogo, no quien carga.
function conUnidad(medidas: { codigo: keyof typeof MEDIDAS; valor: number }[]): MedidaDeRegistro[] {
  return medidas.map(({ codigo, valor }) => ({ codigo, unidad: MEDIDAS[codigo].unidad, valor }));
}

// Componente Progreso de GestionRutinasYProgreso: la evolución física del alumno (US-27 y US-28). Lo carga,
// corrige y da de baja la propietaria o la profesora que lo tiene a cargo; el alumno y el tutor de un menor
// solo lo leen.
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
    const idProfesora = await this.acceso.autorizarEscritura(input.id_alumno, input.id_profesora, solicitante);

    const fecha = input.fecha ?? fechaActualArgentina();
    this.validarQueNoSeaFutura(fecha);

    return this.repositorio.crear({
      id_alumno: input.id_alumno,
      id_profesora: idProfesora,
      fecha,
      observaciones: input.observaciones,
      medidas: conUnidad(input.medidas),
    });
  }

  // Lista vacía si todavía no hay mediciones (estado vacío del portal). El alumno y el tutor no ven las
  // observaciones (US-28).
  async listarDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<RegistroDeProgreso[]> {
    const alcance = await this.acceso.verificarLectura(idAlumno, solicitante);
    const registros = await this.repositorio.listarDeAlumno(idAlumno);
    return alcance === "GESTION" ? registros : registros.map(ocultarObservaciones);
  }

  // Corrige un registro de un alumno a cargo, aunque lo haya cargado otra profesora (un error de carga, por
  // ejemplo 6,24 kg en vez de 62,4).
  async actualizar(
    idRegistro: number,
    input: ActualizarProgresoInput,
    solicitante: Solicitante,
  ): Promise<RegistroDeProgreso> {
    await this.buscarGestionable(idRegistro, solicitante);
    if (input.fecha !== undefined) this.validarQueNoSeaFutura(input.fecha);

    return this.repositorio.actualizar(
      idRegistro,
      {
        fecha: input.fecha,
        observaciones: input.observaciones,
        medidas: input.medidas && conUnidad(input.medidas),
      },
      solicitante.idUsuario,
    );
  }

  // Baja lógica: deja de mostrarse, pero queda quién y cuándo (US-27: no se elimina sin trazabilidad).
  async eliminar(idRegistro: number, solicitante: Solicitante): Promise<void> {
    await this.buscarGestionable(idRegistro, solicitante);
    await this.repositorio.darDeBaja(idRegistro, solicitante.idUsuario);
  }

  async listarPropio(solicitante: Solicitante): Promise<RegistroDeProgreso[]> {
    const idAlumno = await this.acceso.resolverAlumnoPropio(solicitante);
    return this.listarDeAlumno(idAlumno, solicitante);
  }

  // Un registro que no existe o ya está dado de baja se responde igual que uno ajeno, salvo a la propietaria.
  private async buscarGestionable(idRegistro: number, solicitante: Solicitante): Promise<RegistroDeProgreso> {
    const registro = await this.repositorio.buscarPorId(idRegistro);
    if (!registro) {
      if (solicitante.esPropietaria) throw new NotFoundError("Registro de progreso no encontrado");
      throw new ForbiddenError("Solo podés modificar datos de los alumnos que tenés a cargo");
    }
    await this.acceso.verificarGestion(registro.id_alumno, solicitante);
    return registro;
  }

  private validarQueNoSeaFutura(fecha: Date): void {
    if (fecha > fechaActualArgentina()) throw new ValidationError("La fecha de la medición no puede ser futura");
  }
}
