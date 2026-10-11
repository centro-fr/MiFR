// La medición que se carga al pre-inscribir en una actividad que pide peso y talla (US-05). La
// atribuye a la profesora a cargo de la inscripción, porque registros_progreso exige una profesora.
export interface MedicionInicial {
  idAlumno: number;
  idProfesora: number;
  pesoKg: number;
  tallaCm: number;
}

// Una medida de un registro, con el código y la unidad de su tipo (tipos_medida).
export interface MedidaARegistrar {
  codigo: string;
  unidad: string;
  valor: number;
}

export interface RegistroARegistrar {
  idAlumno: number;
  idProfesora: number;
  fecha: Date;
  medidas: MedidaARegistrar[];
}
