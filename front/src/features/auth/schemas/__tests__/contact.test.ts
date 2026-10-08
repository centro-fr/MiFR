import { describe, expect, it } from "vitest";
import { contactSchema } from "@/features/auth/schemas/contact";

describe("contactSchema", () => {
  const datosValidos = {
    nombre: "Martín Rodríguez",
    email: "martin.rodriguez@gmail.com",
    telefono: "+54 9 11 1234-5678",
    tipoAcceso: "socio" as const,
    mensaje: "Quisiera información sobre las actividades.",
  };

  it("acepta datos válidos de contacto", () => {
    const res = contactSchema.safeParse(datosValidos);
    expect(res.success).toBe(true);
  });

  describe("nombre", () => {
    it("rechaza nombres de menos de 2 caracteres", () => {
      const res = contactSchema.safeParse({ ...datosValidos, nombre: "M" });
      expect(res.success).toBe(false);
    });

    it("rechaza nombres compuestos solo por números o signos ('123', '!!')", () => {
      const resNumeros = contactSchema.safeParse({ ...datosValidos, nombre: "123" });
      expect(resNumeros.success).toBe(false);

      const resSignos = contactSchema.safeParse({ ...datosValidos, nombre: "!!" });
      expect(resSignos.success).toBe(false);
    });

    it("acepta nombres con tildes, apóstrofos y guiones", () => {
      const res = contactSchema.safeParse({ ...datosValidos, nombre: "María O'Neill-Pérez" });
      expect(res.success).toBe(true);
    });

    it("rechaza nombres mayores a 60 caracteres", () => {
      const res = contactSchema.safeParse({ ...datosValidos, nombre: "A".repeat(61) });
      expect(res.success).toBe(false);
    });
  });

  describe("telefono", () => {
    it("rechaza teléfonos con menos de 7 dígitos", () => {
      const res = contactSchema.safeParse({ ...datosValidos, telefono: "123456" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("El teléfono debe tener entre 7 y 15 dígitos");
      }
    });

    it("rechaza teléfonos con más de 15 dígitos", () => {
      const res = contactSchema.safeParse({ ...datosValidos, telefono: "1".repeat(16) });
      expect(res.success).toBe(false);
    });

    it("rechaza caracteres inválidos (letras o signos no permitidos)", () => {
      const res = contactSchema.safeParse({ ...datosValidos, telefono: "11-4567-8901#ext" });
      expect(res.success).toBe(false);
    });

    it("acepta formatos con +, paréntesis, guiones y espacios", () => {
      const res = contactSchema.safeParse({ ...datosValidos, telefono: "+54 (011) 4567-8901" });
      expect(res.success).toBe(true);
    });
  });

  describe("email", () => {
    it("rechaza correos con formato inválido", () => {
      const res = contactSchema.safeParse({ ...datosValidos, email: "no-email" });
      expect(res.success).toBe(false);
    });

    it("rechaza correos de más de 120 caracteres", () => {
      const res = contactSchema.safeParse({
        ...datosValidos,
        email: `${"a".repeat(115)}@example.com`,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("Máximo 120 caracteres");
      }
    });
  });

  describe("mensaje", () => {
    it("acepta mensaje omitido (opcional)", () => {
      const sinMensaje = {
        nombre: datosValidos.nombre,
        email: datosValidos.email,
        telefono: datosValidos.telefono,
        tipoAcceso: datosValidos.tipoAcceso,
      };
      const res = contactSchema.safeParse(sinMensaje);
      expect(res.success).toBe(true);
    });

    it("rechaza mensaje de más de 500 caracteres", () => {
      const res = contactSchema.safeParse({
        ...datosValidos,
        mensaje: "A".repeat(501),
      });
      expect(res.success).toBe(false);
    });
  });
});
