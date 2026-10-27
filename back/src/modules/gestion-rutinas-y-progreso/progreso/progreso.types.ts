export interface MedidaDeRegistro {
  codigo: string;
  unidad: string;
  valor: number;
}

// Un registro de evolución física con sus medidas. El valor es NUMERIC(6,2) y se entrega como number.
export interface RegistroDeProgreso {
  id_registro: number;
  id_alumno: number;
  id_profesora: number;
  fecha: Date;
  observaciones: string | null;
  medidas: MedidaDeRegistro[];
}

export interface NuevoRegistroDeProgreso {
  id_alumno: number;
  id_profesora: number;
  fecha: Date;
  observaciones: string | null;
  medidas: MedidaDeRegistro[];
}
