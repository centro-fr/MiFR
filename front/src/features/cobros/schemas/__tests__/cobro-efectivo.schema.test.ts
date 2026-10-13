import { describe, expect, it } from "vitest";
import {
  aCuerpoCobroEfectivo,
  comprobantePagoSchema,
  pagoApiSchema,
  registrarCobroEfectivoFormSchema,
} from "../cobro-efectivo.schema";

describe("registrarCobroEfectivoFormSchema (US-15)", () => {
  it("valida exitosamente un cobro con monto entero", () => {
    const resultado = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion: 1,
      monto: "25000",
      confirmarMontoDistinto: false,
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.monto).toBe("25000");
      expect(resultado.data.confirmarMontoDistinto).toBe(false);
    }
  });

  it("acepta monto con decimales usando punto o coma", () => {
    const conComa = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion: 1,
      monto: "25000,50",
      confirmarMontoDistinto: true,
    });
    expect(conComa.success).toBe(true);

    const conPunto = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion: 1,
      monto: "25000.50",
      confirmarMontoDistinto: true,
    });
    expect(conPunto.success).toBe(true);
  });

  it("rechaza monto vacío o menor o igual a cero", () => {
    const vacio = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion: 1,
      monto: "",
      confirmarMontoDistinto: false,
    });
    expect(vacio.success).toBe(false);

    const cero = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion: 1,
      monto: "0",
      confirmarMontoDistinto: false,
    });
    expect(cero.success).toBe(false);

    const negativo = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion: 1,
      monto: "-500",
      confirmarMontoDistinto: false,
    });
    expect(negativo.success).toBe(false);
  });

  it("rechaza caracteres no numéricos en el monto", () => {
    const resultado = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion: 1,
      monto: "veinticincomil",
      confirmarMontoDistinto: false,
    });
    expect(resultado.success).toBe(false);
  });

  it("rechaza montos que superen el límite máximo", () => {
    const resultado = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion: 1,
      monto: "100000000",
      confirmarMontoDistinto: false,
    });
    expect(resultado.success).toBe(false);
  });

  it("limita las observaciones a 255 caracteres", () => {
    const largo = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion: 1,
      monto: "25000",
      confirmarMontoDistinto: false,
      observaciones: "A".repeat(256),
    });
    expect(largo.success).toBe(false);

    const valido = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion: 1,
      monto: "25000",
      confirmarMontoDistinto: false,
      observaciones: "A".repeat(255),
    });
    expect(valido.success).toBe(true);
  });
});

describe("aCuerpoCobroEfectivo", () => {
  it("transforma correctamente los valores del formulario al cuerpo de la API", () => {
    const cuerpo = aCuerpoCobroEfectivo({
      idInscripcion: 5,
      monto: " 30000,50 ",
      confirmarMontoDistinto: true,
      observaciones: " Pago del mes en efectivo ",
    });

    expect(cuerpo).toEqual({
      id_inscripcion: 5,
      monto: 30000.5,
      confirmar_monto_distinto: true,
      observaciones: "Pago del mes en efectivo",
    });
  });

  it("deja observaciones como undefined si está vacío", () => {
    const cuerpo = aCuerpoCobroEfectivo({
      idInscripcion: 2,
      monto: "25000",
      confirmarMontoDistinto: false,
      observaciones: "   ",
    });

    expect(cuerpo.observaciones).toBeUndefined();
  });
});

describe("comprobantePagoSchema", () => {
  it("valida el formato de comprobante digital emitido por el backend", () => {
    const comprobanteEjemplo = {
      numero: 142,
      fecha: "2026-10-12T15:30:00.000Z",
      forma_pago: "EFECTIVO",
      monto: 25000,
      alumno: {
        nombre: "Sofía",
        apellido: "Medina",
        dni: "42123456",
      },
      plan: "Plan Básico",
      cuota: {
        numero: 2,
        vencimiento: "2026-10-12T00:00:00.000Z",
      },
      registrado_por: {
        nombre: "Lucía",
        apellido: "García",
      },
      profesora_cobra: {
        nombre: "Lucía",
        apellido: "García",
      },
    };

    const resultado = comprobantePagoSchema.safeParse(comprobanteEjemplo);
    expect(resultado.success).toBe(true);
  });
});

describe("pagoApiSchema", () => {
  it("valida un pago confirmado devuelto por la API", () => {
    const pagoEjemplo = {
      id_pago: 10,
      id_cuota: 10,
      forma_pago: "EFECTIVO",
      estado: "CONFIRMADO",
      monto: 25000,
      fecha_pago: "2026-10-12T15:30:00.000Z",
      id_usuario_registra: 2,
      id_profesora_cobra: 1,
      rendido: false,
    };

    const resultado = pagoApiSchema.safeParse(pagoEjemplo);
    expect(resultado.success).toBe(true);
  });
});
