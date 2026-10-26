import { z } from "zod";
import type {
  RegistrarEfectivoBody,
  RegistrarTransferenciaRecibidaBody,
} from "@/features/alumnos/schemas/alta-definitiva";
import type { FormaPrimerPago } from "@/types/alta-definitiva";

// Formulario del primer pago (US-07), con las reglas de pago.schemas.ts del back: monto
// mayor a 0 con hasta dos decimales, transferencia no futura y titular de hasta 80 caracteres.

const MONTO_MAXIMO = 99_999_999.99;
// Sin separador de miles: "25.000" se confundiría con 25 pesos.
const FORMATO_MONTO = /^\d{1,8}(?:,\d{1,2})?$/;
// Lo que entrega un <input type="datetime-local">.
const FORMATO_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const LETRA = /\p{L}/u;
// Argentina no tiene horario de verano desde 2009: la hora local es siempre UTC-3.
const ZONA_ARGENTINA = "-03:00";

export const primerPagoFormSchema = z.object({
  formaPago: z.enum(["EFECTIVO", "TRANSFERENCIA"], {
    required_error: "Elegí cómo abonó.",
    invalid_type_error: "Elegí cómo abonó.",
  }),
  monto: z.string().trim(),
  fechaHoraTransferencia: z.string(),
  titularCuentaOrigen: z.string().trim(),
  confirmarMontoDistinto: z.boolean(),
});

export type PrimerPagoFormValues = z.input<typeof primerPagoFormSchema>;

/** "2026-10-09T10:30" (hora argentina) → "2026-10-09T10:30:00-03:00", como pide el back. */
export function aFechaHoraConZona(valor: string): string {
  return `${valor}:00${ZONA_ARGENTINA}`;
}

// "sv-SE" formatea como ISO ("2026-10-10 14:30"): lo que necesita el atributo max del input.
const FORMATO_INPUT_ARGENTINA = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** El momento `fecha` en hora argentina, como lo usa un <input type="datetime-local">. */
export function fechaHoraParaInput(fecha: Date): string {
  return FORMATO_INPUT_ARGENTINA.format(fecha).replace(" ", "T");
}

/** "25000,50" → 25000.5. */
export function montoDesdeTexto(texto: string): number {
  return Number(texto.trim().replace(",", "."));
}

interface ContextoPrimerPago {
  precio: number;
  ahora: Date;
  /** El back ya respondió MONTO_DISTINTO: el precio cambió desde la pre-inscripción. */
  backInformoMontoDistinto: boolean;
}

export function requiereConfirmarMonto(montoTexto: string, contexto: Omit<ContextoPrimerPago, "ahora">): boolean {
  if (contexto.backInformoMontoDistinto) return true;
  return FORMATO_MONTO.test(montoTexto.trim()) && montoDesdeTexto(montoTexto) !== contexto.precio;
}

function errorDeMonto(texto: string): string | null {
  if (texto === "") return "Ingresá el monto cobrado.";
  if (!FORMATO_MONTO.test(texto)) return "Ingresá solo números, sin puntos, con hasta 2 decimales después de la coma.";
  const monto = montoDesdeTexto(texto);
  if (monto <= 0) return "El monto tiene que ser mayor a 0.";
  if (monto > MONTO_MAXIMO) return "El monto es demasiado grande.";
  return null;
}

function errorDeFechaHora(valor: string, ahora: Date): string | null {
  if (valor === "") return "Ingresá cuándo se hizo la transferencia.";
  if (!FORMATO_FECHA_HORA.test(valor)) return "La fecha y hora no es válida.";
  const fecha = new Date(aFechaHoraConZona(valor));
  if (Number.isNaN(fecha.getTime())) return "La fecha y hora no es válida.";
  return fecha > ahora ? "La transferencia no puede ser futura." : null;
}

function errorDeTitular(valor: string): string | null {
  if (valor === "") return null;
  if (valor.length > 80) return "Máximo 80 caracteres.";
  return LETRA.test(valor) ? null : "El titular tiene que tener al menos una letra.";
}

/** Valida el formulario con el precio del plan y la hora actual. */
export function crearPrimerPagoSchema(contexto: ContextoPrimerPago) {
  return primerPagoFormSchema.superRefine((datos, ctx) => {
    const agregar = (path: keyof PrimerPagoFormValues, message: string | null) => {
      if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    };
    const errorMonto = errorDeMonto(datos.monto);
    agregar("monto", errorMonto);
    if (!errorMonto && requiereConfirmarMonto(datos.monto, contexto) && !datos.confirmarMontoDistinto) {
      agregar("confirmarMontoDistinto", "Confirmá que el monto es distinto del precio del plan.");
    }
    if (datos.formaPago === "TRANSFERENCIA") {
      agregar("fechaHoraTransferencia", errorDeFechaHora(datos.fechaHoraTransferencia, contexto.ahora));
      agregar("titularCuentaOrigen", errorDeTitular(datos.titularCuentaOrigen));
    }
  });
}

export type PrimerPagoValidado = z.output<typeof primerPagoFormSchema>;

export type CuerpoPrimerPago =
  | { formaPago: "EFECTIVO"; cuerpo: RegistrarEfectivoBody }
  | { formaPago: "TRANSFERENCIA"; cuerpo: RegistrarTransferenciaRecibidaBody };

/** Arma el cuerpo del endpoint que corresponde a la forma de pago elegida. */
export function aCuerpoPrimerPago(
  idInscripcion: string,
  datos: PrimerPagoValidado,
  idPromocion?: number,
): CuerpoPrimerPago {
  const base: RegistrarEfectivoBody = {
    id_inscripcion: Number(idInscripcion),
    monto: montoDesdeTexto(datos.monto),
    confirmar_monto_distinto: datos.confirmarMontoDistinto,
    ...(idPromocion !== undefined && { id_promocion: idPromocion }),
  };
  if (datos.formaPago === "EFECTIVO") return { formaPago: "EFECTIVO", cuerpo: base };
  return {
    formaPago: "TRANSFERENCIA",
    cuerpo: {
      ...base,
      fecha_hora_transferencia: aFechaHoraConZona(datos.fechaHoraTransferencia),
      // Vacío no viaja: el back lo guarda como NULL.
      ...(datos.titularCuentaOrigen && { titular_cuenta_origen: datos.titularCuentaOrigen }),
    },
  };
}

// El monto arranca con el precio del plan: es lo que se cobra casi siempre.
export function valoresInicialesPrimerPago(precio: number, formaPago: FormaPrimerPago): PrimerPagoFormValues {
  return {
    formaPago,
    monto: String(precio).replace(".", ","),
    fechaHoraTransferencia: "",
    titularCuentaOrigen: "",
    confirmarMontoDistinto: false,
  };
}
