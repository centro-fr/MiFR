import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO } from "../../shared/db/datos-demo.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";
import {
  crearAlumno,
  crearHorarioDePrueba,
  crearInscripcionDePrueba,
  crearPlan,
  crearUsuario,
} from "./fabricas.js";

// Casos PI-60 a PI-63: las suplencias entre profesoras (US-24). El reloj queda fijo el lunes
// 12/10/2026 a las 15:00 de Argentina, como en los casos de asistencia. La clase de Lucía de los
// lunes de 20:00 a 21:00 es la que se suple; Marina registra, porque es la propietaria.
const entorno = crearEntornoDeIntegracion();
const { prisma } = entorno;
const LUCIA = "lucia.gomez@example.com";
const CARLA = "carla.ruiz@example.com";
const MARINA = EMAIL_MULTIROL_DEMO;
const HOY = "2026-10-12";
const AHORA = new Date("2026-10-12T18:00:00Z");
// La base pone fecha_alta con el reloj real, que no se simula: se fija antes del lunes simulado.
const ALTA_DE_LOS_HORARIOS = new Date("2026-01-01T00:00:00Z");

interface Escenario {
  idHorario: number;
  idHorarioDeCarla: number;
  idActividad: number;
  idLucia: number;
  idCarla: number;
  idMarina: number;
  idAlumno: number;
}

let escenario: Escenario;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AHORA);
  await reiniciarBase(prisma);
  escenario = await armarEscenario();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => entorno.cerrar());

async function armarEscenario(): Promise<Escenario> {
  const datos = await cargarDatosDemo(prisma);
  const idLucia = datos.idProfesora.get(LUCIA)!;
  const idCarla = datos.idProfesora.get(CARLA)!;
  const idMarina = datos.idProfesora.get(MARINA)!;
  const idActividad = datos.idActividad.get("FUNCIONAL")!;
  const lunes = { dia_semana: 1, fecha_alta: ALTA_DE_LOS_HORARIOS };
  const { id_horario: idHorario } = await crearHorarioDePrueba(prisma, {
    ...lunes,
    id_actividad: idActividad,
    id_profesora: idLucia,
    hora_inicio: "20:00",
    hora_fin: "21:00",
  });
  const { id_horario: idHorarioDeCarla } = await crearHorarioDePrueba(prisma, {
    ...lunes,
    id_actividad: datos.idActividad.get("KID_FIT")!,
    id_profesora: idCarla,
    hora_inicio: "07:00",
    hora_fin: "08:00",
  });

  const { id_alumno: idAlumno } = await crearAlumno(prisma, { apellido: "Acosta", estado: "ACTIVO" });
  await crearInscripcionDePrueba(prisma, {
    id_alumno: idAlumno,
    plan: await crearPlan(prisma, { nombre: "Plan de suplencias" }),
    id_profesora: idLucia,
    id_horario: idHorario,
  });

  return { idHorario, idHorarioDeCarla, idActividad, idLucia, idCarla, idMarina, idAlumno };
}

async function pedir(
  metodo: "get" | "post" | "put" | "patch" | "delete",
  ruta: string,
  email: string,
  cuerpo?: object,
) {
  const token = await entorno.iniciarSesion(email);
  const pedido = request(entorno.app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  return cuerpo ? pedido.send(cuerpo) : pedido;
}

function registrar(cambios: object = {}, email = MARINA) {
  return pedir("post", "/suplencias", email, {
    id_horario: escenario.idHorario,
    fecha_clase: HOY,
    id_profesora_suplente: escenario.idCarla,
    motivo: "Turno médico",
    ...cambios,
  });
}

function claseDelLunes(fecha = HOY) {
  return prisma.clases.findUnique({
    where: {
      id_horario_fecha_clase: {
        id_horario: escenario.idHorario,
        fecha_clase: new Date(`${fecha}T00:00:00Z`),
      },
    },
  });
}

async function idUsuario(email: string): Promise<number> {
  return (await prisma.usuarios.findUniqueOrThrow({ where: { email } })).id_usuario;
}

describe("PI-60: registro de una suplencia y asistencia de la suplente", () => {
  it("L-01 la propietaria registra la suplencia: Lucía queda ausente y Carla dicta la clase", async () => {
    const respuesta = await registrar();

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.advertencia).toBeNull();
    expect(respuesta.body.suplencia).toMatchObject({
      id_prof_ausente: escenario.idLucia,
      motivo: "Turno médico",
      clase: { id_prof_dictante: escenario.idCarla, estado: "PROGRAMADA" },
    });
    const clase = await claseDelLunes();
    expect(clase?.id_prof_dictante).toBe(escenario.idCarla);
    expect(await prisma.suplencias.findMany()).toEqual([
      expect.objectContaining({
        id_clase: clase?.id_clase,
        id_prof_ausente: escenario.idLucia,
        id_usuario_registra: await idUsuario(MARINA),
      }),
    ]);
  });

  it("L-02 la suplente ve la clase entre las de hoy y toma la asistencia", async () => {
    await registrar();
    const { id_clase: idClase } = (await claseDelLunes())!;

    const deHoy = await pedir("get", "/clases/hoy", CARLA);
    const marcado = await pedir("put", `/clases/${idClase}/asistencia/${escenario.idAlumno}`, CARLA, {
      asistio: true,
    });

    expect(deHoy.body.map(({ id_clase }: { id_clase: number }) => id_clase)).toContain(idClase);
    expect(marcado.status).toBe(200);
    expect(await prisma.asistencias.findMany({ where: { id_clase: idClase } })).toEqual([
      expect.objectContaining({
        id_alumno: escenario.idAlumno,
        asistio: true,
        id_usuario_registra: await idUsuario(CARLA),
      }),
    ]);
  });

  it("L-03 la titular ya no ve la clase ni puede tomarle asistencia", async () => {
    await registrar();
    const { id_clase: idClase } = (await claseDelLunes())!;

    const deHoy = await pedir("get", "/clases/hoy", LUCIA);
    const lista = await pedir("get", `/clases/${idClase}/asistencia`, LUCIA);

    expect(deHoy.body.map(({ id_clase }: { id_clase: number }) => id_clase)).not.toContain(idClase);
    expect(lista.status).toBe(404);
  });
});

describe("PI-61: lo que el registro rechaza", () => {
  async function sinSuplencias() {
    expect(await prisma.suplencias.count()).toBe(0);
  }

  it("L-04 rechaza con 400 que la suplente sea la titular, sin cambiar quién dicta", async () => {
    const respuesta = await registrar({ id_profesora_suplente: escenario.idLucia });

    expect(respuesta.status).toBe(400);
    await sinSuplencias();
    expect((await claseDelLunes())?.id_prof_dictante).toBe(escenario.idLucia);
  });

  it("L-05 rechaza con 409 una suplente dada de baja", async () => {
    const { id_usuario } = await crearUsuario(prisma, { roles: ["PROFESORA"] });
    const { id_profesora: idDeBaja } = await prisma.profesoras.create({
      data: { id_usuario, fecha_baja: new Date("2026-10-01T00:00:00Z") },
    });

    const respuesta = await registrar({ id_profesora_suplente: idDeBaja });

    expect(respuesta.status).toBe(409);
    await sinSuplencias();
    expect(await claseDelLunes()).toBeNull();
  });

  it("L-06 rechaza con 400 una fecha que no es del día del horario, sin crear la clase", async () => {
    const respuesta = await registrar({ fecha_clase: "2026-10-13" });

    expect(respuesta.status).toBe(400);
    await sinSuplencias();
    expect(await prisma.clases.count({ where: { id_horario: escenario.idHorario } })).toBe(0);
  });

  it("L-07 rechaza con 409 una clase que ya tiene suplencia, sin cambiar la suplente", async () => {
    await registrar();

    const respuesta = await registrar({ id_profesora_suplente: escenario.idMarina });

    expect(respuesta.status).toBe(409);
    expect(await prisma.suplencias.count()).toBe(1);
    expect((await claseDelLunes())?.id_prof_dictante).toBe(escenario.idCarla);
  });

  it("L-08 rechaza con 409 una clase cancelada", async () => {
    await prisma.clases.create({
      data: {
        id_horario: escenario.idHorario,
        fecha_clase: new Date(`${HOY}T00:00:00Z`),
        id_prof_dictante: escenario.idLucia,
        estado: "CANCELADA",
      },
    });

    const respuesta = await registrar();

    expect(respuesta.status).toBe(409);
    await sinSuplencias();
    expect((await claseDelLunes())?.id_prof_dictante).toBe(escenario.idLucia);
  });

  it("L-09 una profesora no registra suplencias aunque tenga el permiso", async () => {
    // La matriz no deja otorgarle HONORARIOS_LIQUIDAR (es exclusivo): se carga directo en la base para
    // probar que la ruta exige además el rol.
    const [profesora, liquidar] = await Promise.all([
      prisma.roles.findUniqueOrThrow({ where: { codigo: "PROFESORA" } }),
      prisma.permisos.findUniqueOrThrow({ where: { codigo: "HONORARIOS_LIQUIDAR" } }),
    ]);
    await prisma.rol_permisos.create({ data: { id_rol: profesora.id_rol, id_permiso: liquidar.id_permiso } });

    const respuesta = await registrar({}, LUCIA);

    expect(respuesta.status).toBe(403);
    await sinSuplencias();
    expect(await claseDelLunes()).toBeNull();
  });

  it("L-10 de dos registros simultáneos de la misma clase, uno se guarda y el otro responde 409", async () => {
    // La sesión se abre antes: dos primeros logins simultáneos competirían por vincular la cuenta de Google.
    const token = await entorno.iniciarSesion(MARINA);
    const registrarCon = (idSuplente: number) =>
      request(entorno.app)
        .post("/api/v1/suplencias")
        .set("Authorization", `Bearer ${token}`)
        .send({ id_horario: escenario.idHorario, fecha_clase: HOY, id_profesora_suplente: idSuplente });

    const respuestas = await Promise.all([registrarCon(escenario.idCarla), registrarCon(escenario.idMarina)]);

    expect(respuestas.map(({ status }) => status).sort()).toEqual([201, 409]);
    const [suplencia] = await prisma.suplencias.findMany();
    expect(await prisma.suplencias.count()).toBe(1);
    expect(suplencia?.id_prof_ausente).toBe(escenario.idLucia);
  });
});

describe("PI-62: cambio y baja de la suplencia", () => {
  it("L-11 cambiar la suplente la pone a dictar y conserva a la titular como ausente", async () => {
    await registrar();
    const { id_clase: idClase } = (await claseDelLunes())!;

    const respuesta = await pedir("patch", `/suplencias/${idClase}`, MARINA, {
      id_profesora_suplente: escenario.idMarina,
    });

    expect(respuesta.status).toBe(200);
    expect((await claseDelLunes())?.id_prof_dictante).toBe(escenario.idMarina);
    expect(await prisma.suplencias.findMany()).toEqual([
      expect.objectContaining({
        id_clase: idClase,
        id_prof_ausente: escenario.idLucia,
        motivo: "Turno médico",
      }),
    ]);
  });

  it("L-12 eliminarla devuelve la clase a la titular, y eliminarla otra vez responde 404", async () => {
    await registrar();
    const { id_clase: idClase } = (await claseDelLunes())!;

    const primera = await pedir("delete", `/suplencias/${idClase}`, MARINA);
    const segunda = await pedir("delete", `/suplencias/${idClase}`, MARINA);

    expect(primera.status).toBe(204);
    expect(segunda.status).toBe(404);
    expect(await prisma.suplencias.count()).toBe(0);
    expect((await claseDelLunes())?.id_prof_dictante).toBe(escenario.idLucia);
  });

  it("L-13 una suplencia a futuro crea la clase y se registra con una advertencia", async () => {
    const respuesta = await registrar({ fecha_clase: "2026-10-19" });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.advertencia).toContain("todavía no se dictó");
    expect(await claseDelLunes("2026-10-19")).toMatchObject({
      estado: "PROGRAMADA",
      id_prof_dictante: escenario.idCarla,
    });
  });
});

describe("PI-63: listado y clases suplidas del período", () => {
  // Carla suple a Lucía hoy, y Marina suple a Carla el lunes anterior en otra actividad.
  async function registrarDos() {
    await registrar();
    await registrar({
      id_horario: escenario.idHorarioDeCarla,
      fecha_clase: "2026-10-05",
      id_profesora_suplente: escenario.idMarina,
    });
  }

  function fechas(respuesta: request.Response): string[] {
    return respuesta.body.map(({ clase }: { clase: { fecha_clase: string } }) =>
      clase.fecha_clase.slice(0, 10),
    );
  }

  it("L-14 filtra por profesora titular o suplente, por actividad y por fechas, de la más nueva a la más vieja", async () => {
    await registrarDos();

    const todas = await pedir("get", "/suplencias", MARINA);
    const deCarla = await pedir("get", `/suplencias?id_profesora=${escenario.idCarla}`, MARINA);
    const deLucia = await pedir("get", `/suplencias?id_profesora=${escenario.idLucia}`, MARINA);
    const funcional = await pedir("get", `/suplencias?id_actividad=${escenario.idActividad}`, MARINA);
    const desdeEl10 = await pedir("get", "/suplencias?desde=2026-10-10", MARINA);

    expect(fechas(todas)).toEqual([HOY, "2026-10-05"]);
    expect(fechas(deCarla)).toEqual([HOY, "2026-10-05"]);
    expect(fechas(deLucia)).toEqual([HOY]);
    expect(fechas(funcional)).toEqual([HOY]);
    expect(fechas(desdeEl10)).toEqual([HOY]);
  });

  it("L-15 IInfoClases da las clases suplidas del período con suplente y ausente, sin las canceladas", async () => {
    await registrarDos();
    const octubre = [new Date("2026-10-01T00:00:00Z"), new Date("2026-10-31T00:00:00Z")] as const;

    const suplidas = await entorno.infoClases.listarSuplidasEnPeriodo(...octubre);
    const desdeEl10 = await entorno.infoClases.listarSuplidasEnPeriodo(
      new Date("2026-10-10T00:00:00Z"),
      octubre[1],
    );
    await prisma.clases.updateMany({
      where: { id_horario: escenario.idHorarioDeCarla },
      data: { estado: "CANCELADA" },
    });
    const sinCanceladas = await entorno.infoClases.listarSuplidasEnPeriodo(...octubre);

    expect(suplidas).toEqual([
      expect.objectContaining({
        fecha_clase: new Date("2026-10-05T00:00:00Z"),
        id_horario: escenario.idHorarioDeCarla,
        id_prof_suplente: escenario.idMarina,
        id_prof_ausente: escenario.idCarla,
        hora_inicio: new Date("1970-01-01T07:00:00Z"),
        hora_fin: new Date("1970-01-01T08:00:00Z"),
      }),
      expect.objectContaining({
        fecha_clase: new Date(`${HOY}T00:00:00Z`),
        id_prof_suplente: escenario.idCarla,
        id_prof_ausente: escenario.idLucia,
      }),
    ]);
    expect(desdeEl10).toHaveLength(1);
    expect(sinCanceladas.map(({ id_prof_ausente }) => id_prof_ausente)).toEqual([escenario.idLucia]);
  });
});
