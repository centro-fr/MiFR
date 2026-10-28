export interface MedidaDeRegistro {
  codigo: string;
  unidad: string;
  valor: number;
}

// Un registro de evolución física con sus medidas. El valor es NUMERIC(6,2) y se entrega como number.
// fecha_modificacion e id_usuario_modifica dicen quién lo corrigió por última vez y cuándo (null si nunca).
export interface RegistroDeProgreso {
  id_registro: number;
  id_alumno: number;
  id_profesora: number;
  fecha: Date;
  observaciones: string | null;
  fecha_modificacion: Date | null;
  id_usuario_modifica: number | null;
  medidas: MedidaDeRegistro[];
}

export interface NuevoRegistroDeProgreso {
  id_alumno: number;
  id_profesora: number;
  fecha: Date;
  observaciones: string | null;
  medidas: MedidaDeRegistro[];
}

// Lo que se corrige de un registro: lo que no viene queda como estaba. Si vienen medidas, reemplazan a todas
// las anteriores; observaciones en null la borra.
export interface CambiosDeProgreso {
  fecha?: Date | undefined;
  observaciones?: string | null | undefined;
  medidas?: MedidaDeRegistro[] | undefined;
}
