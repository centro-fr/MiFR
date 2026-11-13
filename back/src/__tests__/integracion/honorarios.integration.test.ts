import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";
import {
  crearActividad,
  crearAlumno,
  crearClase,
  crearHorarioDePrueba,
  crearInscripcionDePrueba,
  crearPlan,
  crearProfesora,
  crearUsuario,
  type PlanDePrueba,
} from "./fabricas.js";

// Casos PI-78 a PI-82 y PI-86: las liquidaciones, las tarifas y el cierre mensual de los honorarios
// (US-23). El reloj queda fijo el lunes 12/10/2026 a las 15:00 de Argentina y se liquida septiembre, un
// mes ya cerrado. Para que listar no cierre septiembre solo, el día de cierre queda en 28 salvo en PI-86.
//
// Regla vigente: cada profesora recibe un porcentaje (50 %) de lo cobrado en el mes por sus alumnos; la
// hora de suplencia es un monto fijo. Si la inscripción tiene promoción, lo cobrado se lleva a precio de
// lista (PI-91). Escenario de septiembre (tarifas desde el 01/01/2026), sin promociones:
//   Lucía: 50 % general y 40 % para el plan Intermedio (la del plan gana). Acosta (Inicial) cobró $20000
//   en el mes: $10000. Benítez (Intermedio) cobró $20000 el 10/09: $8000 (el pago de agosto y el pendiente
//   no cuentan). Farías (baja el 20/09) cobró $10000 el 05/09: $5000. La clase del 07/09 la dictó Carla:
//   -$2500. No cuentan: Cruz (sin cargo, aunque pagó), Díaz (pre-inscripta) y Espinoza (baja sin pagos).
//   Total: $20500.
//   Carla: 50 % general. Gómez cobró $30000: $15000, más $2500 de la clase suplida (una hora a $2500).
//   Total: $17500.
//   Rita: sin movimientos ni tarifas. Total: $0. Total general: $38000.
const entorno = crearEntornoDeIntegracion();
const { prisma } = entorno;
const AHORA = new Date("2026-10-12T18:00:00Z");
const ALTA_DE_LOS_HORARIOS = new Date("2026-01-01T00:00:00Z");
const VIGENCIA_DE_LAS_TARIFAS = new Date("2026-01-01T00:00:00Z");
const INICIO_DE_LAS_INSCRIPCIONES = new Date("2026-08-15T00:00:00Z");
const SEPTIEMBRE = "2026-09";

interface Profesora {
  id_profesora: number;
  email: string;
}

interface Escenario {
  propietaria: { id_usuario: number; email: string };
  lucia: Profesora;
  carla: Profesora;
  rita: Profesora;
  idActividad: number;
  idHorarioLucia: number;
  planInicial: PlanDePrueba;
  planIntermedio: PlanDePrueba;
  inscripcion: Record<"acosta" | "benitez" | "cruz" | "diaz" | "espinoza" | "farias" | "gomez", number>;
  tarifa: Record<"luciaGeneral" | "luciaIntermedio" | "carlaGeneral" | "carlaSuplencia", number>;
  idClaseSuplida: number;
}

let escenario: Escenario;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AHORA);
  await reiniciarBase(prisma);
  await fijarDiaDeCierre(28);
  escenario = await armarEscenario();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => entorno.cerrar());

async function pedir(
  metodo: "get" | "post",
  ruta: string,
  email: string = escenario.propietaria.email,
  cuerpo?: object,
) {
  const token = await entorno.iniciarSesion(email);
  const pedido = request(entorno.app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  return cuerpo ? pedido.send(cuerpo) : pedido;
}

async function fijarDiaDeCierre(dia: number): Promise<void> {
  await prisma.parametros_sistema.update({
    where: { clave: "DIA_CIERRE_HONORARIOS" },
    data: { valor: String(dia) },
  });
}

function generar(periodo: string = SEPTIEMBRE, email?: string) {
  return pedir("post", "/liquidaciones", email, { periodo });
}

async function inscribir(
  apellido: string,
  profesora: Profesora,
  idHorario: number,
  plan: PlanDePrueba,
  cambios: { estado?: "PREINSCRIPTA" | "ACTIVA" | "BAJA"; fecha_inicio?: Date } = {},
): Promise<number> {
  const { id_alumno } = await crearAlumno(prisma, { apellido, estado: "ACTIVO" });
  const { id_inscripcion } = await crearInscripcionDePrueba(prisma, {
    id_alumno,
    plan,
    id_profesora: profesora.id_profesora,
    id_horario: idHorario,
    fecha_inicio: INICIO_DE_LAS_INSCRIPCIONES,
    ...cambios,
  });
  return id_inscripcion;
}

// Una cuota con su pago, directo en la base: la liquidación solo mira los pagos CONFIRMADOS por fecha.
async function cobrar(
  idInscripcion: number,
  monto: number,
  fechaPago: string,
  estado: "CONFIRMADO" | "PENDIENTE" = "CONFIRMADO",
): Promise<void> {
  const numero_cuota = (await prisma.cuotas.count({ where: { id_inscripcion: idInscripcion } })) + 1;
  const { id_cuota } = await prisma.cuotas.create({
    data: {
      id_inscripcion: idInscripcion,
      numero_cuota,
      fecha_vencimiento: new Date(fechaPago),
      monto,
    },
  });
  await prisma.pagos.create({
    data: {
      id_cuota,
      forma_pago: "EFECTIVO",
      estado,
      monto,
      fecha_pago: new Date(fechaPago),
      id_usuario_registra: escenario.propietaria.id_usuario,
      rendido: true,
    },
  });
}

async function crearTarifa(datos: {
  id_profesora: number;
  concepto: "ALUMNO_A_CARGO" | "HORA_SUPLENCIA";
  id_plan?: number | null;
  tipo_valor: "MONTO_FIJO" | "PORCENTAJE";
  valor: number;
}): Promise<number> {
  const { id_tarifa } = await prisma.tarifas_honorario.create({
    data: { id_plan: null, ...datos, fecha_vigencia_desde: VIGENCIA_DE_LAS_TARIFAS },
  });
  return id_tarifa;
}

async function suplir(fecha: string, idHorario: number, ausente: Profesora, suplente: Profesora) {
  const { id_clase } = await crearClase(prisma, {
    id_horario: idHorario,
    fecha_clase: new Date(`${fecha}T00:00:00Z`),
    id_prof_dictante: suplente.id_profesora,
  });
  await prisma.suplencias.create({
    data: {
      id_clase,
      id_prof_ausente: ausente.id_profesora,
      id_usuario_registra: escenario.propietaria.id_usuario,
    },
  });
  return id_clase;
}

async function armarEscenario(): Promise<Escenario> {
  const propietaria = await crearUsuario(prisma, { roles: ["PROPIETARIA"] });
  const lucia = await crearProfesora(prisma);
  const carla = await crearProfesora(prisma);
  const rita = await crearProfesora(prisma);
  const { id_actividad: idActividad } = await crearActividad(prisma);
  const lunes = { dia_semana: 1, fecha_alta: ALTA_DE_LOS_HORARIOS, id_actividad: idActividad };
  const { id_horario: idHorarioLucia } = await crearHorarioDePrueba(prisma, {
    ...lunes,
    id_profesora: lucia.id_profesora,
    hora_inicio: "20:00",
    hora_fin: "21:00",
  });
  const { id_horario: idHorarioCarla } = await crearHorarioDePrueba(prisma, {
    ...lunes,
    dia_semana: 2,
    id_profesora: carla.id_profesora,
    hora_inicio: "07:00",
    hora_fin: "08:00",
  });
  const planInicial = await crearPlan(prisma, { nombre: "Plan Inicial" });
  const planIntermedio = await crearPlan(prisma, { nombre: "Plan Intermedio" });
  escenario = { propietaria } as Escenario; // cobrar() y suplir() lo necesitan

  const inscripcion = {
    acosta: await inscribir("Acosta", lucia, idHorarioLucia, planInicial),
    benitez: await inscribir("Benítez", lucia, idHorarioLucia, planIntermedio),
    cruz: await inscribir("Cruz", lucia, idHorarioLucia, planInicial),
    diaz: await inscribir("Díaz", lucia, idHorarioLucia, planInicial, {
      estado: "PREINSCRIPTA",
      fecha_inicio: new Date("2026-09-05T00:00:00Z"),
    }),
    espinoza: await inscribir("Espinoza", lucia, idHorarioLucia, planInicial, { estado: "BAJA" }),
    farias: await inscribir("Farías", lucia, idHorarioLucia, planInicial, { estado: "BAJA" }),
    gomez: await inscribir("Gómez", carla, idHorarioCarla, planInicial),
  };
  await prisma.inscripciones.update({
    where: { id_inscripcion: inscripcion.cruz },
    data: { sin_cargo: true },
  });
  await prisma.inscripciones.update({
    where: { id_inscripcion: inscripcion.espinoza },
    data: { fecha_baja: new Date("2026-09-10T15:00:00Z") },
  });
  await prisma.inscripciones.update({
    where: { id_inscripcion: inscripcion.farias },
    data: { fecha_baja: new Date("2026-09-20T15:00:00Z") },
  });

  await cobrar(inscripcion.acosta, 20000, "2026-09-03T15:00:00Z");
  await cobrar(inscripcion.benitez, 20000, "2026-08-20T15:00:00Z"); // agosto: no es del período
  await cobrar(inscripcion.benitez, 20000, "2026-09-10T15:00:00Z");
  await cobrar(inscripcion.benitez, 10000, "2026-09-12T15:00:00Z", "PENDIENTE"); // sin confirmar: no cuenta
  await cobrar(inscripcion.farias, 10000, "2026-09-05T15:00:00Z"); // pagó antes de la baja del 20/09
  await cobrar(inscripcion.cruz, 20000, "2026-09-08T15:00:00Z"); // sin cargo: no genera honorarios
  await cobrar(inscripcion.gomez, 30000, "2026-09-04T15:00:00Z");

  const tarifa = {
    luciaGeneral: await crearTarifa({
      id_profesora: lucia.id_profesora,
      concepto: "ALUMNO_A_CARGO",
      tipo_valor: "PORCENTAJE",
      valor: 50,
    }),
    luciaIntermedio: await crearTarifa({
      id_profesora: lucia.id_profesora,
      concepto: "ALUMNO_A_CARGO",
      id_plan: planIntermedio.id_plan,
      tipo_valor: "PORCENTAJE",
      valor: 40,
    }),
    carlaGeneral: await crearTarifa({
      id_profesora: carla.id_profesora,
      concepto: "ALUMNO_A_CARGO",
      tipo_valor: "PORCENTAJE",
      valor: 50,
    }),
    carlaSuplencia: await crearTarifa({
      id_profesora: carla.id_profesora,
      concepto: "HORA_SUPLENCIA",
      tipo_valor: "MONTO_FIJO",
      valor: 2500,
    }),
  };
  const idClaseSuplida = await suplir("2026-09-07", idHorarioLucia, lucia, carla);

  return {
    propietaria,
    lucia,
    carla,
    rita,
    idActividad,
    idHorarioLucia,
    planInicial,
    planIntermedio,
    inscripcion,
    tarifa,
    idClaseSuplida,
  };
}

type FilaDeLiquidacion = {
  id_liquidacion: number;
  id_profesora: number;
  monto_total: number;
  estado: string;
};

function deLaProfesora(liquidaciones: FilaDeLiquidacion[], profesora: Profesora): FilaDeLiquidacion {
  return liquidaciones.find(({ id_profesora }) => id_profesora === profesora.id_profesora)!;
}

describe("PI-78: el cálculo de los honorarios del mes", () => {
  it("R-01 genera una liquidación en BORRADOR por profesora, con alumnos a cargo, porcentaje del plan y suplencia", async () => {
    const respuesta = await generar();

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      periodo: SEPTIEMBRE,
      total_general: 38000,
      advertencias: [],
      sin_recalcular: [],
    });
    const { liquidaciones } = respuesta.body;
    expect(liquidaciones).toHaveLength(3);
    expect(liquidaciones.map(({ estado }: FilaDeLiquidacion) => estado)).toEqual([
      "BORRADOR",
      "BORRADOR",
      "BORRADOR",
    ]);
    expect(deLaProfesora(liquidaciones, escenario.lucia).monto_total).toBe(20500);
    expect(deLaProfesora(liquidaciones, escenario.carla).monto_total).toBe(17500);
    expect(deLaProfesora(liquidaciones, escenario.rita).monto_total).toBe(0);

    const guardadas = await prisma.liquidaciones.findMany();
    expect(guardadas).toHaveLength(3);
    expect(guardadas[0]).toMatchObject({
      periodo_desde: new Date("2026-09-01T00:00:00Z"),
      periodo_hasta: new Date("2026-09-30T00:00:00Z"),
    });
    expect(await prisma.liquidacion_detalles.count()).toBe(6);
  });

  it("R-02 el detalle de Lucía separa lo de cada alumno y el descuento por la clase que suplió Carla", async () => {
    const { liquidaciones } = (await generar()).body;
    const idLucia = deLaProfesora(liquidaciones, escenario.lucia).id_liquidacion;

    const respuesta = await pedir("get", `/liquidaciones/${idLucia}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.monto_total).toBe(20500);
    expect(respuesta.body.detalles).toHaveLength(4);
    expect(respuesta.body.detalles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          concepto: "ALUMNO_A_CARGO",
          monto: 10000,
          id_tarifa: escenario.tarifa.luciaGeneral,
          alumno: expect.objectContaining({ apellido: "Acosta" }),
        }),
        expect.objectContaining({
          concepto: "ALUMNO_A_CARGO",
          monto: 8000,
          id_tarifa: escenario.tarifa.luciaIntermedio,
          alumno: expect.objectContaining({ apellido: "Benítez" }),
        }),
        expect.objectContaining({
          concepto: "ALUMNO_A_CARGO",
          monto: 5000,
          alumno: expect.objectContaining({ apellido: "Farías" }),
        }),
        expect.objectContaining({
          concepto: "DESCUENTO_AUSENCIA",
          monto: -2500,
          id_clase: escenario.idClaseSuplida,
          id_tarifa: escenario.tarifa.carlaSuplencia,
        }),
      ]),
    );
    const idCarla = deLaProfesora(liquidaciones, escenario.carla).id_liquidacion;
    const deCarla = await pedir("get", `/liquidaciones/${idCarla}`);
    expect(deCarla.body.detalles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          concepto: "CLASE_SUPLIDA",
          monto: 2500,
          id_clase: escenario.idClaseSuplida,
        }),
      ]),
    );
  });

  it("R-03 el listado del mes trae el total general y una fila por profesora; un id que no existe da 404", async () => {
    await generar();

    const listado = await pedir("get", `/liquidaciones?periodo=${SEPTIEMBRE}`);
    const otroMes = await pedir("get", "/liquidaciones?periodo=2026-08");

    expect(listado.status).toBe(200);
    expect(listado.body).toMatchObject({ periodo: SEPTIEMBRE, total_general: 38000 });
    expect(listado.body.liquidaciones).toHaveLength(3);
    expect(listado.body.liquidaciones[0].profesora.usuario).toEqual(
      expect.objectContaining({ nombre: expect.any(String), apellido: expect.any(String) }),
    );
    expect(otroMes.body).toMatchObject({ total_general: 0, liquidaciones: [] });
    expect((await pedir("get", "/liquidaciones/999999")).status).toBe(404);
    expect((await pedir("get", "/liquidaciones/abc")).status).toBe(400);
  });
});

describe("PI-79: lo que no genera honorarios y lo que no se puede calcular", () => {
  it("R-04 no liquidan el alumno sin cargo, la pre-inscripta ni la baja que nunca pagó; la baja que pagó sí", async () => {
    const { liquidaciones } = (await generar()).body;

    const detalles = await prisma.liquidacion_detalles.findMany({
      where: { id_inscripcion: { not: null } },
      select: { id_inscripcion: true },
    });
    const liquidadas = detalles.map(({ id_inscripcion }) => id_inscripcion);
    const { inscripcion } = escenario;

    expect(liquidadas).not.toContain(inscripcion.cruz);
    expect(liquidadas).not.toContain(inscripcion.diaz);
    expect(liquidadas).not.toContain(inscripcion.espinoza);
    expect(liquidadas).toContain(inscripcion.farias);
    expect(liquidadas).toHaveLength(4);
    expect(deLaProfesora(liquidaciones, escenario.lucia).monto_total).toBe(20500);
  });

  it("R-05 una tarifa del 50 % se aplica sobre lo cobrado confirmado dentro del mes", async () => {
    const { rita } = escenario;
    const { id_horario } = await crearHorarioDePrueba(prisma, {
      id_actividad: escenario.idActividad,
      id_profesora: rita.id_profesora,
      dia_semana: 3,
      hora_inicio: "09:00",
      hora_fin: "10:00",
      fecha_alta: ALTA_DE_LOS_HORARIOS,
    });
    const sosa = await inscribir("Sosa", rita, id_horario, escenario.planInicial);
    await crearTarifa({
      id_profesora: rita.id_profesora,
      concepto: "ALUMNO_A_CARGO",
      tipo_valor: "PORCENTAJE",
      valor: 50,
    });
    await cobrar(sosa, 20000, "2026-09-02T15:00:00Z");
    await cobrar(sosa, 5001, "2026-09-30T20:00:00Z"); // último día del mes, 17:00 de Argentina
    await cobrar(sosa, 30000, "2026-10-01T15:00:00Z"); // octubre: no cuenta

    const { liquidaciones } = (await generar()).body;

    expect(deLaProfesora(liquidaciones, rita).monto_total).toBe(12500.5);
  });

  it("R-06 sin tarifa no se genera la línea y la respuesta advierte cuál falta", async () => {
    const { rita, lucia } = escenario;
    const { id_horario } = await crearHorarioDePrueba(prisma, {
      id_actividad: escenario.idActividad,
      id_profesora: rita.id_profesora,
      dia_semana: 3,
      hora_inicio: "09:00",
      hora_fin: "10:00",
      fecha_alta: ALTA_DE_LOS_HORARIOS,
    });
    const sosa = await inscribir("Sosa", rita, id_horario, escenario.planInicial);
    const idClaseDeRita = await suplir("2026-09-14", escenario.idHorarioLucia, lucia, rita);

    const respuesta = await generar();

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.advertencias).toHaveLength(2);
    expect(respuesta.body.advertencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id_profesora: rita.id_profesora,
          concepto: "ALUMNO_A_CARGO",
          motivo: "SIN_TARIFA",
          id_inscripcion: sosa,
        }),
        expect.objectContaining({
          id_profesora: rita.id_profesora,
          concepto: "HORA_SUPLENCIA",
          motivo: "SIN_TARIFA",
          id_clase: idClaseDeRita,
        }),
      ]),
    );
    const { liquidaciones } = respuesta.body;
    expect(deLaProfesora(liquidaciones, rita).monto_total).toBe(0);
    expect(deLaProfesora(liquidaciones, lucia).monto_total).toBe(20500);
    expect(respuesta.body.total_general).toBe(38000);
  });
});

describe("PI-80: recalcular, cerrar y pagar una liquidación", () => {
  it("R-07 volver a generar el mes recalcula el borrador sin duplicarlo", async () => {
    await generar();
    await prisma.tarifas_honorario.update({
      where: { id_tarifa: escenario.tarifa.luciaGeneral },
      data: { valor: 60 },
    });

    const respuesta = await generar();

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.sin_recalcular).toEqual([]);
    expect(deLaProfesora(respuesta.body.liquidaciones, escenario.lucia).monto_total).toBe(23500);
    expect(respuesta.body.total_general).toBe(41000);
    expect(await prisma.liquidaciones.count()).toBe(3);
    expect(await prisma.liquidacion_detalles.count()).toBe(6);
  });

  it("R-08 la propietaria cierra y después paga; el estado queda en la base", async () => {
    const { liquidaciones } = (await generar()).body;
    const { id_liquidacion } = deLaProfesora(liquidaciones, escenario.lucia);

    const cerrada = await pedir("post", `/liquidaciones/${id_liquidacion}/cerrar`);
    const pagada = await pedir("post", `/liquidaciones/${id_liquidacion}/pagar`);

    expect(cerrada.status).toBe(200);
    expect(cerrada.body).toMatchObject({ estado: "CERRADA", monto_total: 20500 });
    expect(pagada.status).toBe(200);
    expect(pagada.body.estado).toBe("PAGADA");
    expect(pagada.body.detalles).toHaveLength(4);
    const fila = await prisma.liquidaciones.findUniqueOrThrow({ where: { id_liquidacion } });
    expect(fila.estado).toBe("PAGADA");
  });

  it("R-09 una liquidación cerrada es una foto: al regenerar el mes no se toca y se informa", async () => {
    const { liquidaciones } = (await generar()).body;
    const { id_liquidacion } = deLaProfesora(liquidaciones, escenario.lucia);
    await pedir("post", `/liquidaciones/${id_liquidacion}/cerrar`);
    await prisma.tarifas_honorario.update({
      where: { id_tarifa: escenario.tarifa.luciaGeneral },
      data: { valor: 60 },
    });
    await prisma.tarifas_honorario.update({
      where: { id_tarifa: escenario.tarifa.carlaGeneral },
      data: { valor: 80 },
    });

    const respuesta = await generar();

    expect(respuesta.body.sin_recalcular).toEqual([escenario.lucia.id_profesora]);
    const deLucia = deLaProfesora(respuesta.body.liquidaciones, escenario.lucia);
    expect(deLucia).toMatchObject({ estado: "CERRADA", monto_total: 20500 });
    expect(deLaProfesora(respuesta.body.liquidaciones, escenario.carla).monto_total).toBe(26500);
    expect(await prisma.liquidacion_detalles.count({ where: { id_liquidacion } })).toBe(4);
  });

  it("R-10 no se cierra dos veces, no se paga un borrador ni se cierra una pagada (409)", async () => {
    const { liquidaciones } = (await generar()).body;
    const lucia = deLaProfesora(liquidaciones, escenario.lucia).id_liquidacion;
    const carla = deLaProfesora(liquidaciones, escenario.carla).id_liquidacion;

    expect((await pedir("post", `/liquidaciones/${carla}/pagar`)).status).toBe(409);
    expect((await pedir("post", `/liquidaciones/${lucia}/cerrar`)).status).toBe(200);
    expect((await pedir("post", `/liquidaciones/${lucia}/cerrar`)).status).toBe(409);
    expect((await pedir("post", `/liquidaciones/${lucia}/pagar`)).status).toBe(200);
    expect((await pedir("post", `/liquidaciones/${lucia}/pagar`)).status).toBe(409);
    expect((await pedir("post", `/liquidaciones/${lucia}/cerrar`)).status).toBe(409);
    expect((await pedir("post", "/liquidaciones/999999/cerrar")).status).toBe(404);

    const estados = await prisma.liquidaciones.findMany({ orderBy: { id_liquidacion: "asc" } });
    expect(estados.find((fila) => fila.id_liquidacion === lucia)?.estado).toBe("PAGADA");
    expect(estados.find((fila) => fila.id_liquidacion === carla)?.estado).toBe("BORRADOR");
  });
});

describe("PI-81: períodos y permisos de las liquidaciones", () => {
  it("R-11 rechaza un período mal escrito o futuro; el mes en curso sí se liquida", async () => {
    for (const periodo of ["septiembre", "2026-13", "2026-9", "2026-11"]) {
      expect((await generar(periodo)).status).toBe(400);
    }
    expect((await pedir("post", "/liquidaciones", undefined, {})).status).toBe(400);
    expect(await prisma.liquidaciones.count()).toBe(0);

    const enCurso = await generar("2026-10");

    expect(enCurso.status).toBe(200);
    expect(enCurso.body.periodo).toBe("2026-10");
    expect(
      await prisma.liquidaciones.count({ where: { periodo_hasta: new Date("2026-10-31T00:00:00Z") } }),
    ).toBe(3);
  });

  it("R-12 la profesora, un alumno y quien no inició sesión no ven ni generan liquidaciones", async () => {
    const { id_liquidacion } = (await generar()).body.liquidaciones[0];
    const alumno = await crearUsuario(prisma, { roles: ["ALUMNO"] });

    for (const email of [escenario.lucia.email, alumno.email]) {
      expect((await pedir("get", `/liquidaciones?periodo=${SEPTIEMBRE}`, email)).status).toBe(403);
      expect((await pedir("get", `/liquidaciones/${id_liquidacion}`, email)).status).toBe(403);
      expect((await generar("2026-08", email)).status).toBe(403);
      expect((await pedir("post", `/liquidaciones/${id_liquidacion}/cerrar`, email)).status).toBe(403);
    }
    expect((await request(entorno.app).get(`/api/v1/liquidaciones?periodo=${SEPTIEMBRE}`)).status).toBe(401);
    expect(
      await prisma.liquidaciones.count({ where: { periodo_desde: new Date("2026-08-01T00:00:00Z") } }),
    ).toBe(0);
    const intacta = await prisma.liquidaciones.findUniqueOrThrow({ where: { id_liquidacion } });
    expect(intacta.estado).toBe("BORRADOR");
  });
});

describe("PI-82: las tarifas de honorarios", () => {
  function registrarTarifa(cambios: object = {}, email?: string) {
    return pedir("post", "/tarifas-honorario", email, {
      id_profesora: escenario.lucia.id_profesora,
      concepto: "ALUMNO_A_CARGO",
      id_plan: null,
      tipo_valor: "PORCENTAJE",
      valor: 60,
      fecha_vigencia_desde: "2026-11-01",
      ...cambios,
    });
  }

  it("R-13 una tarifa nueva cierra la vigente el día anterior y no cambia el mes ya liquidado", async () => {
    const respuesta = await registrarTarifa();

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toMatchObject({
      id_profesora: escenario.lucia.id_profesora,
      valor: 60,
      fecha_vigencia_hasta: null,
    });
    const anterior = await prisma.tarifas_honorario.findUniqueOrThrow({
      where: { id_tarifa: escenario.tarifa.luciaGeneral },
    });
    expect(anterior.fecha_vigencia_hasta).toEqual(new Date("2026-10-31T00:00:00Z"));
    const vigentes = await pedir(
      "get",
      `/tarifas-honorario?id_profesora=${escenario.lucia.id_profesora}&vigentes=true`,
    );
    expect(vigentes.status).toBe(200);
    expect(vigentes.body.map(({ valor }: { valor: number }) => valor)).toEqual(
      expect.arrayContaining([50, 60]),
    );
    const { liquidaciones } = (await generar()).body;
    expect(deLaProfesora(liquidaciones, escenario.lucia).monto_total).toBe(20500);
  });

  it("R-14 rechaza vigencias pasadas, valores inválidos, tipos que no corresponden al concepto y datos que no existen", async () => {
    const antes = await prisma.tarifas_honorario.count();
    const rechazadas = [
      { fecha_vigencia_desde: "2026-10-11" },
      { valor: 0 },
      { valor: 10.123 },
      { valor: 150 },
      { tipo_valor: "MONTO_FIJO", valor: 3500 }, // ALUMNO_A_CARGO solo admite porcentaje
      { concepto: "HORA_SUPLENCIA" }, // HORA_SUPLENCIA solo admite monto fijo
      {
        concepto: "HORA_SUPLENCIA",
        tipo_valor: "MONTO_FIJO",
        valor: 3000,
        id_plan: escenario.planInicial.id_plan,
      },
      { id_profesora: 999999 },
      { id_plan: 999999 },
    ];

    for (const cambios of rechazadas) {
      expect((await registrarTarifa(cambios)).status).toBe(400);
    }

    expect(await prisma.tarifas_honorario.count()).toBe(antes);
    const suplencia = await registrarTarifa({
      concepto: "HORA_SUPLENCIA",
      tipo_valor: "MONTO_FIJO",
      valor: 3000,
    });
    expect(suplencia.status).toBe(201);
  });

  it("R-15 cerrar una tarifa fija su último día; no se cierra en el pasado", async () => {
    const id = escenario.tarifa.luciaGeneral;

    expect(
      (await pedir("post", `/tarifas-honorario/${id}/cerrar`, undefined, { fecha_hasta: "2026-10-11" }))
        .status,
    ).toBe(400);
    const cerrada = await pedir("post", `/tarifas-honorario/${id}/cerrar`, undefined, {
      fecha_hasta: "2026-12-31",
    });
    const inexistente = await pedir("post", "/tarifas-honorario/999999/cerrar", undefined, {
      fecha_hasta: "2026-12-31",
    });

    expect(cerrada.status).toBe(200);
    expect(cerrada.body.fecha_vigencia_hasta).toBe("2026-12-31T00:00:00.000Z");
    expect(inexistente.status).toBe(404);
  });

  it("R-16 solo la propietaria ve, registra y cierra tarifas", async () => {
    const antes = await prisma.tarifas_honorario.count();

    expect((await pedir("get", "/tarifas-honorario", escenario.lucia.email)).status).toBe(403);
    expect((await registrarTarifa({}, escenario.lucia.email)).status).toBe(403);
    expect(
      (
        await pedir(
          "post",
          `/tarifas-honorario/${escenario.tarifa.luciaGeneral}/cerrar`,
          escenario.lucia.email,
          {
            fecha_hasta: "2026-12-31",
          },
        )
      ).status,
    ).toBe(403);
    expect((await request(entorno.app).get("/api/v1/tarifas-honorario")).status).toBe(401);

    expect(await prisma.tarifas_honorario.count()).toBe(antes);
    const intacta = await prisma.tarifas_honorario.findUniqueOrThrow({
      where: { id_tarifa: escenario.tarifa.luciaGeneral },
    });
    expect(intacta.fecha_vigencia_hasta).toBeNull();
  });
});

describe("PI-86: el cierre mensual automático de los honorarios", () => {
  it("R-17 desde el día de cierre recalcula y cierra el mes anterior; lo que ya estaba pagado no se toca", async () => {
    await fijarDiaDeCierre(5);
    const { liquidaciones } = (await generar()).body;
    const lucia = deLaProfesora(liquidaciones, escenario.lucia).id_liquidacion;
    await pedir("post", `/liquidaciones/${lucia}/cerrar`);
    await pedir("post", `/liquidaciones/${lucia}/pagar`);
    // Cada entorno es un proceso nuevo: no recuerda si ya cerró el mes.
    const proceso = crearEntornoDeIntegracion();

    const resumen = await proceso.cierreMensualHonorarios.cerrarMesAnterior(AHORA);
    const otraVez = await proceso.cierreMensualHonorarios.cerrarMesAnterior(AHORA);
    await proceso.cerrar();

    expect(resumen).toEqual({ periodo: SEPTIEMBRE, cerradas: 2 });
    expect(otraVez).toBeNull();
    const filas = await prisma.liquidaciones.findMany();
    expect(filas).toHaveLength(3);
    expect(filas.find((fila) => fila.id_liquidacion === lucia)?.estado).toBe("PAGADA");
    expect(filas.filter((fila) => fila.estado === "CERRADA")).toHaveLength(2);
    const deCarla = filas.find((fila) => fila.id_profesora === escenario.carla.id_profesora);
    expect(Number(deCarla?.monto_total)).toBe(17500);
  });

  it("R-18 antes del día de cierre no calcula nada; al llegar, listar el mes ya lo devuelve cerrado", async () => {
    await fijarDiaDeCierre(15);
    const proceso = crearEntornoDeIntegracion();

    const antes = await proceso.cierreMensualHonorarios.cerrarMesAnterior(AHORA);
    await proceso.cerrar();

    expect(antes).toBeNull();
    expect(await prisma.liquidaciones.count()).toBe(0);

    await fijarDiaDeCierre(12);
    const listado = await pedir("get", `/liquidaciones?periodo=${SEPTIEMBRE}`);

    expect(listado.status).toBe(200);
    expect(listado.body.liquidaciones).toHaveLength(3);
    expect(listado.body.total_general).toBe(38000);
    expect(listado.body.liquidaciones.every(({ estado }: { estado: string }) => estado === "CERRADA")).toBe(
      true,
    );
  });
});

// Plan Inicial a $25000 de lista y una promoción del 20 %: la cuota queda en $20000. Rita cobra el 50 %.
describe("PI-91: los descuentos de las promociones no reducen los honorarios", () => {
  const CUOTA_CON_PROMOCION = 20000;

  async function alumnaDeRitaConPromocion(plan: PlanDePrueba = escenario.planInicial): Promise<number> {
    const { rita } = escenario;
    const { id_horario } = await crearHorarioDePrueba(prisma, {
      id_actividad: escenario.idActividad,
      id_profesora: rita.id_profesora,
      dia_semana: 3,
      hora_inicio: "09:00",
      hora_fin: "10:00",
      fecha_alta: ALTA_DE_LOS_HORARIOS,
    });
    const sosa = await inscribir("Sosa", rita, id_horario, plan);
    const { id_promocion } = await prisma.promociones.create({
      data: {
        codigo: "VERANO20",
        nombre: "Verano",
        tipo_descuento: "PORCENTAJE",
        valor: 20,
        fecha_desde: new Date("2026-08-01T00:00:00Z"),
        fecha_hasta: new Date("2026-12-31T00:00:00Z"),
        activo: true,
      },
    });
    await prisma.inscripciones.update({ where: { id_inscripcion: sosa }, data: { id_promocion } });
    await crearTarifa({
      id_profesora: rita.id_profesora,
      concepto: "ALUMNO_A_CARGO",
      tipo_valor: "PORCENTAJE",
      valor: 50,
    });
    return sosa;
  }

  async function cuotaConPromocion(idInscripcion: number, generada: string): Promise<number> {
    const { id_cuota } = await prisma.cuotas.create({
      data: {
        id_inscripcion: idInscripcion,
        numero_cuota: 1,
        fecha_generacion: new Date(generada),
        fecha_vencimiento: new Date(generada),
        monto: CUOTA_CON_PROMOCION,
      },
    });
    return id_cuota;
  }

  async function pagar(idCuota: number, monto: number, fechaPago: string): Promise<void> {
    await prisma.pagos.create({
      data: {
        id_cuota: idCuota,
        forma_pago: "EFECTIVO",
        estado: "CONFIRMADO",
        monto,
        fecha_pago: new Date(fechaPago),
        id_usuario_registra: escenario.propietaria.id_usuario,
        rendido: true,
      },
    });
  }

  it("R-19 el pago de una cuota con promoción se liquida a precio de lista", async () => {
    const sosa = await alumnaDeRitaConPromocion();
    await pagar(
      await cuotaConPromocion(sosa, "2026-09-02T15:00:00Z"),
      CUOTA_CON_PROMOCION,
      "2026-09-02T15:00:00Z",
    );

    const { liquidaciones } = (await generar()).body;

    // El 50 % de los $25000 de lista, no de los $20000 que pagó con la promoción.
    expect(deLaProfesora(liquidaciones, escenario.rita).monto_total).toBe(12500);
    // Sin promoción se liquida lo cobrado, aunque sea menos que la lista (Acosta pagó $20000).
    expect(deLaProfesora(liquidaciones, escenario.lucia).monto_total).toBe(20500);
  });

  it("R-20 una cuota con promoción pagada en dos meses reparte la lista sin contarla dos veces", async () => {
    const sosa = await alumnaDeRitaConPromocion();
    const cuota = await cuotaConPromocion(sosa, "2026-09-02T15:00:00Z");
    await pagar(cuota, 10000, "2026-09-02T15:00:00Z");
    await pagar(cuota, 10000, "2026-10-02T15:00:00Z");

    const septiembre = (await generar()).body.liquidaciones;
    const octubre = (await generar("2026-10")).body.liquidaciones;

    expect(deLaProfesora(septiembre, escenario.rita).monto_total).toBe(6250);
    expect(deLaProfesora(octubre, escenario.rita).monto_total).toBe(6250);
  });

  it("R-21 el precio de lista es el del plan el día en Argentina en que se generó la cuota", async () => {
    const plan = await crearPlan(prisma, { nombre: "Plan con aumento" });
    await prisma.plan_precios.update({
      where: { id_plan_precio: plan.id_plan_precio },
      data: { fecha_vigencia_hasta: new Date("2026-09-14T00:00:00Z") },
    });
    await prisma.plan_precios.create({
      data: { id_plan: plan.id_plan, precio: 30000, fecha_vigencia_desde: new Date("2026-09-15T00:00:00Z") },
    });
    const sosa = await alumnaDeRitaConPromocion(plan);
    // 15/09 a las 02:00 UTC es todavía el 14/09 en Argentina: rige el precio de $25000.
    const cuota = await cuotaConPromocion(sosa, "2026-09-15T02:00:00Z");
    await pagar(cuota, CUOTA_CON_PROMOCION, "2026-09-20T15:00:00Z");

    const { liquidaciones } = (await generar()).body;

    expect(deLaProfesora(liquidaciones, escenario.rita).monto_total).toBe(12500);
  });
});
