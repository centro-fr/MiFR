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
  type PlanDePrueba,
} from "./fabricas.js";

// Casos PI-47 a PI-50: las clases del día, la toma de asistencia (US-20) y el cierre con los
// ausentes (US-21). El reloj queda fijo el lunes 12/10/2026 a las 15:00 de Argentina: la clase de
// Lucía de 20:00 a 21:00 es de hoy y todavía no terminó. Solo se simula Date: la base y los
// pedidos corren con sus temporizadores reales.
const entorno = crearEntornoDeIntegracion();
const { prisma, cierreAsistencia } = entorno;
const LUCIA = "lucia.gomez@example.com";
const CARLA = "carla.ruiz@example.com";
const VALENTINA = "valentina.herrera@example.com";
const HOY = new Date("2026-10-12T00:00:00Z");
const AHORA = new Date("2026-10-12T18:00:00Z");
// 21:00 de Argentina, cuando termina la clase.
const FIN_DE_CLASE = new Date("2026-10-13T00:00:00Z");
const UN_MINUTO = 60_000;

interface Escenario {
  idHorario: number;
  idOtroHorario: number;
  idLucia: number;
  // Los cinco inscriptos vigentes, en el orden de la lista (por apellido).
  vigentes: { id_alumno: number; id_inscripcion: number }[];
  idDadoDeBaja: number;
  idDeOtroHorario: number;
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
  const idActividad = datos.idActividad.get("FUNCIONAL")!;
  const plan = await crearPlan(prisma, { nombre: "Plan de asistencia" });
  const { id_horario: idHorario } = await crearHorarioDePrueba(prisma, {
    id_actividad: idActividad,
    id_profesora: idLucia,
    dia_semana: 1,
    hora_inicio: "20:00",
    hora_fin: "21:00",
    cupo_maximo: 10,
  });
  const { id_horario: idOtroHorario } = await crearHorarioDePrueba(prisma, {
    id_actividad: idActividad,
    id_profesora: idLucia,
    dia_semana: 3,
    hora_inicio: "20:00",
    hora_fin: "21:00",
  });

  const vigentes = [];
  for (const [apellido, estado] of [
    ["Acosta", "ACTIVA"],
    ["Benítez", "ACTIVA"],
    ["Castro", "ACTIVA"],
    ["Díaz", "PREINSCRIPTA"],
    ["Escobar", "ACTIVA"],
  ] as const) {
    vigentes.push(await inscribir(plan, idLucia, idHorario, apellido, estado));
  }
  const dadoDeBaja = await inscribir(plan, idLucia, idHorario, "Ferreyra", "BAJA");
  await prisma.alumnos.update({ where: { id_alumno: dadoDeBaja.id_alumno }, data: { estado: "BAJA" } });
  // Se dio de baja hoy: su horario todavía figura vigente este día y solo lo saca el estado.
  await prisma.inscripcion_horarios.updateMany({
    where: { inscripcion: { id_alumno: dadoDeBaja.id_alumno } },
    data: { fecha_hasta: HOY },
  });
  const deOtroHorario = await inscribir(plan, idLucia, idOtroHorario, "Gómez", "ACTIVA");

  await cargarCuotas(vigentes[0]!.id_inscripcion, vigentes[1]!.id_inscripcion, vigentes[2]!.id_inscripcion);

  return {
    idHorario,
    idOtroHorario,
    idLucia,
    vigentes,
    idDadoDeBaja: dadoDeBaja.id_alumno,
    idDeOtroHorario: deOtroHorario.id_alumno,
  };
}

async function inscribir(
  plan: PlanDePrueba,
  idProfesora: number,
  idHorario: number,
  apellido: string,
  estado: "PREINSCRIPTA" | "ACTIVA" | "BAJA",
) {
  const { id_alumno } = await crearAlumno(prisma, {
    apellido,
    estado: estado === "ACTIVA" ? "ACTIVO" : "INACTIVO",
  });
  const { id_inscripcion } = await crearInscripcionDePrueba(prisma, {
    id_alumno,
    plan,
    id_profesora: idProfesora,
    id_horario: idHorario,
    estado,
  });
  return { id_alumno, id_inscripcion };
}

// Acosta al día, Benítez vencida y Castro vencida pero con una transferencia sin revisar.
async function cargarCuotas(alDia: number, vencida: number, conTransferencia: number) {
  const { id_usuario: idMarina } = await prisma.usuarios.findUniqueOrThrow({
    where: { email: EMAIL_MULTIROL_DEMO },
  });
  const pago = {
    estado: "CONFIRMADO" as const,
    monto: 25000,
    fecha_pago: AHORA,
    id_usuario_registra: idMarina,
  };
  for (const [idInscripcion, vence] of [
    [alDia, "2026-11-01"],
    [vencida, "2026-09-01"],
    [conTransferencia, "2026-09-01"],
  ] as const) {
    await prisma.cuotas.create({
      data: {
        id_inscripcion: idInscripcion,
        numero_cuota: 1,
        fecha_vencimiento: new Date(`${vence}T00:00:00Z`),
        monto: 25000,
        pagos: { create: { ...pago, forma_pago: "EFECTIVO", rendido: true } },
      },
    });
  }
  const cuota = await prisma.cuotas.create({
    data: {
      id_inscripcion: conTransferencia,
      numero_cuota: 2,
      fecha_vencimiento: new Date("2026-10-31T00:00:00Z"),
      monto: 25000,
    },
  });
  await prisma.pagos.create({
    data: {
      ...pago,
      id_cuota: cuota.id_cuota,
      estado: "PENDIENTE",
      forma_pago: "TRANSFERENCIA",
      fecha_hora_transferencia: AHORA,
      rendido: false,
    },
  });
}

async function pedir(metodo: "get" | "put" | "post", ruta: string, email: string, cuerpo?: object) {
  const token = await entorno.iniciarSesion(email);
  const pedido = request(entorno.app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  return cuerpo ? pedido.send(cuerpo) : pedido;
}

async function claseDeHoy(email = LUCIA): Promise<number> {
  const respuesta = await pedir("get", "/clases/hoy", email);
  const clase = respuesta.body.find(
    ({ id_horario }: { id_horario: number }) => id_horario === escenario.idHorario,
  );
  return clase.id_clase as number;
}

function asistenciasDe(idClase: number) {
  return prisma.asistencias.findMany({ where: { id_clase: idClase }, orderBy: { id_alumno: "asc" } });
}

function marcar(idClase: number, idAlumno: number, asistio: boolean, email = LUCIA) {
  return pedir("put", `/clases/${idClase}/asistencia/${idAlumno}`, email, { asistio });
}

describe("PI-47: las clases del día y su lista de asistencia", () => {
  it("la profesora ve solo sus clases de hoy, y pedirlas dos veces no las duplica", async () => {
    const primera = await pedir("get", "/clases/hoy", LUCIA);
    const segunda = await pedir("get", "/clases/hoy", LUCIA);

    expect(primera.status).toBe(200);
    expect(segunda.body).toEqual(primera.body);
    expect(
      primera.body.every(
        ({ id_prof_dictante }: { id_prof_dictante: number }) => id_prof_dictante === escenario.idLucia,
      ),
    ).toBe(true);
    const propia = primera.body.find(
      ({ id_horario }: { id_horario: number }) => id_horario === escenario.idHorario,
    );
    expect(propia).toMatchObject({
      estado: "PROGRAMADA",
      fecha_clase: HOY.toISOString(),
      inscriptos: 5,
      cupo_disponible: 5,
    });
    expect(await prisma.clases.count({ where: { id_horario: escenario.idHorario } })).toBe(1);
    expect(await prisma.clases.count({ where: { id_horario: escenario.idOtroHorario } })).toBe(0);

    const { id_horario: idHorarioDeCarla } = await crearHorarioDePrueba(prisma, {
      id_actividad: (await prisma.horarios.findUniqueOrThrow({ where: { id_horario: escenario.idHorario } }))
        .id_actividad,
      id_profesora: (await prisma.profesoras.findFirstOrThrow({ where: { usuario: { email: CARLA } } }))
        .id_profesora,
      dia_semana: 1,
      hora_inicio: "21:00",
      hora_fin: "22:00",
    });
    await pedir("get", "/clases/hoy", LUCIA);
    expect(await prisma.clases.count({ where: { id_horario: idHorarioDeCarla } })).toBe(0);

    const deCarla = await pedir("get", "/clases/hoy", CARLA);
    expect(
      deCarla.body.some(({ id_horario }: { id_horario: number }) => id_horario === escenario.idHorario),
    ).toBe(false);
  });

  it("la lista trae a los inscriptos vigentes del horario con su situación de cuota, sin el dado de baja ni el de otro horario", async () => {
    const idClase = await claseDeHoy();

    const respuesta = await pedir("get", `/clases/${idClase}/asistencia`, LUCIA);

    expect(respuesta.status).toBe(200);
    const inscriptos = respuesta.body.inscriptos as {
      id_alumno: number;
      apellido: string;
      asistencia: string;
      situacion_cuota: Record<string, unknown>;
    }[];
    expect(inscriptos.map(({ id_alumno }) => id_alumno)).toEqual(
      escenario.vigentes.map(({ id_alumno }) => id_alumno),
    );
    expect(inscriptos.every(({ asistencia }) => asistencia === "sin_marcar")).toBe(true);
    expect(
      inscriptos.map(({ situacion_cuota }) => [situacion_cuota.estado, situacion_cuota.tiene_pago_pendiente]),
    ).toEqual([
      ["AL_DIA", false],
      ["VENCIDA", false],
      ["VENCIDA", true],
      ["PENDIENTE_DE_PAGO", false],
      ["PENDIENTE_DE_PAGO", false],
    ]);
    expect(inscriptos[1]!.situacion_cuota).toMatchObject({ puede_asistir: true });
  });

  it("un alumno no tiene acceso a las clases (403)", async () => {
    const respuesta = await pedir("get", "/clases/hoy", VALENTINA);

    expect(respuesta.status).toBe(403);
    expect(await prisma.clases.count()).toBe(0);
  });
});

describe("PI-48: marcar asistencia", () => {
  it("la marca se guarda al momento con quién y cuándo, y la última vale", async () => {
    const idClase = await claseDeHoy();
    const [ana] = escenario.vigentes;
    const { id_usuario: idUsuarioLucia } = await prisma.usuarios.findUniqueOrThrow({
      where: { email: LUCIA },
    });

    expect((await marcar(idClase, ana!.id_alumno, true)).status).toBe(200);
    expect((await marcar(idClase, ana!.id_alumno, false)).status).toBe(200);

    expect(await asistenciasDe(idClase)).toEqual([
      expect.objectContaining({
        id_alumno: ana!.id_alumno,
        id_inscripcion: ana!.id_inscripcion,
        asistio: false,
        id_usuario_registra: idUsuarioLucia,
        fecha_registro: AHORA,
      }),
    ]);
  });

  it("no se marca a un alumno de otro horario ni a uno dado de baja, ni en la clase de otra profesora", async () => {
    const idClase = await claseDeHoy();

    expect((await marcar(idClase, escenario.idDeOtroHorario, true)).status).toBe(404);
    expect((await marcar(idClase, escenario.idDadoDeBaja, true)).status).toBe(404);
    expect((await marcar(idClase, escenario.vigentes[0]!.id_alumno, true, CARLA)).status).toBe(404);
    expect((await pedir("get", `/clases/${idClase}/asistencia`, CARLA)).status).toBe(404);
    expect(await asistenciasDe(idClase)).toEqual([]);
  });

  it("la profesora no toma asistencia de una clase de otro día; la propietaria sí la corrige", async () => {
    const pasada = await prisma.clases.create({
      data: {
        id_horario: escenario.idHorario,
        id_prof_dictante: escenario.idLucia,
        fecha_clase: new Date("2026-10-05T00:00:00Z"),
        estado: "DICTADA",
      },
    });
    const ana = escenario.vigentes[0]!;

    expect((await marcar(pasada.id_clase, ana.id_alumno, true)).status).toBe(404);
    expect((await marcar(pasada.id_clase, ana.id_alumno, true, EMAIL_MULTIROL_DEMO)).status).toBe(200);
    expect(await asistenciasDe(pasada.id_clase)).toEqual([
      expect.objectContaining({ id_alumno: ana.id_alumno, asistio: true }),
    ]);
  });

  it("todos presentes marca a los inscriptos vigentes y pisa una marca anterior", async () => {
    const idClase = await claseDeHoy();
    await marcar(idClase, escenario.vigentes[1]!.id_alumno, false);

    const respuesta = await pedir("post", `/clases/${idClase}/asistencia/todos-presentes`, LUCIA);

    expect(respuesta.status).toBe(200);
    const asistencias = await asistenciasDe(idClase);
    expect(asistencias.map(({ id_alumno }) => id_alumno)).toEqual(
      escenario.vigentes.map(({ id_alumno }) => id_alumno),
    );
    expect(asistencias.every(({ asistio }) => asistio)).toBe(true);
  });
});

describe("PI-49: cerrar la asistencia con el botón", () => {
  it("con 5 inscriptos y 3 presentes, el cierre registra 2 ausentes sin usuario y cerrar otra vez no duplica nada", async () => {
    const idClase = await claseDeHoy();
    for (const { id_alumno } of escenario.vigentes.slice(0, 3)) await marcar(idClase, id_alumno, true);

    const cierre = await pedir("post", `/clases/${idClase}/cerrar`, LUCIA);
    const otraVez = await pedir("post", `/clases/${idClase}/cerrar`, LUCIA);

    expect(cierre.status).toBe(200);
    expect(cierre.body).toMatchObject({ estado: "DICTADA", fecha_cierre_asist: AHORA.toISOString() });
    expect(otraVez.status).toBe(200);
    const asistencias = await asistenciasDe(idClase);
    expect(asistencias).toHaveLength(5);
    const ausentes = asistencias.filter(({ asistio }) => !asistio);
    expect(ausentes.map(({ id_alumno }) => id_alumno)).toEqual(
      escenario.vigentes.slice(3).map(({ id_alumno }) => id_alumno),
    );
    expect(ausentes.every(({ id_usuario_registra }) => id_usuario_registra === null)).toBe(true);
    expect(asistencias.some(({ id_alumno }) => id_alumno === escenario.idDadoDeBaja)).toBe(false);
  });

  it("después del cierre la profesora no marca más y la propietaria corrige", async () => {
    const idClase = await claseDeHoy();
    await pedir("post", `/clases/${idClase}/cerrar`, LUCIA);
    const ultima = escenario.vigentes[4]!;

    const deLaProfesora = await marcar(idClase, ultima.id_alumno, true);
    const deLaPropietaria = await marcar(idClase, ultima.id_alumno, true, EMAIL_MULTIROL_DEMO);

    expect(deLaProfesora.status).toBe(409);
    expect(deLaPropietaria.status).toBe(200);
    const fila = await prisma.asistencias.findUniqueOrThrow({
      where: { id_clase_id_alumno: { id_clase: idClase, id_alumno: ultima.id_alumno } },
    });
    expect(fila.asistio).toBe(true);
    expect(fila.id_usuario_registra).not.toBeNull();
    expect((await pedir("post", `/clases/${idClase}/asistencia/todos-presentes`, LUCIA)).status).toBe(409);
  });
});

describe("PI-50: cierre automático al terminar la clase", () => {
  async function clasesDeHoy() {
    const conMarca = await prisma.clases.create({
      data: { id_horario: escenario.idHorario, id_prof_dictante: escenario.idLucia, fecha_clase: HOY },
    });
    const { id_horario: idOtro } = await crearHorarioDePrueba(prisma, {
      id_actividad: (await prisma.horarios.findUniqueOrThrow({ where: { id_horario: escenario.idHorario } }))
        .id_actividad,
      id_profesora: escenario.idLucia,
      dia_semana: 1,
      hora_inicio: "20:00",
      hora_fin: "21:00",
    });
    await crearInscripcionDePrueba(prisma, {
      id_alumno: escenario.vigentes[0]!.id_alumno,
      plan: await crearPlan(prisma),
      id_profesora: escenario.idLucia,
      id_horario: idOtro,
    });
    const sinMarcas = await prisma.clases.create({
      data: { id_horario: idOtro, id_prof_dictante: escenario.idLucia, fecha_clase: HOY },
    });
    await marcar(conMarca.id_clase, escenario.vigentes[0]!.id_alumno, true);
    return { conMarca: conMarca.id_clase, sinMarcas: sinMarcas.id_clase };
  }

  it("cierra al terminar la clase y solo inventa ausentes donde se tomó asistencia", async () => {
    const { conMarca, sinMarcas } = await clasesDeHoy();

    await expect(
      cierreAsistencia.procesarCierresAutomaticos(new Date(FIN_DE_CLASE.getTime() - UN_MINUTO)),
    ).resolves.toBe(0);
    expect(await prisma.clases.count({ where: { estado: "DICTADA" } })).toBe(0);

    await expect(cierreAsistencia.procesarCierresAutomaticos(FIN_DE_CLASE)).resolves.toBe(2);

    const cerradas = await prisma.clases.findMany({ where: { id_clase: { in: [conMarca, sinMarcas] } } });
    expect(cerradas.map(({ estado, fecha_cierre_asist }) => [estado, fecha_cierre_asist])).toEqual([
      ["DICTADA", FIN_DE_CLASE],
      ["DICTADA", FIN_DE_CLASE],
    ]);
    const conAusentes = await asistenciasDe(conMarca);
    expect(conAusentes).toHaveLength(5);
    expect(conAusentes.filter(({ asistio }) => !asistio)).toHaveLength(4);
    expect(await asistenciasDe(sinMarcas)).toEqual([]);
  });

  it("espera además los MINUTOS_CIERRE_ASISTENCIA que configuró la propietaria", async () => {
    await clasesDeHoy();
    await prisma.parametros_sistema.update({
      where: { clave: "MINUTOS_CIERRE_ASISTENCIA" },
      data: { valor: "15" },
    });

    await expect(
      cierreAsistencia.procesarCierresAutomaticos(new Date(FIN_DE_CLASE.getTime() + 14 * UN_MINUTO)),
    ).resolves.toBe(0);
    await expect(
      cierreAsistencia.procesarCierresAutomaticos(new Date(FIN_DE_CLASE.getTime() + 15 * UN_MINUTO)),
    ).resolves.toBe(2);
  });

  it("leer una clase vencida la cierra aunque el intervalo no haya corrido", async () => {
    const { conMarca } = await clasesDeHoy();
    vi.setSystemTime(FIN_DE_CLASE);

    const respuesta = await pedir("get", `/clases/${conMarca}/asistencia`, EMAIL_MULTIROL_DEMO);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.clase.estado).toBe("DICTADA");
    expect(
      respuesta.body.inscriptos.filter(({ asistencia }: { asistencia: string }) => asistencia === "ausente"),
    ).toHaveLength(4);
  });
});
