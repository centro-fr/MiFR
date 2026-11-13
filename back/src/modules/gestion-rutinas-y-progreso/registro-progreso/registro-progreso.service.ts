import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { IInfoProgreso } from "./interface/i-info-progreso.js";
import type { RegistroProgresoRepository } from "./registro-progreso.repository.js";
import type { MedicionInicial } from "./registro-progreso.types.js";

// Componente "RegistroProgreso" de la vista arquitectónica (GestionRutinasYProgreso). Por ahora solo
// guarda la medición inicial de la pre-inscripción; la evolución física completa es de US-27.
export class RegistroProgresoService implements IInfoProgreso {
  constructor(private readonly repositorio: RegistroProgresoRepository) {}

  registrarMedicionInicial({ idAlumno, idProfesora, pesoKg, tallaCm }: MedicionInicial): Promise<void> {
    return this.repositorio.registrar({
      idAlumno,
      idProfesora,
      fecha: fechaActualArgentina(),
      medidas: [
        { codigo: "PESO", unidad: "kg", valor: pesoKg },
        { codigo: "TALLA", unidad: "cm", valor: tallaCm },
      ],
    });
  }
}
