import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO } from "../../shared/db/datos-demo.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";
import { crearAlumno, crearUsuario } from "./fabricas.js";

// Casos PI-15 a PI-18, PI-25 y PI-26 del plan de pruebas de integración: alta de alumnos mayores y
// menores con su tutor (US-05, US-06), modificación (US-09) y búsqueda (US-10), sobre los datos de
// db:seed:demo. En ese escenario Sofía Medina está a cargo de Lucía y Mateo Romero, de Carla.
const entorno = crearEntornoDeIntegracion();
const { app, prisma } = entorno;

const LUCIA = "lucia.gomez@example.com";
const MAYOR = "1995-04-20";
const MENOR = "2016-05-10";

const ANA = {
  nombre: "Ana",
  apellido: "López",
  dni: "40111222",
  email: "ana@example.com",
  fecha_nacimiento: MAYOR,
};
const TUTORA = {
  nombre: "Laura",
  apellido: "Pérez",
  dni: "30111222",
  telefono: "3794 112233",
  email: "laura.perez@example.com",
  fecha_nacimiento: "1985-03-02",
};
const TOMAS = { nombre: "Tomás", apellido: "Pérez", dni: "50111222", fecha_nacimiento: MENOR, tutor: TUTORA };

const CARLA = "carla.ruiz@example.com";
const DNI_SOFIA = "38111222";
const DNI_MATEO = "52111222";
const DNI_VALENTINA = "39222333";

let tokenMarina: string;
let datosDemo: Awaited<ReturnType<typeof cargarDatosDemo>>;

function como(token: string, metodo: "get" | "post" | "patch", ruta: string) {
  return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
}

function comoMarina(metodo: "get" | "post" | "patch", ruta: string) {
  return como(tokenMarina, metodo, ruta);
}

async function contarFilas() {
  return { usuarios: await prisma.usuarios.count(), alumnos: await prisma.alumnos.count() };
}

// El escenario de demostración ya trae alumnos (Sofía Medina y Mateo Romero): los tests cuentan
// contra lo que había antes o filtran por sus propios nombres.
beforeEach(async () => {
  await reiniciarBase(prisma);
  datosDemo = await cargarDatosDemo(prisma);
  tokenMarina = await entorno.iniciarSesion(EMAIL_MULTIROL_DEMO);
});
afterAll(() => entorno.cerrar());

describe("PI-15: pre-inscripción de un alumno mayor", () => {
  it("queda inactivo, sin roles y sin poder entrar hasta el primer pago", async () => {
    const respuesta = await comoMarina("post", "/alumnos").send(ANA);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toMatchObject({
      estado: "INACTIVO",
      responsable: null,
      usuario: { email: "ana@example.com" },
    });
    const alumno = await prisma.alumnos.findUnique({
      where: { id_alumno: respuesta.body.id_alumno },
      include: { usuario: { include: { roles: true } } },
    });
    expect(alumno?.estado).toBe("INACTIVO");
    expect(alumno?.usuario.estado).toBe("INACTIVO");
    expect(alumno?.usuario.roles).toEqual([]);
    const login = await request(app).post("/api/v1/auth/google").send({ id_token: "ana@example.com" });
    expect(login.status).toBe(403);
  });

  it("una profesora también da de alta alumnos", async () => {
    const tokenLucia = await entorno.iniciarSesion(LUCIA);

    const respuesta = await como(tokenLucia, "post", "/alumnos").send(ANA);

    expect(respuesta.status).toBe(201);
    expect(await prisma.alumnos.count({ where: { usuario: { email: "ana@example.com" } } })).toBe(1);
  });

  it("avisa con ALUMNO_EXISTENTE si el DNI ya es de un alumno, sin duplicarlo", async () => {
    const existente = await crearAlumno(prisma, { dni: "40111222" });
    const antes = await contarFilas();

    const respuesta = await comoMarina("post", "/alumnos").send(ANA);

    expect(respuesta.status).toBe(409);
    expect(JSON.stringify(respuesta.body)).toContain("ALUMNO_EXISTENTE");
    expect(JSON.stringify(respuesta.body)).toContain(`alumno ${existente.id_alumno}`);
    expect(await contarFilas()).toEqual(antes);
  });

  it("rechaza un email de otro usuario y un mayor sin email, sin guardar nada", async () => {
    const otro = await crearUsuario(prisma, { roles: [] });
    const antes = await contarFilas();

    const emailTomado = await comoMarina("post", "/alumnos").send({ ...ANA, email: otro.email });
    const sinEmail = await comoMarina("post", "/alumnos").send({ ...ANA, email: undefined });

    expect(emailTomado.status).toBe(409);
    expect(sinEmail.status).toBe(400);
    expect(await contarFilas()).toEqual(antes);
  });
});

describe("PI-16: alumno menor con tutor", () => {
  it("un menor sin tutor se rechaza y no se guarda nadie", async () => {
    const antes = await contarFilas();

    const respuesta = await comoMarina("post", "/alumnos").send({ ...TOMAS, tutor: undefined });

    expect(respuesta.status).toBe(400);
    expect(await contarFilas()).toEqual(antes);
  });

  it("un menor con tutor nuevo queda vinculado a un tutor inactivo hasta el primer pago", async () => {
    const respuesta = await comoMarina("post", "/alumnos").send(TOMAS);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.usuario.email).toBeNull();
    const tutora = await prisma.usuarios.findUnique({ where: { dni: "30111222" } });
    expect(tutora).toMatchObject({ email: "laura.perez@example.com", estado: "INACTIVO" });
    const alumno = await prisma.alumnos.findUnique({ where: { id_alumno: respuesta.body.id_alumno } });
    expect(alumno?.id_usuario_responsable).toBe(tutora?.id_usuario);
  });

  it("dos hermanos comparten el mismo tutor sin duplicarlo", async () => {
    await comoMarina("post", "/alumnos").send(TOMAS);

    const hermana = await comoMarina("post", "/alumnos").send({ ...TOMAS, nombre: "Sofía", dni: "50333444" });

    expect(hermana.status).toBe(201);
    expect(await prisma.usuarios.count({ where: { dni: "30111222" } })).toBe(1);
    const tutora = await prisma.usuarios.findUnique({ where: { dni: "30111222" } });
    expect(await prisma.alumnos.count({ where: { id_usuario_responsable: tutora?.id_usuario } })).toBe(2);
  });

  it("rechaza un menor con email y un tutor menor de edad, sin guardar nada", async () => {
    const antes = await contarFilas();

    const conEmail = await comoMarina("post", "/alumnos").send({ ...TOMAS, email: "tomas@example.com" });
    const tutorMenor = await comoMarina("post", "/alumnos").send({
      ...TOMAS,
      tutor: { ...TUTORA, fecha_nacimiento: "2010-01-01" },
    });

    expect(conEmail.status).toBe(400);
    expect(tutorMenor.status).toBe(400);
    expect(await contarFilas()).toEqual(antes);
  });
});

describe("PI-17: modificación de datos del alumno", () => {
  it("guarda el teléfono nuevo", async () => {
    const { body } = await comoMarina("post", "/alumnos").send(ANA);

    const respuesta = await comoMarina("patch", `/alumnos/${body.id_alumno}`).send({
      telefono: "3794 445566",
    });

    expect(respuesta.status).toBe(200);
    const usuario = await prisma.usuarios.findUnique({ where: { id_usuario: body.id_usuario } });
    expect(usuario?.telefono).toBe("3794 445566");
  });

  it("un menor que pasa a mayor necesita email, y con email se le quita el tutor", async () => {
    const { body } = await comoMarina("post", "/alumnos").send(TOMAS);

    const sinEmail = await comoMarina("patch", `/alumnos/${body.id_alumno}`).send({
      fecha_nacimiento: MAYOR,
    });
    const sigueConTutor = await prisma.alumnos.findUnique({ where: { id_alumno: body.id_alumno } });
    const conEmail = await comoMarina("patch", `/alumnos/${body.id_alumno}`).send({
      fecha_nacimiento: MAYOR,
      email: "tomas@example.com",
    });

    expect(sinEmail.status).toBe(400);
    expect(sigueConTutor?.id_usuario_responsable).not.toBeNull();
    expect(conEmail.status).toBe(200);
    const alumno = await prisma.alumnos.findUnique({ where: { id_alumno: body.id_alumno } });
    expect(alumno?.id_usuario_responsable).toBeNull();
  });

  it("rechaza un DNI que ya es de otro usuario y deja los datos como estaban", async () => {
    const { body } = await comoMarina("post", "/alumnos").send(ANA);
    await crearAlumno(prisma, { dni: "40999888" });

    const respuesta = await comoMarina("patch", `/alumnos/${body.id_alumno}`).send({ dni: "40999888" });

    expect(respuesta.status).toBe(409);
    const usuario = await prisma.usuarios.findUnique({ where: { id_usuario: body.id_usuario } });
    expect(usuario?.dni).toBe("40111222");
  });
});

describe("PI-18: búsqueda y consulta de alumnos", () => {
  async function buscar(query: string) {
    const respuesta = await comoMarina("get", `/alumnos?${query}`);
    expect(respuesta.status).toBe(200);
    return respuesta.body as { datos: { id_alumno: number }[]; total: number };
  }

  it("encuentra sin acentos ni mayúsculas, por el tutor y por DNI exacto", async () => {
    const perez = await crearAlumno(prisma, { nombre: "Juan", apellido: "Pérez", dni: "40222333" });
    const tutora = await crearUsuario(prisma, { roles: [] });
    await prisma.usuarios.update({ where: { id_usuario: tutora.id_usuario }, data: { apellido: "Giménez" } });
    const menor = await crearAlumno(prisma, {
      apellido: "Rossi",
      email: null,
      fecha_nacimiento: new Date(`${MENOR}T00:00:00Z`),
      id_usuario_responsable: tutora.id_usuario,
    });
    await crearAlumno(prisma, { apellido: "Gómez", dni: "40222334" });

    expect((await buscar("busqueda=PEREZ")).datos.map((a) => a.id_alumno)).toEqual([perez.id_alumno]);
    expect((await buscar("busqueda=gimenez")).datos.map((a) => a.id_alumno)).toEqual([menor.id_alumno]);
    expect((await buscar("dni=40222333")).datos.map((a) => a.id_alumno)).toEqual([perez.id_alumno]);
    expect(await buscar("dni=4022233")).toMatchObject({ datos: [], total: 0 });
    expect(await buscar("busqueda=zzz")).toMatchObject({ datos: [], total: 0 });
  });

  it("los dados de baja no aparecen salvo que se los pida", async () => {
    const activo = await crearAlumno(prisma, { nombre: "Filtro", apellido: "Activo", estado: "ACTIVO" });
    const baja = await crearAlumno(prisma, { nombre: "Filtro", apellido: "Baja", estado: "BAJA" });

    expect((await buscar("busqueda=filtro")).datos.map((a) => a.id_alumno)).toEqual([activo.id_alumno]);
    expect((await buscar("busqueda=filtro&incluirBajas=true")).datos.map((a) => a.id_alumno)).toEqual([
      activo.id_alumno,
      baja.id_alumno,
    ]);
  });

  it("pagina ordenando por apellido e informa el total", async () => {
    for (const apellido of ["Acosta", "Benítez", "Castro", "Díaz", "Escobar"]) {
      await crearAlumno(prisma, { nombre: "Paginado", apellido });
    }

    const segunda = await comoMarina("get", "/alumnos?busqueda=paginado&limit=2&offset=2");

    expect(segunda.body).toMatchObject({ total: 5, limit: 2, offset: 2 });
    expect(segunda.body.datos.map((a: { usuario: { apellido: string } }) => a.usuario.apellido)).toEqual([
      "Castro",
      "Díaz",
    ]);
  });
});

function idsDe(respuesta: { body: { datos: { id_alumno: number }[] } }): number[] {
  return respuesta.body.datos.map(({ id_alumno }) => id_alumno);
}

describe("PI-25: la profesora ve y edita solo a los alumnos a su cargo", () => {
  let tokenLucia: string;
  let sofia: number;
  let mateo: number;

  beforeEach(async () => {
    tokenLucia = await entorno.iniciarSesion(LUCIA);
    sofia = datosDemo.idAlumno.get(DNI_SOFIA)!;
    mateo = datosDemo.idAlumno.get(DNI_MATEO)!;
  });

  it("lista y abre la ficha solo de sus alumnos, con su plan y horarios", async () => {
    const listado = await como(tokenLucia, "get", "/alumnos");
    const fichaPropia = await como(tokenLucia, "get", `/alumnos/${sofia}`);
    const fichaAjena = await como(tokenLucia, "get", `/alumnos/${mateo}`);
    const filtroPorOtra = await como(
      tokenLucia,
      "get",
      `/alumnos?id_profesora=${datosDemo.idProfesora.get(CARLA)}`,
    );

    expect(idsDe(listado)).toEqual([sofia]);
    expect(listado.body.datos[0].inscripcion).toMatchObject({
      nombre_plan: "Básico",
      nombre_profesora: "Lucía Gómez",
    });
    expect(fichaPropia.status).toBe(200);
    expect(fichaPropia.body.inscripciones[0].horarios).toHaveLength(2);
    expect(fichaAjena.status).toBe(403);
    expect(filtroPorOtra.body).toMatchObject({ datos: [], total: 0 });
  });

  it("modifica contacto y observaciones de sus alumnos, y nada más", async () => {
    const contacto = await como(tokenLucia, "patch", `/alumnos/${sofia}`).send({
      telefono: "3794 445566",
      observaciones: "Lesión de rodilla",
    });
    const datoPersonal = await como(tokenLucia, "patch", `/alumnos/${sofia}`).send({ nombre: "Otra" });
    const alumnoAjeno = await como(tokenLucia, "patch", `/alumnos/${mateo}`).send({
      telefono: "3794 000000",
    });

    expect([contacto.status, datoPersonal.status, alumnoAjeno.status]).toEqual([200, 403, 403]);
    const usuarioSofia = await prisma.usuarios.findFirstOrThrow({ where: { dni: DNI_SOFIA } });
    expect(usuarioSofia).toMatchObject({ nombre: "Sofía", telefono: "3794 445566" });
    const usuarioMateo = await prisma.usuarios.findFirstOrThrow({ where: { dni: DNI_MATEO } });
    expect(usuarioMateo.telefono).toBeNull();
  });

  it("ve solo las inscripciones que tiene a cargo", async () => {
    const listado = await como(tokenLucia, "get", "/inscripciones");
    const ajena = await como(tokenLucia, "get", `/inscripciones/${datosDemo.idInscripcion.get(DNI_MATEO)}`);

    expect(listado.body.map((i: { id_alumno: number }) => i.id_alumno)).toEqual([sofia]);
    expect(ajena.status).toBe(403);
  });
});

describe("PI-26: filtros por inscripción y ficha completa para la propietaria", () => {
  it("filtra por plan, profesora y actividad, y un pre-inscripto sin inscripción sale sin plan", async () => {
    const sofia = datosDemo.idAlumno.get(DNI_SOFIA)!;
    const mateo = datosDemo.idAlumno.get(DNI_MATEO)!;
    const valentina = datosDemo.idAlumno.get(DNI_VALENTINA)!;
    const sinInscripcion = await crearAlumno(prisma, { nombre: "Sin", apellido: "Inscripción" });

    const porPlan = await comoMarina("get", `/alumnos?id_plan=${datosDemo.idPlan.get("Básico")}`);
    const porProfesora = await comoMarina("get", `/alumnos?id_profesora=${datosDemo.idProfesora.get(CARLA)}`);
    const porActividad = await comoMarina(
      "get",
      `/alumnos?id_actividad=${datosDemo.idActividad.get("ENTRENAMIENTO_PERS")}`,
    );
    const todos = await comoMarina("get", "/alumnos");

    expect(idsDe(porPlan)).toEqual([sofia]);
    expect(idsDe(porProfesora)).toEqual([valentina, mateo]);
    expect(idsDe(porActividad)).toEqual([valentina, mateo]);
    const fila = todos.body.datos.find(
      (a: { id_alumno: number }) => a.id_alumno === sinInscripcion.id_alumno,
    );
    expect(fila.inscripcion).toBeNull();
  });

  it("la ficha trae la inscripción vigente con plan, precio y horarios", async () => {
    const ficha = await comoMarina("get", `/alumnos/${datosDemo.idAlumno.get(DNI_MATEO)}`);

    expect(ficha.status).toBe(200);
    expect(ficha.body.inscripciones).toHaveLength(1);
    expect(ficha.body.inscripciones[0]).toMatchObject({
      estado: "PREINSCRIPTA",
      plan: { nombre: "Personalizado 2 días" },
      profesora: { usuario: { nombre: "Carla" } },
    });
    expect(ficha.body.inscripciones[0].horarios).toHaveLength(2);
  });
});

describe("PI-26 (escenario): el alumno activo de la demostración", () => {
  it("Valentina está activa, con su inscripción ACTIVA, y puede iniciar sesión", async () => {
    const ficha = await comoMarina("get", `/alumnos/${datosDemo.idAlumno.get(DNI_VALENTINA)}`);
    const login = await request(app)
      .post("/api/v1/auth/google")
      .send({ id_token: "valentina.herrera@example.com" });

    expect(ficha.body).toMatchObject({ estado: "ACTIVO", inscripciones: [{ estado: "ACTIVA" }] });
    expect(login.status).toBe(200);
    expect(login.body.usuario.roles.map((r: { rol: { codigo: string } }) => r.rol.codigo)).toEqual([
      "ALUMNO",
    ]);
  });
});

describe("PI-31: el tutor en el alta de un menor", () => {
  const PAULA = {
    nombre: "Paula",
    apellido: "Romero",
    dni: "31222333",
    telefono: "3794 445566",
    email: "paula.romero@example.com",
    fecha_nacimiento: "1984-06-21",
  };
  const MENOR_NUEVO = { nombre: "Lola", apellido: "Romero", fecha_nacimiento: MENOR };

  it("una profesora no elige como tutor una cuenta existente por su id", async () => {
    const tokenLucia = await entorno.iniciarSesion(LUCIA);
    const marina = await prisma.usuarios.findUniqueOrThrow({ where: { email: EMAIL_MULTIROL_DEMO } });
    const antes = await contarFilas();

    const respuesta = await como(tokenLucia, "post", "/alumnos").send({
      ...MENOR_NUEVO,
      tutor: { id_usuario: marina.id_usuario },
    });

    expect(respuesta.status).toBe(403);
    expect(await contarFilas()).toEqual(antes);
  });

  it("con el DNI y el email de la misma tutora se reusa su cuenta, y la profesora ve solo su nombre", async () => {
    const tokenLucia = await entorno.iniciarSesion(LUCIA);
    const paula = await prisma.usuarios.findUniqueOrThrow({ where: { email: PAULA.email } });
    const antes = await contarFilas();

    const respuesta = await como(tokenLucia, "post", "/alumnos").send({ ...MENOR_NUEVO, tutor: PAULA });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.responsable).toEqual({
      id_usuario: paula.id_usuario,
      nombre: "Paula",
      apellido: "Romero",
    });
    expect(await contarFilas()).toEqual({ usuarios: antes.usuarios + 1, alumnos: antes.alumnos + 1 });
  });

  it("si el DNI es de una cuenta y el email de otra, rechaza sin guardar nada", async () => {
    const antes = await contarFilas();

    const respuesta = await comoMarina("post", "/alumnos").send({
      ...MENOR_NUEVO,
      tutor: { ...PAULA, email: EMAIL_MULTIROL_DEMO },
    });

    expect(respuesta.status).toBe(409);
    expect(await contarFilas()).toEqual(antes);
  });
});
