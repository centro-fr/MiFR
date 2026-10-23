import { describe, expect, it } from "vitest";
import {
  formatearUltimaAsistencia,
  generarEnlaceWhatsApp,
  generarMensajeReintegro,
  obtenerContactoPrioritario,
} from "../formato-inactivos";
import type { AlumnoInactivo } from "@/features/inactivos/schemas/inactivos";

const baseFixture: AlumnoInactivo = {
  id_inscripcion: 10,
  alumno: {
    id_alumno: 100,
    nombre: "Lucía",
    apellido: "Martínez",
    telefono: "3515551234",
    email: "lucia@test.com",
  },
  tutor: null,
  profesora: {
    id_profesora: 5,
    nombre: "Mariana",
    apellido: "Paz",
  },
  plan: {
    id_plan: 2,
    nombre: "Danza Clásica 2v",
  },
  estado_cuota: "AL_DIA",
  inasistencias_consecutivas: 4,
  fecha_ultima_asistencia: "2026-10-10T00:00:00.000Z",
  gestion: {
    estado: "PENDIENTE",
    fecha_registro: null,
  },
};

describe("formato-inactivos", () => {
  it("prioriza al alumno cuando no tiene tutor", () => {
    const contacto = obtenerContactoPrioritario(baseFixture);
    expect(contacto.esTutor).toBe(false);
    expect(contacto.nombreCompleto).toBe("Lucía Martínez");
    expect(contacto.telefono).toBe("3515551234");
  });

  it("prioriza al tutor cuando el alumno es menor con tutor registrado", () => {
    const conTutor: AlumnoInactivo = {
      ...baseFixture,
      tutor: {
        nombre: "Valeria",
        apellido: "Gómez",
        telefono: "3516667890",
        email: "valeria@test.com",
      },
    };
    const contacto = obtenerContactoPrioritario(conTutor);
    expect(contacto.esTutor).toBe(true);
    expect(contacto.nombreCompleto).toBe("Valeria Gómez");
    expect(contacto.telefono).toBe("3516667890");
    expect(contacto.nombreAlumno).toBe("Lucía Martínez");
  });

  it("genera mensaje personalizado para alumno mayor", () => {
    const mensaje = generarMensajeReintegro(baseFixture);
    expect(mensaje).toContain("¡Hola Lucía!");
    expect(mensaje).toContain("Danza Clásica 2v");
  });

  it("genera mensaje personalizado para tutor", () => {
    const conTutor: AlumnoInactivo = {
      ...baseFixture,
      tutor: {
        nombre: "Valeria",
        apellido: "Gómez",
        telefono: "3516667890",
        email: "valeria@test.com",
      },
    };
    const mensaje = generarMensajeReintegro(conTutor);
    expect(mensaje).toContain("¡Hola Valeria!");
    expect(mensaje).toContain("clases de Lucía");
  });

  it("genera enlace wa.me agregando 549 a teléfono argentino de 10 dígitos", () => {
    const enlace = generarEnlaceWhatsApp("3515551234", "Hola");
    expect(enlace).toContain("https://wa.me/5493515551234?text=Hola");
  });

  it("mantiene prefijo internacional si ya viene con +", () => {
    const enlace = generarEnlaceWhatsApp("+5493515551234");
    expect(enlace).toBe("https://wa.me/5493515551234");
  });

  it("retorna null si el teléfono está vacío o es inválido", () => {
    expect(generarEnlaceWhatsApp(null)).toBeNull();
    expect(generarEnlaceWhatsApp("123")).toBeNull();
  });

  it("formatea correctamente la última asistencia", () => {
    expect(formatearUltimaAsistencia(null)).toBe("Sin asistencias previas");
    expect(formatearUltimaAsistencia("2026-10-10T00:00:00.000Z")).toContain("10/10/2026");
  });
});
