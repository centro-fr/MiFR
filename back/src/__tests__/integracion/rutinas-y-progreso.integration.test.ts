import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";
import {
  crearActividad,
  crearAlumno,
  crearHorarioDePrueba,
  crearInscripcionDePrueba,
  crearPlan,
  crearProfesora,
  crearUsuario,
  darRol,
} from "./fabricas.js";

// Casos PI-83 a PI-85: la carga y el historial de rutinas (US-27), su consulta por el alumno, el tutor y la
// profesora (US-28) y el registro de la evolución física (US-27 y US-28). Ana es una alumna adulta y Caro una
// menor con su tutor, las dos a cargo de la profesora Paula; Beto es alumno de otra profesora, Pilar.
const entorno = crearEntornoDeIntegracion();
const { prisma } = entorno;
const INICIO = new Date("2026-10-01T00:00:00Z");

const CONTENIDO = {
  dias: [{ nombre: "Día 1", ejercicios: [{ nombre: "Sentadilla", series: 3, repeticiones: "10" }] }],
};

let emailPropietaria: string;
let emailPaula: string;
let emailPilar: string;
let emailTutor: string;
let idPaula: number;
let idPilar: number;
let ana: { id_alumno: number; email: string };
let caro: { id_alumno: number };
let beto: { id_alumno: number; email: string };

async function alumnoDelPortal(
  nombre: string,
  apellido: string,
  opciones: Parameters<typeof crearAlumno>[1] = {},
): Promise<{ id_alumno: number; id_usuario: number; email: string }> {
  const alumno = await crearAlumno(prisma, { nombre, apellido, estado: "ACTIVO", ...opciones });
  await darRol(prisma, alumno.id_usuario, "ALUMNO");
  const { email } = await prisma.usuarios.findUniqueOrThrow({ where: { id_usuario: alumno.id_usuario } });
  return { ...alumno, email: email ?? "" };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T15:00:00Z"));
  await reiniciarBase(prisma);

  emailPropietaria = (await crearUsuario(prisma, { roles: ["PROPIETARIA"] })).email;
  const tutor = await crearUsuario(prisma, { roles: ["TUTOR"] });
  emailTutor = tutor.email;
  const paula = await crearProfesora(prisma);
  const pilar = await crearProfesora(prisma);
  ({ id_profesora: idPaula, email: emailPaula } = paula);
  ({ id_profesora: idPilar, email: emailPilar } = pilar);

  const { id_actividad } = await crearActividad(prisma);
  const horarioPaula = await crearHorarioDePrueba(prisma, {
    id_actividad,
    id_profesora: idPaula,
    dia_semana: 1,
    hora_inicio: "18:00",
    hora_fin: "19:00",
    fecha_alta: INICIO,
  });
  const horarioPilar = await crearHorarioDePrueba(prisma, {
    id_actividad,
    id_profesora: idPilar,
    dia_semana: 2,
    hora_inicio: "18:00",
    hora_fin: "19:00",
    fecha_alta: INICIO,
  });
  const plan = await crearPlan(prisma);

  ana = await alumnoDelPortal("Ana", "Paz");
  const caroCompleta = await alumnoDelPortal("Caro", "Sosa", {
    email: null,
    fecha_nacimiento: new Date("2014-05-10T00:00:00Z"),
    id_usuario_responsable: tutor.id_usuario,
  });
  caro = caroCompleta;
  beto = await alumnoDelPortal("Beto", "Ruiz");

  for (const [alumno, idProfesora, idHorario] of [
    [ana, idPaula, horarioPaula.id_horario],
    [caro, idPaula, horarioPaula.id_horario],
    [beto, idPilar, horarioPilar.id_horario],
  ] as const) {
    await crearInscripcionDePrueba(prisma, {
      id_alumno: alumno.id_alumno,
      plan,
      id_profesora: idProfesora,
      id_horario: idHorario,
      fecha_inicio: INICIO,
    });
  }
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => entorno.cerrar());

async function pedir(
  metodo: "get" | "post" | "patch" | "delete",
  ruta: string,
  email?: string,
  cuerpo?: object,
) {
  const peticion = request(entorno.app)[metodo](`/api/v1${ruta}`);
  if (email) peticion.set("Authorization", `Bearer ${await entorno.iniciarSesion(email)}`);
  return cuerpo ? peticion.send(cuerpo) : peticion;
}

const rutina = (id_alumno: number, extra: object = {}) => ({
  id_alumno,
  nombre: "Adaptación Fuerza",
  fecha_desde: "2026-11-01",
  contenido: CONTENIDO,
  ...extra,
});

describe("PI-83: carga de rutinas y historial (US-27)", () => {
  it("la profesora a cargo carga la rutina a su nombre y queda vigente", async () => {
    const respuesta = await pedir("post", "/rutinas", emailPaula, rutina(ana.id_alumno));

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toMatchObject({ id_alumno: ana.id_alumno, id_profesora: idPaula, activa: true });
    expect(respuesta.body.contenido).toEqual({
      dias: [
        {
          nombre: "Día 1",
          ejercicios: [{ nombre: "Sentadilla", series: 3, repeticiones: "10", notas: null }],
        },
      ],
    });
  });

  it("la rutina nueva reemplaza a la vigente, que pasa al historial con su fecha de fin", async () => {
    await pedir("post", "/rutinas", emailPaula, rutina(ana.id_alumno, { nombre: "Mes 1" }));
    await pedir(
      "post",
      "/rutinas",
      emailPaula,
      rutina(ana.id_alumno, { nombre: "Mes 2", fecha_desde: "2026-12-01" }),
    );

    const historial = await pedir("get", `/alumnos/${ana.id_alumno}/rutinas`, emailPaula);
    const vigente = await pedir("get", `/alumnos/${ana.id_alumno}/rutinas/vigente`, emailPaula);

    expect(historial.body.map((r: { nombre: string }) => r.nombre)).toEqual(["Mes 2", "Mes 1"]);
    expect(historial.body[1]).toMatchObject({ activa: false, fecha_hasta: "2026-11-30T00:00:00.000Z" });
    expect(vigente.body).toMatchObject({ nombre: "Mes 2", activa: true, fecha_hasta: null });
  });

  it("una rutina que empieza el mismo día que la anterior no rompe el CHECK de fechas", async () => {
    await pedir("post", "/rutinas", emailPaula, rutina(ana.id_alumno, { nombre: "Primera" }));
    const segunda = await pedir("post", "/rutinas", emailPaula, rutina(ana.id_alumno, { nombre: "Segunda" }));

    const anterior = await prisma.rutinas.findFirstOrThrow({ where: { nombre: "Primera" } });
    expect(segunda.status).toBe(201);
    expect(anterior.activa).toBe(false);
    expect(anterior.fecha_hasta).toEqual(anterior.fecha_desde);
  });

  it("dos cargas a la vez dejan una sola rutina vigente", async () => {
    const respuestas = await Promise.all([
      pedir(
        "post",
        "/rutinas",
        emailPaula,
        rutina(ana.id_alumno, { nombre: "A", fecha_desde: "2026-11-01" }),
      ),
      pedir(
        "post",
        "/rutinas",
        emailPaula,
        rutina(ana.id_alumno, { nombre: "B", fecha_desde: "2026-11-02" }),
      ),
    ]);

    expect(respuestas.map((r) => r.status)).toEqual([201, 201]);
    expect(await prisma.rutinas.count({ where: { id_alumno: ana.id_alumno } })).toBe(2);
    expect(await prisma.rutinas.count({ where: { id_alumno: ana.id_alumno, activa: true } })).toBe(1);
  });

  it("una profesora no puede cargar la rutina de un alumno que no tiene a cargo", async () => {
    const respuesta = await pedir("post", "/rutinas", emailPilar, rutina(ana.id_alumno));

    expect(respuesta.status).toBe(403);
    expect(await prisma.rutinas.count()).toBe(0);
  });

  it("la propietaria carga a nombre de la profesora que indica y debe indicarla", async () => {
    const sinProfesora = await pedir("post", "/rutinas", emailPropietaria, rutina(ana.id_alumno));
    const conProfesora = await pedir(
      "post",
      "/rutinas",
      emailPropietaria,
      rutina(ana.id_alumno, { id_profesora: idPaula }),
    );

    expect(sinProfesora.status).toBe(400);
    expect(conProfesora.status).toBe(201);
    expect(conProfesora.body.id_profesora).toBe(idPaula);
  });

  it.each([
    ["el alumno", () => ana.email],
    ["el tutor", () => emailTutor],
  ])("%s no puede cargar rutinas", async (_quien, email) => {
    const respuesta = await pedir("post", "/rutinas", email(), rutina(caro.id_alumno));

    expect(respuesta.status).toBe(403);
    expect(await prisma.rutinas.count()).toBe(0);
  });

  it.each([
    [
      "una serie en cero",
      {
        contenido: {
          dias: [{ nombre: "Día 1", ejercicios: [{ nombre: "X", series: 0, repeticiones: "10" }] }],
        },
      },
    ],
    ["una fecha de fin anterior al inicio", { fecha_hasta: "2026-10-01" }],
    ["un día sin ejercicios", { contenido: { dias: [{ nombre: "Día 1", ejercicios: [] }] } }],
  ])("rechaza %s y no guarda nada", async (_caso, cambio) => {
    const respuesta = await pedir("post", "/rutinas", emailPaula, rutina(ana.id_alumno, cambio));

    expect(respuesta.status).toBe(400);
    expect(await prisma.rutinas.count()).toBe(0);
  });

  it("responde 401 sin sesión", async () => {
    expect((await pedir("post", "/rutinas", undefined, rutina(ana.id_alumno))).status).toBe(401);
  });
});

describe("PI-84: consulta de la rutina por alumno, tutor y profesora (US-28)", () => {
  beforeEach(async () => {
    await pedir("post", "/rutinas", emailPaula, rutina(ana.id_alumno, { nombre: "De Ana" }));
    await pedir("post", "/rutinas", emailPaula, rutina(caro.id_alumno, { nombre: "De Caro" }));
    await pedir("post", "/rutinas", emailPilar, rutina(beto.id_alumno, { nombre: "De Beto" }));
  });

  it("la alumna ve su rutina vigente y su historial", async () => {
    const vigente = await pedir("get", `/alumnos/${ana.id_alumno}/rutinas/vigente`, ana.email);
    const historial = await pedir("get", `/alumnos/${ana.id_alumno}/rutinas`, ana.email);

    expect(vigente.status).toBe(200);
    expect(vigente.body.nombre).toBe("De Ana");
    expect(historial.body).toHaveLength(1);
  });

  it("el tutor ve la rutina de su menor a cargo", async () => {
    const respuesta = await pedir("get", `/alumnos/${caro.id_alumno}/rutinas/vigente`, emailTutor);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.nombre).toBe("De Caro");
  });

  it.each([
    ["una alumna ve la de otro alumno", () => ana.email, () => beto.id_alumno],
    ["el tutor ve la de un alumno que no es su menor", () => emailTutor, () => ana.id_alumno],
    ["una profesora ve la de un alumno que no tiene a cargo", () => emailPilar, () => ana.id_alumno],
  ])("responde 403 si %s", async (_caso, email, idAlumno) => {
    const vigente = await pedir("get", `/alumnos/${idAlumno()}/rutinas/vigente`, email());
    const historial = await pedir("get", `/alumnos/${idAlumno()}/rutinas`, email());

    expect(vigente.status).toBe(403);
    expect(historial.status).toBe(403);
  });

  it("la profesora ve las de sus alumnos y la propietaria las de todos", async () => {
    const paula = await pedir("get", `/alumnos/${ana.id_alumno}/rutinas/vigente`, emailPaula);
    const propietaria = await pedir("get", `/alumnos/${beto.id_alumno}/rutinas/vigente`, emailPropietaria);

    expect(paula.body.nombre).toBe("De Ana");
    expect(propietaria.body.nombre).toBe("De Beto");
  });

  it("un alumno sin rutina responde 200 con null", async () => {
    await prisma.rutinas.deleteMany({ where: { id_alumno: ana.id_alumno } });

    const respuesta = await pedir("get", `/alumnos/${ana.id_alumno}/rutinas/vigente`, ana.email);
    const historial = await pedir("get", `/alumnos/${ana.id_alumno}/rutinas`, ana.email);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toBeNull();
    expect(historial.body).toEqual([]);
  });

  it("un alumno inexistente responde 404 a la propietaria y 403 a quien no puede verlo", async () => {
    const propietaria = await pedir("get", "/alumnos/9999/rutinas/vigente", emailPropietaria);
    const alumna = await pedir("get", "/alumnos/9999/rutinas/vigente", ana.email);

    expect(propietaria.status).toBe(404);
    expect(alumna.status).toBe(403);
  });

  it("responde 401 sin sesión", async () => {
    expect((await pedir("get", `/alumnos/${ana.id_alumno}/rutinas/vigente`)).status).toBe(401);
  });
});

describe("PI-85: registro de la evolución física (US-27, US-28)", () => {
  const medicion = (id_alumno: number, extra: object = {}) => ({
    id_alumno,
    medidas: [
      { codigo: "PESO", valor: 62.5 },
      { codigo: "CINTURA", valor: 70 },
    ],
    ...extra,
  });

  it("la profesora a cargo registra varias medidas juntas, con la unidad del catálogo", async () => {
    const respuesta = await pedir("post", "/progreso", emailPaula, medicion(ana.id_alumno));

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toMatchObject({ id_alumno: ana.id_alumno, id_profesora: idPaula });
    expect(respuesta.body.medidas).toEqual([
      { codigo: "PESO", unidad: "kg", valor: 62.5 },
      { codigo: "CINTURA", unidad: "cm", valor: 70 },
    ]);
    expect(await prisma.medidas_corporales.count()).toBe(2);
  });

  it.each([
    ["un valor en cero", { medidas: [{ codigo: "PESO", valor: 0 }] }],
    ["un valor negativo", { medidas: [{ codigo: "PESO", valor: -3 }] }],
    ["un peso fuera de rango", { medidas: [{ codigo: "PESO", valor: 900 }] }],
    [
      "una medida repetida",
      {
        medidas: [
          { codigo: "PESO", valor: 60 },
          { codigo: "PESO", valor: 61 },
        ],
      },
    ],
    ["una medida que no existe", { medidas: [{ codigo: "ALTURA", valor: 165 }] }],
    ["una fecha futura", { fecha: "2026-10-28" }],
  ])("rechaza %s y no guarda ningún registro", async (_caso, cambio) => {
    const respuesta = await pedir("post", "/progreso", emailPaula, medicion(ana.id_alumno, cambio));

    expect(respuesta.status).toBe(400);
    expect(await prisma.registros_progreso.count({ where: { id_alumno: ana.id_alumno } })).toBe(0);
    expect(await prisma.medidas_corporales.count()).toBe(0);
  });

  it("una profesora no puede registrar a un alumno que no tiene a cargo, ni el alumno a sí mismo", async () => {
    const otraProfesora = await pedir("post", "/progreso", emailPilar, medicion(ana.id_alumno));
    const elAlumno = await pedir("post", "/progreso", ana.email, medicion(ana.id_alumno));

    expect(otraProfesora.status).toBe(403);
    expect(elAlumno.status).toBe(403);
    expect(await prisma.registros_progreso.count({ where: { id_alumno: ana.id_alumno } })).toBe(0);
  });

  it("el alumno ve su evolución de la más reciente a la más antigua", async () => {
    await pedir("post", "/progreso", emailPaula, medicion(ana.id_alumno, { fecha: "2026-10-01" }));
    await pedir("post", "/progreso", emailPaula, {
      id_alumno: ana.id_alumno,
      fecha: "2026-10-20",
      medidas: [{ codigo: "PESO", valor: 61 }],
    });

    const respuesta = await pedir("get", `/alumnos/${ana.id_alumno}/progreso`, ana.email);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.map((r: { fecha: string }) => r.fecha.slice(0, 10))).toEqual([
      "2026-10-20",
      "2026-10-01",
    ]);
  });

  it("el tutor ve la evolución de su menor y nadie ve la de un alumno ajeno", async () => {
    await pedir("post", "/progreso", emailPaula, medicion(caro.id_alumno));

    const tutor = await pedir("get", `/alumnos/${caro.id_alumno}/progreso`, emailTutor);
    const ajena = await pedir("get", `/alumnos/${caro.id_alumno}/progreso`, beto.email);
    const otraProfesora = await pedir("get", `/alumnos/${caro.id_alumno}/progreso`, emailPilar);

    expect(tutor.body).toHaveLength(1);
    expect(ajena.status).toBe(403);
    expect(otraProfesora.status).toBe(403);
  });

  it("un alumno sin mediciones responde 200 con una lista vacía", async () => {
    const respuesta = await pedir("get", `/alumnos/${ana.id_alumno}/progreso`, ana.email);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([]);
  });

  it("responde 401 sin sesión", async () => {
    expect((await pedir("get", `/alumnos/${ana.id_alumno}/progreso`)).status).toBe(401);
  });
});
