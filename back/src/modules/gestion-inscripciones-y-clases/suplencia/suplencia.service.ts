import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import type { IUnidadDeTrabajo } from "../../../shared/db/transaccion.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { IInfoProfesores } from "../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { IInfoClases } from "../clase/interface/i-info-clases.js";
import type { CambiarSuplenciaInput, RegistrarSuplenciaInput } from "./suplencia.schemas.js";
import type { SuplenciaRepository } from "./suplencia.repository.js";
import type { FiltroSuplencias, SuplenciaConDatos, SuplenciaRegistrada } from "./suplencia.types.js";

// Componente Suplencia de la vista arquitectónica (US-24). El DER guarda a la suplente como la
// dictante de la clase y a la titular como la ausente de la suplencia: así la suplente toma
// asistencia sin cambios en US-20 y la liquidación (US-23) sabe a quién sumar y a quién descontar.
// Cada cambio bloquea la clase, porque una clase tiene una sola suplencia y la PK no lo impide.
export class SuplenciaService {
  constructor(
    private readonly repositorio: SuplenciaRepository,
    private readonly clases: IInfoClases,
    private readonly profesoras: IInfoProfesores,
    private readonly unidadDeTrabajo: IUnidadDeTrabajo,
  ) {}

  listar(filtro: FiltroSuplencias): Promise<SuplenciaConDatos[]> {
    return this.repositorio.listar(filtro);
  }

  async registrar(input: RegistrarSuplenciaInput, idUsuario: number): Promise<SuplenciaRegistrada> {
    await this.validarSuplente(input.id_profesora_suplente);
    const { id_clase } = await this.clases.materializar(input.id_horario, input.fecha_clase);

    await this.unidadDeTrabajo.ejecutar(async () => {
      const clase = await this.clases.bloquearParaSuplencia(id_clase);
      if (await this.repositorio.buscarPorClase(id_clase)) {
        throw new ConflictError("La clase ya tiene una suplencia: para cambiar la suplente, modificala");
      }
      validarDistintas(clase.id_prof_dictante, input.id_profesora_suplente);
      await this.repositorio.crear({
        id_clase,
        id_prof_ausente: clase.id_prof_dictante,
        motivo: input.motivo ?? null,
        id_usuario_registra: idUsuario,
      });
      await this.clases.cambiarDictante(id_clase, input.id_profesora_suplente);
    });

    const advertencia =
      input.fecha_clase > fechaActualArgentina()
        ? "La clase todavía no se dictó: si la titular finalmente viene, eliminá la suplencia"
        : null;
    return { suplencia: await this.obtener(id_clase), advertencia };
  }

  // La última suplente registrada es la que vale (US-24).
  async cambiar(
    idClase: number,
    input: CambiarSuplenciaInput,
    idUsuario: number,
  ): Promise<SuplenciaConDatos> {
    const { id_profesora_suplente: suplente } = input;
    if (suplente !== undefined) await this.validarSuplente(suplente);

    await this.unidadDeTrabajo.ejecutar(async () => {
      const actual = await this.bloquearSuplencia(idClase);
      if (suplente !== undefined) {
        validarDistintas(actual.id_prof_ausente, suplente);
        await this.clases.cambiarDictante(idClase, suplente);
      }
      await this.repositorio.actualizar(idClase, actual.id_prof_ausente, {
        ...(input.motivo === undefined ? {} : { motivo: input.motivo }),
        id_usuario_registra: idUsuario,
        fecha_registro: new Date(),
      });
    });
    return this.obtener(idClase);
  }

  // La clase vuelve a la titular; quién la borró queda en la auditoría (decisión de SPRINT-4.md).
  eliminar(idClase: number): Promise<SuplenciaConDatos> {
    return this.unidadDeTrabajo.ejecutar(async () => {
      const actual = await this.bloquearSuplencia(idClase);
      await this.clases.cambiarDictante(idClase, actual.id_prof_ausente);
      await this.repositorio.eliminar(idClase, actual.id_prof_ausente);
      return actual;
    });
  }

  private async bloquearSuplencia(idClase: number): Promise<SuplenciaConDatos> {
    await this.clases.bloquearParaSuplencia(idClase);
    const suplencia = await this.repositorio.buscarPorClase(idClase);
    if (!suplencia) throw new NotFoundError("Suplencia no encontrada");
    return suplencia;
  }

  // La suplente tiene que estar en actividad; la titular no, porque una suplencia se puede cargar
  // después de que la titular se fue (US-24).
  private async validarSuplente(idProfesora: number): Promise<void> {
    if (!(await this.profesoras.buscarPorId(idProfesora))) {
      throw new ConflictError("La suplente tiene que ser una profesora activa");
    }
  }

  private async obtener(idClase: number): Promise<SuplenciaConDatos> {
    const suplencia = await this.repositorio.buscarPorClase(idClase);
    if (!suplencia)
      throw new Error(`La suplencia de la clase ${idClase} no se encontró después de guardarla`);
    return suplencia;
  }
}

function validarDistintas(idTitular: number, idSuplente: number): void {
  if (idTitular === idSuplente) {
    throw new ValidationError("La suplente tiene que ser otra profesora que la titular de la clase");
  }
}
