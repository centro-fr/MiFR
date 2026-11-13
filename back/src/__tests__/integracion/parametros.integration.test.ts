import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CATALOGO_PARAMETROS } from "../../modules/gestion-servicio-entrenamiento/parametros-sistema/parametros-sistema.catalogo.js";
import type { ClaveParametro } from "../../modules/gestion-servicio-entrenamiento/parametros-sistema/parametros-sistema.types.js";
import type { CodigoRol } from "../../modules/gestion-usuarios/usuario/usuario.types.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";
import { crearUsuario } from "./fabricas.js";

// Casos PI-53 y PI-54 del plan de pruebas de integración: los parámetros del sistema que edita la
// propietaria (US-05, US-16, US-18, US-21) y los datos bancarios que ven el alumno y su tutor (US-16).
// La base arranca con los parámetros cargados por cargarParametrosIniciales, con su valor inicial.
const entorno = crearEntornoDeIntegracion();
const { app, prisma } = entorno;

const CLAVES = Object.keys(CATALOGO_PARAMETROS) as ClaveParametro[];

let tokenPropietaria: string;

async function tokenDe(...roles: CodigoRol[]): Promise<string> {
  const usuario = await crearUsuario(prisma, { roles });
  return entorno.iniciarSesion(usuario.email);
}

function como(token: string, metodo: "get" | "patch", ruta: string) {
  return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
}

async function valorEnLaBase(clave: ClaveParametro): Promise<string | undefined> {
  const fila = await prisma.parametros_sistema.findUnique({ where: { clave } });
  return fila?.valor;
}

beforeEach(async () => {
  await reiniciarBase(prisma);
  tokenPropietaria = await tokenDe("PROPIETARIA");
});
afterAll(() => entorno.cerrar());

describe("PI-53: la propietaria ve y edita los parámetros del sistema", () => {
  it("lista todos los parámetros del catálogo con su tipo y su valor inicial", async () => {
    const respuesta = await como(tokenPropietaria, "get", "/parametros");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.map(({ clave }: { clave: string }) => clave)).toEqual(CLAVES);
    expect(respuesta.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ clave: "DIAS_RESERVA_PREINSCRIPCION", tipo_dato: "ENTERO", valor: 3 }),
        expect.objectContaining({ clave: "MINUTOS_CIERRE_ASISTENCIA", tipo_dato: "ENTERO", valor: 0 }),
        expect.objectContaining({ clave: "VENCIDOS_PUEDEN_ASISTIR", tipo_dato: "BOOLEANO", valor: true }),
        expect.objectContaining({ clave: "DATOS_BANCARIOS_CBU", tipo_dato: "TEXTO", valor: "" }),
      ]),
    );
  });

  it("cambia un parámetro entero y el valor queda guardado", async () => {
    const respuesta = await como(tokenPropietaria, "patch", "/parametros/DIAS_RESERVA_PREINSCRIPCION").send({
      valor: 7,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      clave: "DIAS_RESERVA_PREINSCRIPCION",
      tipo_dato: "ENTERO",
      valor: 7,
    });
    expect(await valorEnLaBase("DIAS_RESERVA_PREINSCRIPCION")).toBe("7");
    const listado = await como(tokenPropietaria, "get", "/parametros");
    expect(listado.body).toContainEqual(
      expect.objectContaining({ clave: "DIAS_RESERVA_PREINSCRIPCION", valor: 7 }),
    );
  });

  it("cambia un parámetro booleano y el valor queda guardado", async () => {
    const respuesta = await como(tokenPropietaria, "patch", "/parametros/VENCIDOS_PUEDEN_ASISTIR").send({
      valor: false,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ tipo_dato: "BOOLEANO", valor: false });
    expect(await valorEnLaBase("VENCIDOS_PUEDEN_ASISTIR")).toBe("false");
  });

  it.each<[ClaveParametro, string | number, string]>([
    ["DIAS_RESERVA_PREINSCRIPCION", -1, "3"],
    ["DIAS_RESERVA_PREINSCRIPCION", 366, "3"],
    ["DIAS_RESERVA_PREINSCRIPCION", "tres", "3"],
    ["MINUTOS_CIERRE_ASISTENCIA", 1441, "0"],
    ["VENCIDOS_PUEDEN_ASISTIR", "si", "true"],
  ])("rechaza %s con el valor %j y no toca la base", async (clave, valor, valorInicial) => {
    const respuesta = await como(tokenPropietaria, "patch", `/parametros/${clave}`).send({ valor });

    expect(respuesta.status).toBe(400);
    expect(await valorEnLaBase(clave)).toBe(valorInicial);
  });

  it("rechaza una clave que no existe y no crea ninguna fila", async () => {
    const respuesta = await como(tokenPropietaria, "patch", "/parametros/NO_EXISTE").send({ valor: 5 });

    expect(respuesta.status).toBe(400);
    expect(await prisma.parametros_sistema.count()).toBe(CLAVES.length);
  });

  it("un parámetro sin fila rige con su valor inicial y al editarlo se crea", async () => {
    await prisma.parametros_sistema.delete({ where: { clave: "DIAS_RESERVA_PREINSCRIPCION" } });

    const antes = await como(tokenPropietaria, "get", "/parametros");
    const respuesta = await como(tokenPropietaria, "patch", "/parametros/DIAS_RESERVA_PREINSCRIPCION").send({
      valor: 5,
    });

    expect(antes.body).toContainEqual(
      expect.objectContaining({ clave: "DIAS_RESERVA_PREINSCRIPCION", valor: 3, fecha_actualizacion: null }),
    );
    expect(respuesta.status).toBe(200);
    expect(await valorEnLaBase("DIAS_RESERVA_PREINSCRIPCION")).toBe("5");
  });
});

describe("PI-54: los datos bancarios para transferir (US-16)", () => {
  it("sin cargar, el alumno y el tutor los reciben vacíos", async () => {
    const tokenAlumno = await tokenDe("ALUMNO");
    const tokenTutor = await tokenDe("TUTOR");

    const alumno = await como(tokenAlumno, "get", "/parametros/datos-bancarios");
    const tutor = await como(tokenTutor, "get", "/parametros/datos-bancarios");

    expect(alumno.status).toBe(200);
    expect(alumno.body).toEqual({ cbu: "", alias: "", titular: "" });
    expect(tutor.body).toEqual({ cbu: "", alias: "", titular: "" });
  });

  it("la propietaria los carga y el alumno y el tutor los ven", async () => {
    const tokenAlumno = await tokenDe("ALUMNO");
    const tokenTutor = await tokenDe("TUTOR");

    for (const [clave, valor] of [
      ["DATOS_BANCARIOS_CBU", "0000003100012345678901"],
      ["DATOS_BANCARIOS_ALIAS", "mifr.centro"],
      ["DATOS_BANCARIOS_TITULAR", "Centro MiFR"],
    ]) {
      const carga = await como(tokenPropietaria, "patch", `/parametros/${clave}`).send({ valor });
      expect(carga.status).toBe(200);
    }

    const esperados = { cbu: "0000003100012345678901", alias: "mifr.centro", titular: "Centro MiFR" };
    const alumno = await como(tokenAlumno, "get", "/parametros/datos-bancarios");
    const tutor = await como(tokenTutor, "get", "/parametros/datos-bancarios");
    expect(alumno.body).toEqual(esperados);
    expect(tutor.body).toEqual(esperados);
  });

  it("la propietaria también los ve", async () => {
    const respuesta = await como(tokenPropietaria, "get", "/parametros/datos-bancarios");

    expect(respuesta.status).toBe(200);
  });
});

describe("PI-53: quién puede ver y editar los parámetros", () => {
  it("sin sesión responde 401 en las tres rutas", async () => {
    const listado = await request(app).get("/api/v1/parametros");
    const bancarios = await request(app).get("/api/v1/parametros/datos-bancarios");
    const edicion = await request(app)
      .patch("/api/v1/parametros/DIAS_RESERVA_PREINSCRIPCION")
      .send({ valor: 5 });

    expect([listado.status, bancarios.status, edicion.status]).toEqual([401, 401, 401]);
  });

  it.each(["PROFESORA", "ALUMNO", "TUTOR"] as const)(
    "el rol %s no lista ni edita los parámetros, y no cambia nada",
    async (rol) => {
      const token = await tokenDe(rol);

      const listado = await como(token, "get", "/parametros");
      const edicion = await como(token, "patch", "/parametros/DIAS_RESERVA_PREINSCRIPCION").send({
        valor: 9,
      });

      expect(listado.status).toBe(403);
      expect(edicion.status).toBe(403);
      expect(await valorEnLaBase("DIAS_RESERVA_PREINSCRIPCION")).toBe("3");
    },
  );

  it("la profesora no ve los datos bancarios", async () => {
    const token = await tokenDe("PROFESORA");

    const respuesta = await como(token, "get", "/parametros/datos-bancarios");

    expect(respuesta.status).toBe(403);
  });
});
