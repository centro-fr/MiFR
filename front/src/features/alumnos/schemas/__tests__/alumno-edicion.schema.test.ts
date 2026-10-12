import { describe, expect, it } from "vitest";
import {
  actualizarAlumnoSchema,
  calcularEdad,
  esMenorDeEdad,
  obtenerLimitesFechaNacimiento,
  type ActualizarAlumnoInput,
} from "@/features/alumnos/schemas/alumno";

function datosAlumno(fechaNacimiento: string): ActualizarAlumnoInput {
  return {
    usuario: {
      nombre: "Camila",
      apellido: "Pérez",
      dni: "35123456",
      fecha_nacimiento: fechaNacimiento,
      telefono: "11 5555-0101",
      email: "camila.perez@example.com",
    },
    tutor: null,
    cont_emerg_nombre: null,
    cont_emerg_telefono: null,
    apto_medico: false,
    fecha_apto_medico: null,
    observaciones: null,
    id_plan: 1,
    id_horarios: [1],
  };
}

describe("actualizarAlumnoSchema", () => {
  it("acepta la edición de una persona adulta sin tutor", () => {
    expect(actualizarAlumnoSchema.safeParse(datosAlumno("1992-04-18")).success).toBe(true);
  });

  it("exige los datos del tutor para una persona menor de edad", () => {
    const resultado = actualizarAlumnoSchema.safeParse(datosAlumno("2012-08-22"));

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => issue.path[0] === "tutor")).toBe(true);
    }
  });

  it("rechaza datos de tutor para una persona mayor de edad", () => {
    const datos = {
      ...datosAlumno("1992-04-18"),
      tutor: {
        nombre: "Ana",
        apellido: "Pérez",
        dni: "12345678",
        telefono: "11 1234-5678",
        email: "ana@example.com",
      },
    };
    const resultado = actualizarAlumnoSchema.safeParse(datos);

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => issue.path[0] === "tutor")).toBe(true);
    }
  });

  it("exige fecha cuando se marca el apto médico como presentado", () => {
    const datos = { ...datosAlumno("1992-04-18"), apto_medico: true };

    expect(actualizarAlumnoSchema.safeParse(datos).success).toBe(false);
  });

  it("rechaza dígitos en los nombres y admite nombres con acentos y guiones", () => {
    const datosInvalidos = datosAlumno("1992-04-18");
    datosInvalidos.usuario.nombre = "Camila2";
    const datosValidos = datosAlumno("1992-04-18");
    datosValidos.usuario.nombre = "María-José";

    expect(actualizarAlumnoSchema.safeParse(datosInvalidos).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(datosValidos).success).toBe(true);
  });

  it("rechaza fechas de nacimiento futuras y edades superiores a 120 años", () => {
    const hoy = new Date();
    const fechaFutura = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
    const fechaAntigua = new Date(hoy.getFullYear() - 145, hoy.getMonth(), hoy.getDate());
    const formatoFecha = (fecha: Date) =>
      `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    const futura = actualizarAlumnoSchema.safeParse(datosAlumno(formatoFecha(fechaFutura)));
    const muyAntigua = actualizarAlumnoSchema.safeParse(datosAlumno(formatoFecha(fechaAntigua)));

    expect(futura.success).toBe(false);
    expect(muyAntigua.success).toBe(false);
    if (!muyAntigua.success) {
      expect(muyAntigua.error.issues.some((issue) => issue.path.join(".") === "usuario.fecha_nacimiento")).toBe(
        true,
      );
    }
  });

  it("calcula la mayoría de edad respetando si el cumpleaños ya ocurrió", () => {
    const fechaActual = new Date(2026, 5, 15);

    expect(calcularEdad("2008-06-15", fechaActual)).toBe(18);
    expect(calcularEdad("2008-06-16", fechaActual)).toBe(17);
    expect(esMenorDeEdad("2008-06-16", fechaActual)).toBe(true);
  });

  it("calcula el límite de edad máxima sin desbordar el 29 de febrero", () => {
    expect(obtenerLimitesFechaNacimiento(new Date(2024, 1, 29))).toEqual({
      min: "1904-02-29",
      max: "2024-02-29",
    });
  });

  it("rechaza apellidos con dígitos y limita cada campo a 60 caracteres", () => {
    const conApellidoNumerico = datosAlumno("1992-04-18");
    conApellidoNumerico.usuario.apellido = "Perez2";
    const apellidoLargo = datosAlumno("1992-04-18");
    apellidoLargo.usuario.apellido = "A".repeat(61);

    expect(actualizarAlumnoSchema.safeParse(conApellidoNumerico).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(apellidoLargo).success).toBe(false);
  });

  it("rechaza horarios duplicados y fechas de apto inválidas", () => {
    const horariosDuplicados = { ...datosAlumno("1992-04-18"), id_horarios: [1, 1] };
    const fechaAptoInvalida = {
      ...datosAlumno("1992-04-18"),
      apto_medico: true,
      fecha_apto_medico: "no-es-fecha",
    };

    expect(actualizarAlumnoSchema.safeParse(horariosDuplicados).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(fechaAptoInvalida).success).toBe(false);
  });

  it("valida el nombre del contacto de emergencia con las mismas reglas de persona", () => {
    const nombreConDigitos = datosAlumno("1992-04-18");
    nombreConDigitos.cont_emerg_nombre = "Sofía 2";
    const nombreValido = datosAlumno("1992-04-18");
    nombreValido.cont_emerg_nombre = "Sofía O'Connor";
    const nombreDemasiadoLargo = datosAlumno("1992-04-18");
    nombreDemasiadoLargo.cont_emerg_nombre = "A".repeat(81);
    const sinContacto = datosAlumno("1992-04-18");
    sinContacto.cont_emerg_nombre = "   ";

    expect(actualizarAlumnoSchema.safeParse(nombreConDigitos).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(nombreValido).success).toBe(true);
    expect(actualizarAlumnoSchema.safeParse(nombreDemasiadoLargo).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(sinContacto).success).toBe(true);
  });

  it("acepta teléfonos con formato común y rechaza letras, formatos inválidos o longitudes fuera de rango", () => {
    const valido = datosAlumno("1992-04-18");
    valido.cont_emerg_telefono = "+54 (11) 5555-0102";
    const letras = datosAlumno("1992-04-18");
    letras.cont_emerg_telefono = "llamar al 5555";
    const demasiadoCorto = datosAlumno("1992-04-18");
    demasiadoCorto.cont_emerg_telefono = "123456";
    const demasiadosDigitos = datosAlumno("1992-04-18");
    demasiadosDigitos.usuario.telefono = "1234567890123456";
    const formatoInvalido = datosAlumno("1992-04-18");
    formatoInvalido.usuario.telefono = "++54 11 5555 0101";
    const parentesisSinCerrar = datosAlumno("1992-04-18");
    parentesisSinCerrar.usuario.telefono = "(11 5555-0101";

    expect(actualizarAlumnoSchema.safeParse(valido).success).toBe(true);
    expect(actualizarAlumnoSchema.safeParse(letras).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(demasiadoCorto).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(demasiadosDigitos).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(formatoInvalido).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(parentesisSinCerrar).success).toBe(false);
  });

  it("solo permite DNI numérico de hasta 10 caracteres", () => {
    const dniAlfabetico = datosAlumno("1992-04-18");
    dniAlfabetico.usuario.dni = "35A123";
    const dniValido = datosAlumno("1992-04-18");
    dniValido.usuario.dni = "0012345678";
    const dniLargo = datosAlumno("1992-04-18");
    dniLargo.usuario.dni = "12345678901";

    expect(actualizarAlumnoSchema.safeParse(dniAlfabetico).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(dniValido).success).toBe(true);
    expect(actualizarAlumnoSchema.safeParse(dniLargo).success).toBe(false);
  });

  it("aplica las validaciones de nombre, DNI y teléfono a tutores", () => {
    const tutorInvalido = {
      ...datosAlumno("2012-08-22"),
      tutor: {
        nombre: "Ana2",
        apellido: "Pérez",
        dni: "12345678",
        telefono: "11 5555-0102",
        email: "ana@example.com",
      },
    };
    const telefonoTutorInvalido = {
      ...tutorInvalido,
      tutor: { ...tutorInvalido.tutor, telefono: "sin teléfono" },
    };
    const dniTutorInvalido = {
      ...tutorInvalido,
      tutor: { ...tutorInvalido.tutor, nombre: "Ana", dni: "1234AB" },
    };
    const tutorValido = {
      ...tutorInvalido,
      tutor: { ...tutorInvalido.tutor, nombre: "Ana" },
    };

    expect(actualizarAlumnoSchema.safeParse(tutorInvalido).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(telefonoTutorInvalido).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(dniTutorInvalido).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(tutorValido).success).toBe(true);
  });

  it("rechaza fechas de apto médico futuras, anteriores al nacimiento o inconsistentes con el estado", () => {
    const hoy = obtenerLimitesFechaNacimiento().max;
    const futura = new Date(`${hoy}T12:00:00`);
    futura.setDate(futura.getDate() + 1);
    const fechaFutura = [
      futura.getFullYear().toString().padStart(4, "0"),
      (futura.getMonth() + 1).toString().padStart(2, "0"),
      futura.getDate().toString().padStart(2, "0"),
    ].join("-");
    const aptoFuturo = {
      ...datosAlumno("1992-04-18"),
      apto_medico: true,
      fecha_apto_medico: fechaFutura,
    };
    const aptoAnteriorAlNacimiento = {
      ...datosAlumno("1992-04-18"),
      apto_medico: true,
      fecha_apto_medico: "1992-04-17",
    };
    const fechaSinApto = {
      ...datosAlumno("1992-04-18"),
      fecha_apto_medico: hoy,
    };
    const aptoEnFechaValida = {
      ...datosAlumno("1992-04-18"),
      apto_medico: true,
      fecha_apto_medico: hoy,
    };

    expect(actualizarAlumnoSchema.safeParse(aptoFuturo).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(aptoAnteriorAlNacimiento).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(fechaSinApto).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(aptoEnFechaValida).success).toBe(true);
  });

  it("rechaza emails inválidos y observaciones mayores a 500 caracteres", () => {
    const emailInvalido = datosAlumno("1992-04-18");
    emailInvalido.usuario.email = "camila@";
    const observacionLarga = { ...datosAlumno("1992-04-18"), observaciones: "A".repeat(501) };
    const emailYObservacionOpcionales = datosAlumno("1992-04-18");
    emailYObservacionOpcionales.usuario.email = "";

    expect(actualizarAlumnoSchema.safeParse(emailInvalido).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(observacionLarga).success).toBe(false);
    expect(actualizarAlumnoSchema.safeParse(emailYObservacionOpcionales).success).toBe(true);
  });
});
