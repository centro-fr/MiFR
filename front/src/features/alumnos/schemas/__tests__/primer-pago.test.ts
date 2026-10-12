import { describe, expect, it } from "vitest";
import {
  aCuerpoPrimerPago,
  crearPrimerPagoSchema,
  fechaHoraParaInput,
  requiereConfirmarMonto,
  valoresInicialesPrimerPago,
  type PrimerPagoFormValues,
} from "@/features/alumnos/schemas/primer-pago";

const AHORA = new Date("2026-10-10T15:00:00Z"); // 12:00 en Argentina
const CONTEXTO = { precio: 25000, ahora: AHORA, backInformoMontoDistinto: false };

function valores(cambios: Partial<PrimerPagoFormValues> = {}): PrimerPagoFormValues {
  return { ...valoresInicialesPrimerPago(25000, "EFECTIVO"), ...cambios };
}

function errores(datos: PrimerPagoFormValues, contexto = CONTEXTO): Record<string, string> {
  const resultado = crearPrimerPagoSchema(contexto).safeParse(datos);
  if (resultado.success) return {};
  return Object.fromEntries(resultado.error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

describe("crearPrimerPagoSchema", () => {
  it("acepta el primer pago en efectivo por el precio del plan", () => {
    expect(errores(valores())).toEqual({});
  });

  // "25.000" se leería como 25 pesos: el separador de miles no se acepta.
  it("rechaza un monto con puntos de miles o con más de 2 decimales", () => {
    expect(errores(valores({ monto: "25.000" })).monto).toMatch(/sin puntos/);
    expect(errores(valores({ monto: "25000,555" })).monto).toMatch(/2 decimales/);
  });

  it("rechaza un monto vacío o en cero", () => {
    expect(errores(valores({ monto: "" })).monto).toMatch(/Ingresá el monto/);
    expect(errores(valores({ monto: "0" })).monto).toMatch(/mayor a 0/);
  });

  // pago.service.ts: un monto distinto del esperado pasa solo si quien lo carga lo confirma.
  it("pide confirmar un monto distinto del precio del plan", () => {
    expect(errores(valores({ monto: "20000" })).confirmarMontoDistinto).toMatch(/Confirmá/);
    expect(errores(valores({ monto: "20000", confirmarMontoDistinto: true }))).toEqual({});
  });

  // El precio cambió desde la pre-inscripción: el back responde MONTO_DISTINTO aunque el monto sea el del plan.
  it("pide confirmar el monto si el back lo informó distinto", () => {
    const contexto = { ...CONTEXTO, backInformoMontoDistinto: true };

    expect(errores(valores(), contexto).confirmarMontoDistinto).toBeDefined();
  });

  it("exige la fecha y hora de una transferencia y no la acepta futura", () => {
    expect(errores(valores({ formaPago: "TRANSFERENCIA" })).fechaHoraTransferencia).toMatch(/Ingresá cuándo/);
    expect(errores(valores({ formaPago: "TRANSFERENCIA", fechaHoraTransferencia: "2026-10-10T12:30" })).fechaHoraTransferencia).toMatch(/futura/);
    expect(errores(valores({ formaPago: "TRANSFERENCIA", fechaHoraTransferencia: "2026-10-10T11:30" }))).toEqual({});
  });

  it("no valida los datos de la transferencia si pagó en efectivo", () => {
    expect(errores(valores({ fechaHoraTransferencia: "basura", titularCuentaOrigen: "123" }))).toEqual({});
  });

  it("rechaza un titular sin letras", () => {
    const datos = valores({ formaPago: "TRANSFERENCIA", fechaHoraTransferencia: "2026-10-09T10:30", titularCuentaOrigen: "1234" });

    expect(errores(datos).titularCuentaOrigen).toMatch(/una letra/);
  });
});

describe("requiereConfirmarMonto", () => {
  it("no pide confirmación con el precio del plan, aunque tenga decimales en cero", () => {
    expect(requiereConfirmarMonto("25000", CONTEXTO)).toBe(false);
    expect(requiereConfirmarMonto("25000,00", CONTEXTO)).toBe(false);
  });

  it("no pide confirmación mientras el monto no es válido", () => {
    expect(requiereConfirmarMonto("25.0", CONTEXTO)).toBe(false);
  });
});

describe("aCuerpoPrimerPago", () => {
  it("arma el cuerpo de POST /pagos/efectivo", () => {
    const datos = crearPrimerPagoSchema(CONTEXTO).parse(valores({ monto: "25000,50", confirmarMontoDistinto: true }));

    expect(aCuerpoPrimerPago("7", datos)).toEqual({
      formaPago: "EFECTIVO",
      cuerpo: { id_inscripcion: 7, monto: 25000.5, confirmar_monto_distinto: true },
    });
  });

  // El back exige ISO 8601 con zona horaria: la hora del input es la de Argentina.
  it("manda la transferencia con la hora argentina y sin titular si quedó vacío", () => {
    const datos = crearPrimerPagoSchema(CONTEXTO).parse(
      valores({ formaPago: "TRANSFERENCIA", fechaHoraTransferencia: "2026-10-09T10:30" }),
    );

    expect(aCuerpoPrimerPago("7", datos)).toEqual({
      formaPago: "TRANSFERENCIA",
      cuerpo: { id_inscripcion: 7, monto: 25000, confirmar_monto_distinto: false, fecha_hora_transferencia: "2026-10-09T10:30:00-03:00" },
    });
  });
});

describe("fechaHoraParaInput", () => {
  it("devuelve la hora de Argentina aunque en UTC ya sea otro día", () => {
    expect(fechaHoraParaInput(new Date("2026-10-11T02:30:00Z"))).toBe("2026-10-10T23:30");
  });
});
