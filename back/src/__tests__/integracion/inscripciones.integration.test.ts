import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO } from "../../shared/db/datos-demo.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";
import { crearAlumno, crearHorarioDePrueba, crearPlan } from "./fabricas.js";

// Casos PI-20 a PI-27: preinscripción, activación, baja/reactivación y cambios de plan/horarios.
const entorno = crearEntornoDeIntegracion();
const { app, prisma, infoInscripciones } = entorno;
const LUCIA = "lucia.gomez@example.com";
const CARLA = "carla.ruiz@example.com";

let tokenMarina: string;
let datosDemo: Awaited<ReturnType<typeof cargarDatosDemo>>;

function como(token: string, metodo: "get" | "post" | "patch" | "delete", ruta: string) {
  return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
}

function comoMarina(metodo: "get" | "post" | "patch" | "delete", ruta: string) {
  return como(tokenMarina, metodo, ruta);
}

function horariosFuncionales(): Promise<{ id_horario: number }[]> {
  return prisma.horarios.findMany({
    where: {
      id_actividad: datosDemo.idActividad.get("FUNCIONAL"),
      fecha_baja: null,
    },
    select: { id_horario: true },
    orderBy: { dia_semana: "asc" },
  });
}

async function crearHorarioConCupo(cupo: number): Promise<number> {
  const horario = await crearHorarioDePrueba(prisma, {
    id_actividad: datosDemo.idActividad.get("FUNCIONAL")!,
    id_profesora: datosDemo.idProfesora.get(LUCIA)!,
    dia_semana: 6,
    hora_inicio: "11:00",
    hora_fin: "12:00",
    cupo_maximo: cupo,
  });
  return horario.id_horario;
}

async function inscribir(
  idAlumno: number,
  idsHorarios: number[],
  idPlan = datosDemo.idPlan.get("Básico")!,
  idProfesora = datosDemo.idProfesora.get(LUCIA)!,
) {
  return comoMarina("post", "/inscripciones").send({
    id_alumno: idAlumno,
    id_plan: idPlan,
    id_profesora: idProfesora,
    ids_horarios: idsHorarios,
  });
}

async function darDeBaja(idAlumno: number, motivo_baja = "ABANDONO") {
  return comoMarina("post", `/alumnos/${idAlumno}/baja`).send({ motivo_baja });
}

async function obtenerInscripcion(idInscripcion: number) {
  return prisma.inscripciones.findUnique({
    where: { id_inscripcion: idInscripcion },
    include: { horarios: true },
  });
}

beforeEach(async () => {
  await reiniciarBase(prisma);
  datosDemo = await cargarDatosDemo(prisma);
  tokenMarina = await entorno.iniciarSesion(EMAIL_MULTIROL_DEMO);
});

afterAll(() => entorno.cerrar());

describe("PI-20: preinscripción y cupos", () => {
  it("crea una preinscripción con el precio vigente y las asignaciones elegidas", async () => {
    const alumno = await crearAlumno(prisma);
    const horarios = await horariosFuncionales();

    const respuesta = await inscribir(alumno.id_alumno, [horarios[0].id_horario, horarios[1].id_horario]);

    expect(respuesta.status).toBe(201);
    const inscripcion = await obtenerInscripcion(respuesta.body.id_inscripcion);
    expect(inscripcion).toMatchObject({
      id_alumno: alumno.id_alumno,
      id_plan: datosDemo.idPlan.get("Básico"),
      estado: "PREINSCRIPTA",
      motivo_baja: null,
      id_plan_precio: expect.any(Number),
    });
    expect(inscripcion?.horarios).toHaveLength(2);
    expect(inscripcion?.horarios.every(({ fecha_hasta }) => fecha_hasta === null)).toBe(true);
    const precioVigente = await prisma.plan_precios.findFirst({
      where: {
        id_plan: datosDemo.idPlan.get("Básico"),
        fecha_vigencia_desde: { lte: new Date() },
        OR: [{ fecha_vigencia_hasta: null }, { fecha_vigencia_hasta: { gte: new Date() } }],
      },
    });
    expect(inscripcion?.id_plan_precio).toBe(precioVigente?.id_plan_precio);
    const consulta = await comoMarina(
      "get",
      `/inscripciones?id_alumno=${alumno.id_alumno}&id_plan=${inscripcion?.id_plan}&id_profesora=${datosDemo.idProfesora.get(LUCIA)}&id_actividad=${datosDemo.idActividad.get("FUNCIONAL")}&estado=PREINSCRIPTA`,
    );
    expect(consulta.status).toBe(200);
    expect(consulta.body.map(({ id_inscripcion }: { id_inscripcion: number }) => id_inscripcion)).toEqual([
      respuesta.body.id_inscripcion,
    ]);
  });

  it("rechaza capacidad agotada y duplicación sin persistir otra inscripción", async () => {
    const idHorario = await crearHorarioConCupo(1);
    const primera = await crearAlumno(prisma);
    const segunda = await crearAlumno(prisma);
    const primeraRespuesta = await inscribir(primera.id_alumno, [idHorario]);
    const cantidadAntes = await prisma.inscripciones.count();

    const duplicada = await inscribir(primera.id_alumno, [idHorario]);
    const sinCupo = await inscribir(segunda.id_alumno, [idHorario]);

    expect(duplicada.status).toBe(409);
    expect(sinCupo.status).toBe(409);
    expect(await prisma.inscripciones.count()).toBe(cantidadAntes);
    expect(primeraRespuesta.status).toBe(201);
  });

  it("valida exclusividad de actividad, profesora única y máximo semanal", async () => {
    const alumno = await crearAlumno(prisma);
    const funcionales = await horariosFuncionales();
    const planExclusivo = datosDemo.idPlan.get("Personalizado 2 días")!;
    const exclusivoEnActividadEquivocada = await inscribir(
      alumno.id_alumno,
      [funcionales[0].id_horario],
      planExclusivo,
    );

    const planProfesoraUnica = await crearPlan(prisma, { clases_por_semana: 3 });
    await prisma.planes.update({
      where: { id_plan: planProfesoraUnica.id_plan },
      data: { profesora_unica: true },
    });
    const idCarla = datosDemo.idProfesora.get(CARLA)!;
    const horarioCarla = await prisma.horarios.findFirstOrThrow({
      where: { id_profesora: idCarla, fecha_baja: null },
      select: { id_horario: true },
    });
    const profesoraInconsistente = await inscribir(
      alumno.id_alumno,
      [funcionales[0].id_horario],
      planProfesoraUnica.id_plan,
      idCarla,
    );
    const planUnaClase = await crearPlan(prisma, { clases_por_semana: 1 });
    const excedeClasesSemanales = await inscribir(
      alumno.id_alumno,
      [funcionales[0].id_horario, funcionales[1].id_horario],
      planUnaClase.id_plan,
    );

    expect(exclusivoEnActividadEquivocada.status).toBe(400);
    expect(profesoraInconsistente.status).toBe(400);
    expect(excedeClasesSemanales.status).toBe(400);
    expect(horarioCarla.id_horario).not.toBe(funcionales[0].id_horario);
    expect(await prisma.inscripciones.count()).toBe(0);
  });
});

describe("PI-21: activación", () => {
  it("activa alumno y usuario al confirmar el pago y tolera el reintento", async () => {
    const alumno = await crearAlumno(prisma, { email: "pago@example.com" });
    const horarios = await horariosFuncionales();
    const creada = await inscribir(alumno.id_alumno, [horarios[0].id_horario]);

    await infoInscripciones.activar(creada.body.id_inscripcion);
    await infoInscripciones.activar(creada.body.id_inscripcion);

    expect((await obtenerInscripcion(creada.body.id_inscripcion))?.estado).toBe("ACTIVA");
    expect(await prisma.alumnos.findUnique({ where: { id_alumno: alumno.id_alumno } })).toMatchObject({
      estado: "ACTIVO",
      fecha_baja: null,
    });
    expect(await prisma.usuario_roles.count({ where: { id_usuario: alumno.id_usuario } })).toBe(1);
    const login = await request(app).post("/api/v1/auth/google").send({ id_token: "pago@example.com" });
    expect(login.status).toBe(200);
  });

  it("revalida el cupo al activar y no expone la activación en la API", async () => {
    const idHorario = await crearHorarioConCupo(2);
    const primero = await crearAlumno(prisma);
    const segundo = await crearAlumno(prisma);
    await inscribir(primero.id_alumno, [idHorario]);
    const inscripcionSegundo = await inscribir(segundo.id_alumno, [idHorario]);
    await prisma.horarios.update({ where: { id_horario: idHorario }, data: { cupo_maximo: 1 } });

    const porHttp = await comoMarina(
      "post",
      `/inscripciones/${inscripcionSegundo.body.id_inscripcion}/activar`,
    );

    expect(porHttp.status).toBe(404);
    await expect(infoInscripciones.activar(inscripcionSegundo.body.id_inscripcion)).rejects.toThrow(
      "No hay cupo disponible",
    );
    expect((await obtenerInscripcion(inscripcionSegundo.body.id_inscripcion))?.estado).toBe("PREINSCRIPTA");
  });
});

describe("PI-22: baja y reactivación", () => {
  it("cierra la inscripción y horarios, y libera el cupo", async () => {
    const idHorario = await crearHorarioConCupo(1);
    const primero = await crearAlumno(prisma);
    const segundo = await crearAlumno(prisma);
    const inscripcion = await inscribir(primero.id_alumno, [idHorario]);

    const baja = await darDeBaja(primero.id_alumno, "MUDANZA");
    const nuevaInscripcion = await inscribir(segundo.id_alumno, [idHorario]);

    expect(baja.status).toBe(200);
    expect(nuevaInscripcion.status).toBe(201);
    expect(await obtenerInscripcion(inscripcion.body.id_inscripcion)).toMatchObject({
      estado: "BAJA",
      motivo_baja: "MUDANZA",
      horarios: [{ fecha_hasta: expect.any(Date) }],
    });
    expect((await darDeBaja(primero.id_alumno)).status).toBe(409);
  });

  it("reactiva creando una inscripción nueva y conserva el historial de baja", async () => {
    const idHorario = await crearHorarioConCupo(1);
    const alumno = await crearAlumno(prisma);
    const anterior = await inscribir(alumno.id_alumno, [idHorario]);
    await darDeBaja(alumno.id_alumno);

    const reactivacion = await comoMarina("post", `/alumnos/${alumno.id_alumno}/reactivar`).send({
      id_plan: datosDemo.idPlan.get("Intermedio"),
      id_profesora: datosDemo.idProfesora.get(LUCIA),
      ids_horarios: [idHorario],
    });

    expect(reactivacion.status).toBe(201);
    expect(reactivacion.body.id_inscripcion).not.toBe(anterior.body.id_inscripcion);
    expect((await obtenerInscripcion(anterior.body.id_inscripcion))?.estado).toBe("BAJA");
    expect((await obtenerInscripcion(reactivacion.body.id_inscripcion))?.estado).toBe("ACTIVA");
    expect(await prisma.alumnos.findUnique({ where: { id_alumno: alumno.id_alumno } })).toMatchObject({
      estado: "ACTIVO",
      fecha_baja: null,
    });
  });

  it("rechaza reactivar si el cupo ya lo ocupa otro alumno, sin alterar la baja", async () => {
    const idHorario = await crearHorarioConCupo(1);
    const alumno = await crearAlumno(prisma);
    const otroAlumno = await crearAlumno(prisma);
    const anterior = await inscribir(alumno.id_alumno, [idHorario]);
    await darDeBaja(alumno.id_alumno);
    await inscribir(otroAlumno.id_alumno, [idHorario]);

    const reactivacion = await comoMarina("post", `/alumnos/${alumno.id_alumno}/reactivar`).send({
      id_plan: datosDemo.idPlan.get("Básico"),
      id_profesora: datosDemo.idProfesora.get(LUCIA),
      ids_horarios: [idHorario],
    });

    expect(reactivacion.status).toBe(409);
    expect((await obtenerInscripcion(anterior.body.id_inscripcion))?.estado).toBe("BAJA");
    expect(await prisma.inscripciones.count({ where: { id_alumno: alumno.id_alumno } })).toBe(1);
  });
});

describe("PI-23: cambios de plan y horarios", () => {
  it("cambia el plan creando una inscripción nueva y mantiene los datos anteriores", async () => {
    const alumno = await crearAlumno(prisma);
    const horarios = await horariosFuncionales();
    const anterior = await inscribir(alumno.id_alumno, [horarios[0].id_horario]);
    await infoInscripciones.activar(anterior.body.id_inscripcion);
    const nuevoPlan = await crearPlan(prisma, { nombre: "Plan renovado", precio: 32000 });

    const cambio = await comoMarina(
      "post",
      `/inscripciones/${anterior.body.id_inscripcion}/cambio-plan`,
    ).send({
      id_plan: nuevoPlan.id_plan,
      id_profesora: datosDemo.idProfesora.get(LUCIA),
      ids_horarios: [horarios[1].id_horario],
    });

    expect(cambio.status).toBe(200);
    expect(cambio.body.id_inscripcion).not.toBe(anterior.body.id_inscripcion);
    expect(await obtenerInscripcion(anterior.body.id_inscripcion)).toMatchObject({
      id_plan: datosDemo.idPlan.get("Básico"),
      estado: "BAJA",
      motivo_baja: "CAMBIO_PLAN",
    });
    expect(await obtenerInscripcion(cambio.body.id_inscripcion)).toMatchObject({
      id_plan: nuevoPlan.id_plan,
      id_plan_precio: nuevoPlan.id_plan_precio,
      estado: "ACTIVA",
    });
  });

  it("rechaza un cambio de plan sin cupo y deja intacta la inscripción vigente", async () => {
    const alumno = await crearAlumno(prisma);
    const otroAlumno = await crearAlumno(prisma);
    const horarios = await horariosFuncionales();
    const idHorarioLleno = await crearHorarioConCupo(1);
    const actual = await inscribir(alumno.id_alumno, [horarios[0].id_horario]);
    await inscribir(otroAlumno.id_alumno, [idHorarioLleno]);
    const nuevoPlan = await crearPlan(prisma);

    const rechazo = await comoMarina("post", `/inscripciones/${actual.body.id_inscripcion}/cambio-plan`).send(
      {
        id_plan: nuevoPlan.id_plan,
        id_profesora: datosDemo.idProfesora.get(LUCIA),
        ids_horarios: [idHorarioLleno],
      },
    );
    const actualSinCambios = await obtenerInscripcion(actual.body.id_inscripcion);

    expect(rechazo.status).toBe(409);
    expect(await prisma.inscripciones.count({ where: { id_alumno: alumno.id_alumno } })).toBe(1);
    expect(actualSinCambios).toMatchObject({
      id_plan: datosDemo.idPlan.get("Básico"),
      estado: "PREINSCRIPTA",
    });
    expect(actualSinCambios?.horarios.filter(({ fecha_hasta }) => fecha_hasta === null)).toHaveLength(1);
  });

  it("actualiza horarios sin sobrescribir el historial y rechaza cupo agotado", async () => {
    const idHorarioLleno = await crearHorarioConCupo(1);
    const alumno = await crearAlumno(prisma);
    const otroAlumno = await crearAlumno(prisma);
    const horarios = await horariosFuncionales();
    const inscripcion = await inscribir(alumno.id_alumno, [horarios[0].id_horario]);
    await inscribir(otroAlumno.id_alumno, [idHorarioLleno]);

    const tokenLucia = await entorno.iniciarSesion(LUCIA);
    const cambioNoAutorizado = await como(
      tokenLucia,
      "patch",
      `/inscripciones/${inscripcion.body.id_inscripcion}/horarios`,
    ).send({ ids_horarios: [horarios[1].id_horario] });
    const cambioValido = await comoMarina(
      "patch",
      `/inscripciones/${inscripcion.body.id_inscripcion}/horarios`,
    ).send({
      ids_horarios: [horarios[1].id_horario],
    });
    const cambioSinCupo = await comoMarina(
      "patch",
      `/inscripciones/${inscripcion.body.id_inscripcion}/horarios`,
    ).send({
      ids_horarios: [idHorarioLleno],
    });

    expect(cambioNoAutorizado.status).toBe(403);
    expect(cambioValido.status).toBe(200);
    expect(cambioSinCupo.status).toBe(409);
    const actual = await obtenerInscripcion(inscripcion.body.id_inscripcion);
    expect(
      actual?.horarios.filter(({ fecha_hasta }) => fecha_hasta === null).map(({ id_horario }) => id_horario),
    ).toEqual([horarios[1].id_horario]);
    expect(
      actual?.horarios.some(
        ({ id_horario, fecha_hasta }) => id_horario === horarios[0].id_horario && fecha_hasta,
      ),
    ).toBe(true);
  });
});

describe("PI-24: baja de un horario con alumnos inscriptos", () => {
  it("no da de baja un horario con inscriptos vigentes y sí cuando el alumno se fue", async () => {
    const idHorario = await crearHorarioConCupo(3);
    const alumno = await crearAlumno(prisma);
    await inscribir(alumno.id_alumno, [idHorario]);

    const conInscriptos = await comoMarina("delete", `/horarios/${idHorario}`);
    expect(conInscriptos.status).toBe(409);
    expect(await prisma.horarios.findUnique({ where: { id_horario: idHorario } })).toMatchObject({
      fecha_baja: null,
    });

    await darDeBaja(alumno.id_alumno);
    const sinInscriptos = await comoMarina("delete", `/horarios/${idHorario}`);
    expect(sinInscriptos.status).toBe(200);
    expect(sinInscriptos.body.horario.fecha_baja).not.toBeNull();
  });
});
