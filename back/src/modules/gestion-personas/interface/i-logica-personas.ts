import type { CrearProfesoraInput } from "../profesor/profesor.schemas.js";
import type { Profesora } from "../profesor/profesor.types.js";

// Interfaz del subsistema GestionPersonas para las operaciones expuestas a la API.
export interface ILogicaPersonas {
  crearProfesora(input: CrearProfesoraInput): Promise<Profesora>;
  listarProfesoras(): Promise<Profesora[]>;
  darDeBajaProfesora(id: number): Promise<Profesora>;
}
