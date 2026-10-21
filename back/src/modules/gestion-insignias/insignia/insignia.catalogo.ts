import type { TipoInsignia } from "./insignia.types.js";

export interface DefinicionInsignia {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: TipoInsignia;
  // RACHA y TOTAL_CLASES: clases. MES_PERFECTO: porcentaje de asistencia del mes. PODIO_MES: puestos
  // del ranking del mes que la reciben.
  valor_umbral: number;
}

// Catálogo inicial acordado en SPRINT-5.md. El ícono y el color los resuelve el front según el tipo,
// por eso no están en la base. Largos del DER: codigo VARCHAR(30), nombre VARCHAR(60).
export const CATALOGO_INSIGNIAS: readonly DefinicionInsignia[] = [
  {
    codigo: "RACHA_10",
    nombre: "Racha de 10 clases",
    descripcion: "Asistir a 10 clases seguidas sin faltar",
    tipo: "RACHA",
    valor_umbral: 10,
  },
  {
    codigo: "RACHA_25",
    nombre: "Racha de 25 clases",
    descripcion: "Asistir a 25 clases seguidas sin faltar",
    tipo: "RACHA",
    valor_umbral: 25,
  },
  {
    codigo: "TOTAL_50",
    nombre: "50 clases",
    descripcion: "Llegar a 50 clases asistidas",
    tipo: "TOTAL_CLASES",
    valor_umbral: 50,
  },
  {
    codigo: "TOTAL_100",
    nombre: "100 clases",
    descripcion: "Llegar a 100 clases asistidas",
    tipo: "TOTAL_CLASES",
    valor_umbral: 100,
  },
  {
    codigo: "MES_PERFECTO",
    nombre: "Mes perfecto",
    descripcion: "Asistir a todas las clases dictadas del mes",
    tipo: "MES_PERFECTO",
    valor_umbral: 100,
  },
  {
    codigo: "PODIO_MES",
    nombre: "Podio del mes",
    descripcion: "Terminar el mes entre los tres primeros del ranking de asistencia",
    tipo: "PODIO_MES",
    valor_umbral: 3,
  },
];
