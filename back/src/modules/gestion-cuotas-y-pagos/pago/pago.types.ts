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

// US-15: lo que lleva el comprobante. El número es el id del pago; el front lo arma para
// imprimir o guardar como PDF (decisión de SPRINT-3.md).
export interface Comprobante {
  numero: number;
  fecha: Date;
  forma_pago: FormaPago;
  monto: number;
  alumno: NombreCompleto & { dni: string | null };
  plan: string;
  cuota: { numero: number; vencimiento: Date };
  registrado_por: NombreCompleto;
  profesora_cobra: NombreCompleto | null;
}

// Lo que trae el repositorio para armar el comprobante y decidir quién puede verlo.
export type PagoParaComprobante = Pago & {
  cuota: {
    numero_cuota: number;
    fecha_vencimiento: Date;
    inscripcion: {
      plan: { nombre: string };
      alumno: {
        id_usuario: number;
        id_usuario_responsable: number | null;
        usuario: NombreCompleto & { dni: string | null };
      };
    };
  };
  usuario_registra: NombreCompleto;
  profesora_cobra: { usuario: NombreCompleto } | null;
};
