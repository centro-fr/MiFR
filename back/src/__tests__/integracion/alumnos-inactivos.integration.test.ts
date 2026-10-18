import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO, type DatosDemoCargados } from "../../shared/db/datos-demo.js";
import { fechaActualArgentina } from "../../shared/utils/fecha-argentina.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { UN_DIA_EN_MS } from "./cobro.js";
import { crearEntornoDeIntegracion } from "./entorno.js";

// Casos PI-69 y PI-70: la detección de alumnos inactivos con la cuota al día (US-22) sobre los datos de
// db:seed:demo. Valentina Herrera está activa en el Intermedio (5 días de gracia), con Carla Ruiz, y su
// primera cuota paga; Sofía Medina sigue pre-inscripta. Las clases se cargan cerradas en la base.
const entorno = crearEntornoDeIntegracion();
const { prisma } = entorno;
const DNI_VALENTINA = "39222333";
const DNI_SOFIA = "38111222";
const RUTA = "/informes/alumnos-inactivos";
let datos: DatosDemoCargados;
let idInscripcion: number;
let idHorario: number;
let diaDeClase: number;

beforeEach(async () => {
  await reiniciarBase(prisma);
  datos = await cargarDatosDemo(prisma);
  idInscripcion = datos.idInscripcion.get(DNI_VALENTINA)!;
  const { id_horario } = await prisma.inscripcion_horarios.findFirstOrThrow({
    where: { id_inscripcion: idInscripcion },
  });
  idHorario = id_horario;
  diaDeClase = 0;
  await cuotaVenceEn(10);
});

afterAll(() => entorno.cerrar());

async function pedir(
  metodo: "get" | "put" | "delete",
  ruta: string,
  cuerpo?: object,
  email = EMAIL_MULTIROL_DEMO,
) {
  const token = await entorno.iniciarSesion(email);
  const pedido = request(entorno.app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  return cuerpo ? pedido.send(cuerpo) : pedido;
}

async function cuotaVenceEn(dias: number): Promise<void> {
  await prisma.cuotas.updateMany({
    where: { id_inscripcion: idInscripcion },
    data: { fecha_vencimiento: new Date(fechaActualArgentina().getTime() + dias * UN_DIA_EN_MS) },
  });
}

// Cada clase un día después de la anterior, desde el 01/09/2026: el orden de las marcas es el de las clases.
async function clases(marcas: boolean[], estado: "DICTADA" | "PROGRAMADA" = "DICTADA"): Promise<void> {
  const { id_alumno } = await prisma.inscripciones.findUniqueOrThrow({
    where: { id_inscripcion: idInscripcion },
  });
  const { id_profesora } = await prisma.horarios.findUniqueOrThrow({ where: { id_horario: idHorario } });
  for (const asistio of marcas) {
    const fecha_clase = new Date(Date.UTC(2026, 8, 1 + diaDeClase++));
    const { id_clase } = await prisma.clases.create({
      data: { id_horario: idHorario, fecha_clase, id_prof_dictante: id_profesora, estado },
    });
    await prisma.asistencias.create({
      data: { id_clase, id_alumno, id_inscripcion: idInscripcion, asistio, fecha_registro: new Date() },
    });
  }
}

async function listar(query = "") {
  const respuesta = await pedir("get", `${RUTA}${query}`);
  expect(respuesta.status).toBe(200);
  return respuesta.body as { datos: Record<string, unknown>[]; total: number; umbral: number };
}

describe("PI-69: la detección de alumnos inactivos con la cuota al día", () => {
  it("con 3 ausencias seguidas en clases cerradas aparece con su racha, su última asistencia y su contacto", async () => {
    await clases([true, false, false, false]);
    await clases([false], "PROGRAMADA");

    const { datos: filas, total, umbral } = await listar();

    expect({ total, umbral }).toEqual({ total: 1, umbral: 3 });
    expect(filas[0]).toMatchObject({
      id_inscripcion: idInscripcion,
      alumno: { nombre: "Valentina", apellido: "Herrera", email: "valentina.herrera@example.com" },
      tutor: null,
      profesora: { id_profesora: datos.idProfesora.get("carla.ruiz@example.com") },
      plan: { nombre: "Intermedio" },
      estado_cuota: "AL_DIA",
      inasistencias_consecutivas: 3,
      fecha_ultima_asistencia: "2026-09-01T00:00:00.000Z",
      gestion: { estado: "PENDIENTE", fecha_registro: null },
    });
  });

  it("no aparece con ausencias cortadas por una asistencia ni con menos clases que el umbral", async () => {
    await clases([false, false]);
    expect((await listar()).total).toBe(0);

    await clases([true, false, false]);
    expect((await listar()).total).toBe(0);
  });

  it("con la cuota vencida no aparece; en los días de gracia aparece por vencer", async () => {
    await clases([false, false, false]);

    await cuotaVenceEn(-10);
    expect((await listar()).total).toBe(0);

    await cuotaVenceEn(-3);
    const { datos: filas } = await listar();
    expect(filas[0]).toMatchObject({ estado_cuota: "POR_VENCER", fecha_ultima_asistencia: null });
  });

  it("el umbral sale de INASISTENCIAS_CONSECUTIVAS_INACTIVO y el filtro solo lo sube", async () => {
    await clases([false, false, false]);

    expect((await listar("?minimo_inasistencias=4")).total).toBe(0);
    await prisma.parametros_sistema.update({
      where: { clave: "INASISTENCIAS_CONSECUTIVAS_INACTIVO" },
      data: { valor: "4" },
    });
    expect(await listar("?minimo_inasistencias=2")).toMatchObject({ total: 0, umbral: 4 });
    await clases([false]);
    expect((await listar(`?id_plan=${datos.idPlan.get("Intermedio")}`)).total).toBe(1);
    expect((await listar(`?id_plan=${datos.idPlan.get("Básico")}`)).total).toBe(0);
  });
});

describe("PI-70: la gestión de los inactivos", () => {
  it("la marca se muestra, los ignorados se ocultan y la marca vence si vuelve a asistir", async () => {
    await clases([false, false, false]);
    const contactado = await pedir("put", `${RUTA}/${idInscripcion}/seguimiento`, { estado: "CONTACTADO" });
    expect(contactado.status).toBe(200);
    expect((await listar()).datos[0]).toMatchObject({ gestion: { estado: "CONTACTADO" } });

    await pedir("put", `${RUTA}/${idInscripcion}/seguimiento`, { estado: "IGNORADO" });
    expect((await listar()).total).toBe(0);
    expect((await listar("?estado_gestion=IGNORADO")).total).toBe(1);
    expect(await prisma.seguimientos_inactividad.count()).toBe(1);

    await clases([true]);
    await prisma.asistencias.updateMany({
      where: { id_inscripcion: idInscripcion, asistio: true },
      data: { fecha_registro: new Date(Date.now() + 60_000) },
    });
    await clases([false, false, false]);
    expect((await listar()).datos[0]).toMatchObject({
      gestion: { estado: "PENDIENTE", fecha_registro: null },
    });
  });

  it("quitar la marca la borra, y una segunda vez responde 404", async () => {
    await pedir("put", `${RUTA}/${idInscripcion}/seguimiento`, { estado: "GESTIONADO" });

    expect((await pedir("delete", `${RUTA}/${idInscripcion}/seguimiento`)).status).toBe(204);
    expect(await prisma.seguimientos_inactividad.count()).toBe(0);
    expect((await pedir("delete", `${RUTA}/${idInscripcion}/seguimiento`)).status).toBe(404);
  });

  it("no marca una pre-inscripción; una profesora recibe 403 y sin sesión 401, sin cambios en la base", async () => {
    const preinscripta = datos.idInscripcion.get(DNI_SOFIA)!;
    expect((await pedir("put", `${RUTA}/${preinscripta}/seguimiento`, { estado: "IGNORADO" })).status).toBe(
      404,
    );

    const lucia = "lucia.gomez@example.com";
    expect((await pedir("get", RUTA, undefined, lucia)).status).toBe(403);
    expect(
      (await pedir("put", `${RUTA}/${idInscripcion}/seguimiento`, { estado: "IGNORADO" }, lucia)).status,
    ).toBe(403);
    expect((await request(entorno.app).get(`/api/v1${RUTA}`)).status).toBe(401);
    expect(await prisma.seguimientos_inactividad.count()).toBe(0);
  });
});
