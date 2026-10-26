import type { rutinas } from "@prisma/client";
import type { ContenidoRutina } from "./rutina.schemas.js";

// La rutina del DER con el contenido ya tipado: en la base es JSONB (días, ejercicios, series y
// repeticiones). Las fechas son DATE a las 00:00 UTC.
export type Rutina = Omit<rutinas, "contenido"> & { contenido: ContenidoRutina };

export interface NuevaRutina {
  id_alumno: number;
  id_profesora: number;
  nombre: string;
  fecha_desde: Date;
  fecha_hasta: Date | null;
  contenido: ContenidoRutina;
  observaciones: string | null;
}