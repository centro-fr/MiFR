import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO, type DatosDemoCargados } from "../../shared/db/datos-demo.js";
import { fechaActualArgentina } from "../../shared/utils/fecha-argentina.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";

// Casos PI-11 a PI-14 del plan de pruebas de integración: planes (US-11) y sus precios con
// vigencia (US-12), sobre los datos de db:seed:demo.
const entorno = crearEntornoDeIntegracion();
const { app, prisma } = entorno;

const LUCIA = "lucia.gomez@example.com";
const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;
const BASICO = {
  tipo: "MENSUAL",
  nombre: "Básico 2 días",
  clases_por_semana: 2,
  dias_gracia: 5,
  precio: 25000,
};

let datos: DatosDemoCargados;
let tokenMarina: string;
let hoy: Date;

function enDias(dias: number): Date {
  return new Date(hoy.getTime() + dias * UN_DIA_EN_MS);
}

function diaIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function como(token: string, metodo: "get" | "post" | "patch" | "delete", ruta: string) {
  return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
}

function comoMarina(metodo: "get" | "post" | "patch" | "delete", ruta: string) {
  return como(tokenMarina, metodo, ruta);
}

async function crearBasico(): Promise<number> {
  const respuesta = await comoMarina("post", "/planes").send(BASICO);
  expect(respuesta.status).toBe(201);
  return respuesta.body.id_plan as number;
}

// El escenario de demostración ya trae planes: los tests comparan contra lo que había antes.
async function contarPlanesYPrecios() {
  return { planes: await prisma.planes.count(), precios: await prisma.plan_precios.count() };
}

function idsDe(planes: { id_plan: number }[]): number[] {
  return planes.map((plan) => plan.id_plan);
}

function preciosEnLaBase(idPlan: number) {
  return prisma.plan_precios.findMany({
    where: { id_plan: idPlan },
    orderBy: { fecha_vigencia_desde: "asc" },
  });
}

beforeEach(async () => {
  await reiniciarBase(prisma);
  datos = await cargarDatosDemo(prisma);
  tokenMarina = await entorno.iniciarSesion(EMAIL_MULTIROL_DEMO);
  hoy = fechaActualArgentina();
});
afterAll(() => entorno.cerrar());

describe("PI-11: alta de plan con su precio inicial", () => {
  it("crea el plan con un único precio vigente desde hoy", async () => {
    const respuesta = await comoMarina("post", "/planes").send(BASICO);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toMatchObject({
      nombre: "Básico 2 días",
      fecha_baja: null,
      precio_vigente: { precio: 25000, fecha_vigencia_hasta: null },
      precio_programado: null,
    });
    const precios = await preciosEnLaBase(respuesta.body.id_plan);
    expect(precios).toHaveLength(1);
    expect(precios[0].precio.toNumber()).toBe(25000);
    expect(precios[0].fecha_vigencia_desde).toEqual(hoy);
    expect(precios[0].fecha_vigencia_hasta).toBeNull();
  });

  it("rechaza un plan exclusivo de una actividad dada de baja y no guarda nada", async () => {
    const idActividad = datos.idActividad.get("FUNCIONAL") as number;
    await prisma.actividades.update({ where: { id_actividad: idActividad }, data: { activo: false } });
    const antes = await contarPlanesYPrecios();

    const respuesta = await comoMarina("post", "/planes").send({
      ...BASICO,
      id_actividad_exclusiva: idActividad,
    });

    expect(respuesta.status).toBe(400);
    expect(await contarPlanesYPrecios()).toEqual(antes);
  });

  it("rechaza un nombre que ya usa otro plan vigente, sin distinguir mayúsculas", async () => {
    await crearBasico();

    const respuesta = await comoMarina("post", "/planes").send({ ...BASICO, nombre: "BÁSICO 2 DÍAS" });

    expect(respuesta.status).toBe(409);
    expect(
      await prisma.planes.count({ where: { nombre: { equals: "básico 2 días", mode: "insensitive" } } }),
    ).toBe(1);
  });

  it("la base aplica las restricciones del DER aunque se saltee la API", async () => {
    await expect(
      prisma.planes.create({
        data: {
          tipo: "CLASE_SUELTA",
          nombre: "Clase",
          clases_por_semana: 2,
          dias_gracia: 0,
          profesora_unica: false,
        },
      }),
    ).rejects.toThrow(/ck_planes_x3/);
    const idPlan = await crearBasico();
    await expect(
      prisma.plan_precios.create({ data: { id_plan: idPlan, precio: 0, fecha_vigencia_desde: hoy } }),
    ).rejects.toThrow(/ck_plan_precios_x1/);
  });
});

describe("PI-12: modificación y baja de planes", () => {
  it("cambia la frecuencia semanal y queda guardada", async () => {
    const idPlan = await crearBasico();

    const respuesta = await comoMarina("patch", `/planes/${idPlan}`).send({ clases_por_semana: 3 });

    expect(respuesta.status).toBe(200);
    const plan = await prisma.planes.findUnique({ where: { id_plan: idPlan } });
    expect(plan?.clases_por_semana).toBe(3);
  });

  it("la baja es lógica: el plan sale del listado y vuelve a aparecer al pedir los dados de baja", async () => {
    const idPlan = await crearBasico();

    const baja = await comoMarina("delete", `/planes/${idPlan}`);
    const vigentes = await comoMarina("get", "/planes");
    const todos = await comoMarina("get", "/planes?incluirBajas=true");

    expect(baja.status).toBe(200);
    const plan = await prisma.planes.findUnique({ where: { id_plan: idPlan } });
    expect(plan?.fecha_baja).toEqual(hoy);
    expect(await prisma.plan_precios.count({ where: { id_plan: idPlan } })).toBe(1);
    expect(idsDe(vigentes.body)).not.toContain(idPlan);
    expect(idsDe(todos.body)).toContain(idPlan);
  });

  it("no se da de baja dos veces ni se edita un plan dado de baja", async () => {
    const idPlan = await crearBasico();
    await comoMarina("delete", `/planes/${idPlan}`);

    const segundaBaja = await comoMarina("delete", `/planes/${idPlan}`);
    const edicion = await comoMarina("patch", `/planes/${idPlan}`).send({ clases_por_semana: 3 });

    expect(segundaBaja.status).toBe(409);
    expect(edicion.status).toBe(404);
    const plan = await prisma.planes.findUnique({ where: { id_plan: idPlan } });
    expect(plan?.clases_por_semana).toBe(2);
  });
});

describe("PI-13: actualización de precio con fecha de vigencia", () => {
  it("un aumento futuro cierra el precio actual el día anterior y queda programado", async () => {
    const idPlan = await crearBasico();

    const respuesta = await comoMarina("post", `/planes/${idPlan}/precios`).send({
      precio: 28000,
      fecha_vigencia_desde: diaIso(enDias(30)),
    });

    expect(respuesta.status).toBe(201);
    const precios = await preciosEnLaBase(idPlan);
    expect(precios.map((p) => [p.precio.toNumber(), p.fecha_vigencia_desde, p.fecha_vigencia_hasta])).toEqual(
      [
        [25000, hoy, enDias(29)],
        [28000, enDias(30), null],
      ],
    );
    const plan = await comoMarina("get", `/planes/${idPlan}`);
    expect(plan.body.precio_vigente.precio).toBe(25000);
    expect(plan.body.precio_programado.precio).toBe(28000);
    const historial = await comoMarina("get", `/planes/${idPlan}/precios`);
    expect(historial.body.map((p: { precio: number }) => p.precio)).toEqual([28000, 25000]);
  });

  it("un aumento anterior al programado lo reemplaza, porque el programado nunca rigió", async () => {
    const idPlan = await crearBasico();
    await comoMarina("post", `/planes/${idPlan}/precios`).send({
      precio: 28000,
      fecha_vigencia_desde: diaIso(enDias(30)),
    });

    const respuesta = await comoMarina("post", `/planes/${idPlan}/precios`).send({
      precio: 27000,
      fecha_vigencia_desde: diaIso(enDias(10)),
    });

    expect(respuesta.status).toBe(201);
    const precios = await preciosEnLaBase(idPlan);
    expect(precios.map((p) => [p.precio.toNumber(), p.fecha_vigencia_desde, p.fecha_vigencia_hasta])).toEqual(
      [
        [25000, hoy, enDias(9)],
        [27000, enDias(10), null],
      ],
    );
  });

  it("rechaza una fecha de vigencia pasada sin tocar los precios", async () => {
    const idPlan = await crearBasico();

    const respuesta = await comoMarina("post", `/planes/${idPlan}/precios`).send({
      precio: 28000,
      fecha_vigencia_desde: diaIso(enDias(-1)),
    });

    expect(respuesta.status).toBe(400);
    const precios = await preciosEnLaBase(idPlan);
    expect(precios).toHaveLength(1);
    expect(precios[0].fecha_vigencia_hasta).toBeNull();
  });

  it("rechaza un segundo precio que empiece el mismo día que el vigente desde hoy", async () => {
    const idPlan = await crearBasico();

    const respuesta = await comoMarina("post", `/planes/${idPlan}/precios`).send({
      precio: 28000,
      fecha_vigencia_desde: diaIso(hoy),
    });

    expect(respuesta.status).toBe(409);
    const precios = await preciosEnLaBase(idPlan);
    expect(precios.map((p) => [p.precio.toNumber(), p.fecha_vigencia_hasta])).toEqual([[25000, null]]);
  });

  it("rechaza actualizar el precio de un plan dado de baja", async () => {
    const idPlan = await crearBasico();
    await comoMarina("delete", `/planes/${idPlan}`);

    const respuesta = await comoMarina("post", `/planes/${idPlan}/precios`).send({
      precio: 28000,
      fecha_vigencia_desde: diaIso(enDias(30)),
    });

    expect(respuesta.status).toBe(409);
    expect(await prisma.plan_precios.count({ where: { id_plan: idPlan } })).toBe(1);
  });
});

describe("PI-14: permisos sobre planes", () => {
  it("una profesora ve los planes, que necesita para pre-inscribir alumnos", async () => {
    const idPlan = await crearBasico();
    const tokenLucia = await entorno.iniciarSesion(LUCIA);

    const listado = await como(tokenLucia, "get", "/planes");
    const precios = await como(tokenLucia, "get", `/planes/${idPlan}/precios`);

    expect(listado.status).toBe(200);
    expect(idsDe(listado.body)).toContain(idPlan);
    expect(precios.status).toBe(200);
  });

  it("una profesora no puede crear planes ni cargar precios", async () => {
    const idPlan = await crearBasico();
    const tokenLucia = await entorno.iniciarSesion(LUCIA);
    const antes = await contarPlanesYPrecios();

    const alta = await como(tokenLucia, "post", "/planes").send({ ...BASICO, nombre: "Premium" });
    const precio = await como(tokenLucia, "post", `/planes/${idPlan}/precios`).send({
      precio: 28000,
      fecha_vigencia_desde: diaIso(enDias(30)),
    });

    expect(alta.status).toBe(403);
    expect(precio.status).toBe(403);
    expect(await contarPlanesYPrecios()).toEqual(antes);
  });
});
