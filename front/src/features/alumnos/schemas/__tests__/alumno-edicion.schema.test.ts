import { describe, expect, it } from "vitest";
import {
  calcularEdad,
  crearEdicionAlumnoSchema,
  esMenorDeEdad,
  obtenerLimitesFechaNacimiento,
  type EdicionAlumnoValores,
} from "../alumno";

function datosAlumno(fechaNacimiento = "1992-04-18"): EdicionAlumnoValores {
  return {
    usuario: {
      nombre: "Camila",
      apellido: "Pérez",
      dni: "35123456",
      fecha_nacimiento: fechaNacimiento,
      telefono: "11 5555-0101",
      email: "camila.perez@example.com",
      direccion: "Av. San Martín 123",
    },
    cont_emerg_nombre: "Sofía Pérez",
    cont_emerg_telefono: "11 5555-0102",
    apto_medico: false,
    fecha_apto_medico: null,
    observaciones: "",
  };
}

function schema(tieneTutor = false) {
  return crearEdicionAlumnoSchema({ tieneTutor });
}

describe("crearEdicionAlumnoSchema", () => {
  it("acepta la edición de una persona adulta con email y sin tutor", () => {
    expect(schema().safeParse(datosAlumno()).success).toBe(true);
  });

  it("exige un tutor existente cuando la persona es menor de edad", () => {
    const datos = datosAlumno("2012-08-22");

    expect(schema().safeParse(datos).success).toBe(false);
    expect(schema(true).safeParse(datos).success).toBe(true);
  });

  it("exige email para personas adultas y permite que un menor no tenga email", () => {
    const adultoSinEmail = datosAlumno();
    adultoSinEmail.usuario.email = "";
    const menorSinEmail = datosAlumno("2012-08-22");
    menorSinEmail.usuario.email = "";

    expect(schema().safeParse(adultoSinEmail).success).toBe(false);
    expect(schema(true).safeParse(menorSinEmail).success).toBe(true);
  });

  it("rechaza dígitos en nombre y apellido y admite acentos y guiones", () => {
    const nombreNumerico = datosAlumno();
    nombreNumerico.usuario.nombre = "Camila2";
    const apellidoNumerico = datosAlumno();
    apellidoNumerico.usuario.apellido = "Perez2";
    const nombreValido = datosAlumno();
    nombreValido.usuario.nombre = "María-José";

    expect(schema().safeParse(nombreNumerico).success).toBe(false);
    expect(schema().safeParse(apellidoNumerico).success).toBe(false);
    expect(schema().safeParse(nombreValido).success).toBe(true);
  });

  it("rechaza fechas de nacimiento futuras y edades superiores a 120 años", () => {
    const { min, max } = obtenerLimitesFechaNacimiento();
    const fechaAnteriorAlLimite = `${Number(min.slice(0, 4)) - 1}${min.slice(4)}`;

    expect(schema().safeParse(datosAlumno(`${Number(max.slice(0, 4)) + 1}${max.slice(4)}`)).success).toBe(false);
    expect(schema().safeParse(datosAlumno(fechaAnteriorAlLimite)).success).toBe(false);
  });

  it("calcula la mayoría de edad respetando si el cumpleaños ya ocurrió", () => {
    const fechaActual = new Date(2026, 5, 15);

    expect(calcularEdad("2008-06-15", fechaActual)).toBe(18);
    expect(calcularEdad("2008-06-16", fechaActual)).toBe(17);
    expect(esMenorDeEdad("2008-06-16", fechaActual)).toBe(true);
  });

  it("calcula el límite máximo de edad sin desbordar el 29 de febrero", () => {
    expect(obtenerLimitesFechaNacimiento(new Date(2024, 1, 29))).toEqual({
      min: "1904-02-29",
      max: "2024-02-29",
    });
  });

  it("valida el contacto de emergencia y el formato de teléfonos", () => {
    const nombreConDigitos = datosAlumno();
    nombreConDigitos.cont_emerg_nombre = "Sofía 2";
    const telefonoConLetras = datosAlumno();
    telefonoConLetras.cont_emerg_telefono = "llamar al 5555";
    const telefonoValido = datosAlumno();
    telefonoValido.cont_emerg_telefono = "+54 (11) 5555-0102";

    expect(schema().safeParse(nombreConDigitos).success).toBe(false);
    expect(schema().safeParse(telefonoConLetras).success).toBe(false);
    expect(schema().safeParse(telefonoValido).success).toBe(true);
  });

  it("valida DNI, longitud de nombres y observaciones", () => {
    const dniAlfabetico = datosAlumno();
    dniAlfabetico.usuario.dni = "35A123";
    const nombreLargo = datosAlumno();
    nombreLargo.usuario.nombre = "A".repeat(61);
    const observacionLarga = datosAlumno();
    observacionLarga.observaciones = "A".repeat(501);

    expect(schema().safeParse(dniAlfabetico).success).toBe(false);
    expect(schema().safeParse(nombreLargo).success).toBe(false);
    expect(schema().safeParse(observacionLarga).success).toBe(false);
  });

  it("exige fecha para el apto y rechaza fechas futuras, anteriores al nacimiento o inconsistentes", () => {
    const { max } = obtenerLimitesFechaNacimiento();
    const aptoSinFecha = { ...datosAlumno(), apto_medico: true };
    const aptoFuturo = { ...datosAlumno(), apto_medico: true, fecha_apto_medico: `${Number(max.slice(0, 4)) + 1}${max.slice(4)}` };
    const aptoAnteriorAlNacimiento = {
      ...datosAlumno(),
      apto_medico: true,
      fecha_apto_medico: "1992-04-17",
    };
    const fechaSinApto = { ...datosAlumno(), fecha_apto_medico: max };
    const aptoValido = { ...datosAlumno(), apto_medico: true, fecha_apto_medico: max };

    expect(schema().safeParse(aptoSinFecha).success).toBe(false);
    expect(schema().safeParse(aptoFuturo).success).toBe(false);
    expect(schema().safeParse(aptoAnteriorAlNacimiento).success).toBe(false);
    expect(schema().safeParse(fechaSinApto).success).toBe(false);
    expect(schema().safeParse(aptoValido).success).toBe(true);
  });
});
