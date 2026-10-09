import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import type { IAutorizacion } from "../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IInfoUsuarios } from "../../gestion-usuarios/usuario/interface/i-info-usuarios.js";
import type { CrearProfesoraInput } from "./profesor.schemas.js";
import type { IInfoProfesores } from "./interface/i-info-profesores.js";
import type { ProfesorRepository } from "./profesor.repository.js";
import type { Profesora } from "./profesor.types.js";

export class ProfesorService implements IInfoProfesores {
  constructor(
    private readonly repositorio: ProfesorRepository,
    private readonly usuarios: IInfoUsuarios,
    private readonly autorizacion: IAutorizacion,
  ) {}

  async crear(input: CrearProfesoraInput): Promise<Profesora> {
    const usuario = await this.usuarios.obtenerPorId(input.id_usuario);
    if (usuario.estado !== "ACTIVO") {
      throw new ValidationError("No se puede crear una profesora para un usuario inactivo");
    }
    if (!this.autorizacion.tieneRol(usuario, "PROFESORA")) {
      throw new ValidationError("El usuario debe tener asignado el rol PROFESORA");
    }
    if (await this.repositorio.buscarPorUsuarioId(input.id_usuario)) {
      throw new ConflictError("El usuario ya tiene un perfil de profesora");
    }

    return this.repositorio.crear(input);
  }

  async buscarPorId(id: number): Promise<Profesora | null> {
    return this.siEstaActiva(await this.repositorio.buscarPorId(id));
  }

  async buscarPorUsuario(idUsuario: number): Promise<Profesora | null> {
    return this.siEstaActiva(await this.repositorio.buscarPorUsuarioId(idUsuario));
  }

  private async siEstaActiva(profesora: Profesora | null): Promise<Profesora | null> {
    if (!profesora || profesora.fecha_baja !== null) return null;

    const usuario = await this.usuarios.obtenerPorId(profesora.id_usuario);
    return usuario.estado === "ACTIVO" && this.autorizacion.tieneRol(usuario, "PROFESORA") ? profesora : null;
  }

  listar(): Promise<Profesora[]> {
    return this.repositorio.listar();
  }

  async darDeBaja(id: number): Promise<Profesora> {
    const profesora = await this.repositorio.buscarPorId(id);
    if (!profesora) throw new NotFoundError("Profesora no encontrada");
    if (profesora.fecha_baja !== null) throw new ConflictError("La profesora ya está dada de baja");
    return this.repositorio.darDeBaja(id);
  }
}
