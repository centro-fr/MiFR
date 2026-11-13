// US-17: una transferencia que informó un alumno (US-16) y revisa la propietaria contra su
// extracto. No hay comprobante adjunto: la verificación se hace fuera del sistema.

/** estado_pago del DER. En la interfaz: pendiente de verificación, aprobada o rechazada. */
export type EstadoTransferencia = "PENDIENTE" | "CONFIRMADO" | "RECHAZADO";

/** Qué se pagaba al informarla. Lo deriva el back de la cuota (US-17); no se guarda. */
export type TipoTransferencia = "PRIMERA_CUOTA" | "CUOTA_VENCIDA" | "RENOVACION";

export interface AlumnoDeTransferencia {
  id: number;
  nombre: string;
  apellido: string;
}

export interface Transferencia {
  id: number;
  estado: EstadoTransferencia;
  monto: number;
  /** Timestamp ISO de la carga del aviso: desde acá corren las 24 horas para revisarla. */
  cargadaEl: string;
  /** Timestamp ISO que informó el alumno como momento de la transferencia. */
  realizadaEl: string | null;
  titularCuenta: string | null;
  observaciones: string | null;
  /** Timestamp ISO de la aprobación o el rechazo; null mientras está pendiente. */
  resueltaEl: string | null;
  motivoRechazo: string | null;
  alumno: AlumnoDeTransferencia;
  /** Lo calcula el back al responder (horas enteras desde la carga). */
  horasDesdeLaCarga: number;
  /** Pendiente con 24 horas o más sin revisar: "vencida en verificación". */
  superaPlazo: boolean;
  /** Lo trae el listado de la propietaria; las de "Mis transferencias" no lo tienen. */
  tipo?: TipoTransferencia | null;
  /** Nombre del plan que paga, del momento en que se informó. */
  plan?: string | null;
  /** La inscripción que paga: un alumno con varios planes informa una transferencia por cada uno. */
  idInscripcion?: number | null;
}
