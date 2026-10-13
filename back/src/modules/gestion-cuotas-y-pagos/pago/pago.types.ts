import type { estado_pago, forma_pago, pagos } from "@prisma/client";
import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";

export type FormaPago = forma_pago;
export type EstadoPago = estado_pago;

// El monto es NUMERIC(10,2) y Prisma lo entrega como Decimal; el dominio usa number, como el
// precio de los planes.
export type Pago = Omit<pagos, "monto"> & { monto: number };

// Lo que se guarda de un pago, ya decidido por el service.
export type DatosDePago = Omit<Pago, "id_pago" | "id_cuota" | "fecha_rendicion" | "motivo_rechazo">;

// La cuota que acompaña al pago: se crea, o se actualiza si es la última que quedó sin pagar.
export interface CuotaAGuardar {
  idInscripcion: number;
  idCuotaExistente: number | null;
  numeroCuota: number;
  fechaVencimiento: Date;
  monto: number;
}

export type PagoConCuota = Pago & { cuota: { id_inscripcion: number; monto: number } };

export interface AlumnoDelPago {
  id_alumno: number;
  nombre: string;
  apellido: string;
}

export type TransferenciaConAlumno = Pago & { alumno: AlumnoDelPago };

// US-17: la propietaria ve las transferencias por antigüedad y las que pasaron las 24 horas sin
// revisar quedan marcadas ("vencidas en verificación"), aunque siguen pendientes.
export type TransferenciaEnRevision = TransferenciaConAlumno & {
  horas_desde_la_carga: number;
  supera_24_horas: boolean;
};

export interface FiltroTransferencias extends Partial<Paginacion> {
  estado?: EstadoPago;
  id_alumno?: number;
}

interface NombreCompleto {
  nombre: string;
  apellido: string;
}

// US-19: los días de Argentina en que se filtran los cobros (desde y hasta inclusive) y la profesora.
export interface FiltroEfectivo {
  id_profesora?: number;
  desde?: Date;
  hasta?: Date;
}

// El mismo filtro, ya en instantes reales para comparar contra un TIMESTAMP.
export interface FiltroEfectivoEnInstantes {
  id_profesora?: number;
  inicio?: Date;
  fin?: Date;
}

// Un cobro en efectivo de una profesora, con lo que la propietaria necesita para reclamarlo.
export interface CobroEnEfectivo {
  id_pago: number;
  monto: number;
  fecha_pago: Date;
  fecha_rendicion: Date | null;
  alumno: AlumnoDelPago;
  plan: string;
  cuota: { numero: number; vencimiento: Date };
  profesora: { id_profesora: number } & NombreCompleto;
}

export type CobroSinRendir = Omit<CobroEnEfectivo, "fecha_rendicion"> & { dias_sin_rendir: number };

export interface TotalDeProfesora extends NombreCompleto {
  id_profesora: number;
  cantidad: number;
  total: number;
}

// Lo que la propietaria tiene que cobrarle a cada profesora: los totales, completos, y una página de
// los cobros, del más viejo al más nuevo. cantidad es el total de cobros, para paginar.
export interface EfectivoPendiente {
  cantidad: number;
  total: number;
  profesoras: TotalDeProfesora[];
  cobros: CobroSinRendir[];
  limit: number;
  offset: number;
}

// US-26: el resumen del efectivo sin rendir, sin el detalle de cada cobro.
export interface ResumenEfectivoPendiente {
  cantidad: number;
  total: number;
  profesoras: TotalDeProfesora[];
  mas_antiguo: CobroSinRendir | null;
}

export type MotivoSinRendir = "NO_EXISTE" | "YA_RENDIDO" | "NO_ES_EFECTIVO_DE_PROFESORA";

export interface ResultadoRendicion {
  rendidos: number[];
  cantidad: number;
  total: number;
  salteados: { id_pago: number; motivo: MotivoSinRendir }[];
}

export interface PaginaRendiciones {
  datos: CobroEnEfectivo[];
  total: number;
  limit: number;
  offset: number;
}

// US-15: lo que lleva el comprobante. El número es el id del pago; el front lo arma para
// imprimir o guardar como PDF (decisión de SPRINT-3.md).
export interface Comprobante {
  numero: number;
  fecha: Date;
  forma_pago: FormaPago;
  monto: number;
  alumno: NombreCompleto & { dni: string | null };
  plan: string;
  cuota: { numero: number; vencimiento: Date; monto: number };
  // US-13: el precio de lista del plan el día del cobro y el descuento de la promoción, si la tuvo.
  precio_lista: number | null;
  descuento: number;
  promocion: { codigo: string; nombre: string } | null;
  registrado_por: NombreCompleto;
  profesora_cobra: NombreCompleto | null;
}

// Lo que trae el repositorio para armar el comprobante y decidir quién puede verlo.
export type PagoParaComprobante = Pago & {
  cuota: {
    numero_cuota: number;
    fecha_vencimiento: Date;
    monto: number;
    inscripcion: {
      plan: { nombre: string };
      promocion: { codigo: string; nombre: string } | null;
      alumno: {
        id_usuario: number;
        id_usuario_responsable: number | null;
        usuario: NombreCompleto & { dni: string | null };
      };
    };
  };
  usuario_registra: NombreCompleto;
  profesora_cobra: { usuario: NombreCompleto } | null;
  // El precio de lista del plan el día en que se generó la cuota; null si ese día no tenía.
  precio_lista: number | null;
};
