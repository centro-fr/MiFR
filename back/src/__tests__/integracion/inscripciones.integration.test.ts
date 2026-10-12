import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO } from "../../shared/db/datos-demo.js";
import { fechaActualArgentina } from "../../shared/utils/fecha-argentina.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";
import { crearAlumno, crearHorarioDePrueba, crearPlan } from "./fabricas.js";

// Casos PI-20 a PI-27, PI-30, PI-32, PI-37, PI-38, PI-41 y PI-44: preinscripción (con peso y talla si la
// actividad los pide, y con la reserva de cupo que vence), activación, baja (con el detalle del motivo OTRO),
// reactivación (como pre-inscripto si nunca pagó) y cambios de plan/horarios.
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

// El primer pago por la API: confirma la inscripción y da el alta definitiva (US-07, US-15).
function cobrarEnEfectivo(idInscripcion: number, monto: number) {
  return comoMarina("post", "/pagos/efectivo").send({ id_inscripcion: idInscripcion, monto });
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
    const inscripcionesDeDemo = await prisma.inscripciones.count();
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
    expect(await prisma.inscripciones.count()).toBe(inscripcionesDeDemo);
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

  it("reactiva a quien ya pagó con una inscripción nueva activa y conserva el historial de baja", async () => {
    const idHorario = await crearHorarioConCupo(1);
    const alumno = await crearAlumno(prisma);
    const anterior = await inscribir(alumno.id_alumno, [idHorario]);
    expect((await cobrarEnEfectivo(anterior.body.id_inscripcion, 25000)).status).toBe(201);
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

describe("PI-27: ocupación de los horarios", () => {
  it("cada horario informa sus inscriptos vigentes y los lugares que le quedan", async () => {
    const idHorario = await crearHorarioConCupo(3);
    const primero = await crearAlumno(prisma);
    const segundo = await crearAlumno(prisma);
    await inscribir(primero.id_alumno, [idHorario]);
    await inscribir(segundo.id_alumno, [idHorario]);
    await darDeBaja(segundo.id_alumno);
    const tokenLucia = await entorno.iniciarSesion(LUCIA);

    const detalle = await comoMarina("get", `/horarios/${idHorario}`);
    const listado = await como(tokenLucia, "get", "/horarios");

    expect(detalle.body).toMatchObject({ inscriptos: 1, cupo_disponible: 2 });
    const enListado = listado.body.find((h: { id_horario: number }) => h.id_horario === idHorario);
    expect(enListado).toMatchObject({ inscriptos: 1, cupo_disponible: 2 });
    const funcionalSinCupo = listado.body.find(
      (h: { cupo_maximo_efectivo: number | null }) => h.cupo_maximo_efectivo === null,
    );
    expect(funcionalSinCupo.cupo_disponible).toBeNull();
  });
});

describe("PI-30: la profesora pre-inscribe solo a su cargo", () => {
  async function horariosDeLucia(): Promise<number[]> {
    const horarios = await prisma.horarios.findMany({
      where: { id_profesora: datosDemo.idProfesora.get(LUCIA), fecha_baja: null },
      select: { id_horario: true },
      orderBy: { dia_semana: "asc" },
    });
    return horarios.map(({ id_horario }) => id_horario);
  }

  function comoLucia(token: string, cuerpo: Record<string, unknown>) {
    return como(token, "post", "/inscripciones").send({
      id_plan: datosDemo.idPlan.get("Básico"),
      id_profesora: datosDemo.idProfesora.get(LUCIA),
      ...cuerpo,
    });
  }

  it("pre-inscribe a su nombre a un alumno que no está con otra profesora", async () => {
    const tokenLucia = await entorno.iniciarSesion(LUCIA);
    const alumno = await crearAlumno(prisma);

    const respuesta = await comoLucia(tokenLucia, {
      id_alumno: alumno.id_alumno,
      ids_horarios: await horariosDeLucia(),
    });

    expect(respuesta.status).toBe(201);
    const inscripcion = await obtenerInscripcion(respuesta.body.id_inscripcion);
    expect(inscripcion).toMatchObject({ id_profesora: datosDemo.idProfesora.get(LUCIA), sin_cargo: false });
  });

  it("no pre-inscribe a nombre de otra profesora, sin cargo, ni a un alumno a cargo de otra", async () => {
    const tokenLucia = await entorno.iniciarSesion(LUCIA);
    const alumno = await crearAlumno(prisma);
    const horarios = await horariosDeLucia();
    const inscripcionesAntes = await prisma.inscripciones.count();

    const aNombreDeCarla = await comoLucia(tokenLucia, {
      id_alumno: alumno.id_alumno,
      id_profesora: datosDemo.idProfesora.get(CARLA),
      ids_horarios: horarios,
    });
    const sinCargo = await comoLucia(tokenLucia, {
      id_alumno: alumno.id_alumno,
      ids_horarios: horarios,
      sin_cargo: true,
    });
    const alumnoDeCarla = await comoLucia(tokenLucia, {
      id_alumno: datosDemo.idAlumno.get("52111222"),
      ids_horarios: horarios,
    });

    expect([aNombreDeCarla.status, sinCargo.status, alumnoDeCarla.status]).toEqual([403, 403, 403]);
    expect(await prisma.inscripciones.count()).toBe(inscripcionesAntes);
  });

  it("la propietaria pre-inscribe sin esas restricciones", async () => {
    const respuesta = await inscribir(datosDemo.idAlumno.get("52111222")!, await horariosDeLucia());

    expect(respuesta.status).toBe(201);
  });
});

describe("PI-32: paginación de inscripciones", () => {
  it("devuelve la página pedida y no acepta más de 100 por pedido", async () => {
    const todas = await comoMarina("get", "/inscripciones");
    const segunda = await comoMarina("get", "/inscripciones?limit=1&offset=1");
    const demasiadas = await comoMarina("get", "/inscripciones?limit=101");

    expect(todas.status).toBe(200);
    expect(todas.body.length).toBeGreaterThan(1);
    expect(segunda.status).toBe(200);
    expect(segunda.body.map(({ id_inscripcion }: { id_inscripcion: number }) => id_inscripcion)).toEqual([
      todas.body[1].id_inscripcion,
    ]);
    expect(demasiadas.status).toBe(400);
  });
});

describe("PI-37: peso y talla al pre-inscribir en una actividad que los pide", () => {
  const MEDIDAS = { peso_kg: 62.5, talla_cm: 168 };

  async function horarioPersonalizadoDeCarla(): Promise<number> {
    const horario = await prisma.horarios.findFirstOrThrow({
      where: {
        id_actividad: datosDemo.idActividad.get("ENTRENAMIENTO_PERS"),
        id_profesora: datosDemo.idProfesora.get(CARLA),
        fecha_baja: null,
      },
      orderBy: { dia_semana: "asc" },
    });
    return horario.id_horario;
  }

  function preinscribirPersonalizado(idAlumno: number, idHorario: number, medidas?: typeof MEDIDAS) {
    return comoMarina("post", "/inscripciones").send({
      id_alumno: idAlumno,
      id_plan: datosDemo.idPlan.get("Personalizado 2 días"),
      id_profesora: datosDemo.idProfesora.get(CARLA),
      ids_horarios: [idHorario],
      ...(medidas ? { medidas } : {}),
    });
  }

  async function contarFilas() {
    return {
      inscripciones: await prisma.inscripciones.count(),
      registros: await prisma.registros_progreso.count(),
      medidas: await prisma.medidas_corporales.count(),
    };
  }

  it("sin peso ni talla responde 400 y no guarda ni la inscripción ni la medición", async () => {
    const { id_alumno } = await crearAlumno(prisma);
    const antes = await contarFilas();

    const respuesta = await preinscribirPersonalizado(id_alumno, await horarioPersonalizadoDeCarla());

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.message).toBe(
      "Entrenamiento Personalizado pide el peso y la talla para pre-inscribir",
    );
    expect(await contarFilas()).toEqual(antes);
  });

  it("con peso y talla pre-inscribe y guarda la medición inicial a nombre de la profesora a cargo", async () => {
    const { id_alumno } = await crearAlumno(prisma);

    const respuesta = await preinscribirPersonalizado(
      id_alumno,
      await horarioPersonalizadoDeCarla(),
      MEDIDAS,
    );

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.estado).toBe("PREINSCRIPTA");
    const registros = await prisma.registros_progreso.findMany({
      where: { id_alumno },
      include: { medidas: { include: { tipo_medida: true } } },
    });
    expect(registros).toHaveLength(1);
    expect(registros[0].id_profesora).toBe(datosDemo.idProfesora.get(CARLA));
    expect(
      registros[0].medidas
        .map(({ valor, tipo_medida }) => [tipo_medida.codigo, tipo_medida.unidad, valor.toNumber()])
        .sort(),
    ).toEqual([
      ["PESO", "kg", 62.5],
      ["TALLA", "cm", 168],
    ]);
  });

  it("una actividad que no los pide no los exige, hasta que la propietaria la marca", async () => {
    const { id_alumno } = await crearAlumno(prisma);
    const [{ id_horario }] = await horariosFuncionales();

    expect((await inscribir(id_alumno, [id_horario])).status).toBe(201);
    expect(await prisma.registros_progreso.count({ where: { id_alumno } })).toBe(0);

    const marcar = await comoMarina("patch", `/actividades/${datosDemo.idActividad.get("FUNCIONAL")}`).send({
      requiere_medidas: true,
    });
    expect(marcar.status).toBe(200);
    expect(marcar.body.requiere_medidas).toBe(true);

    const otro = await crearAlumno(prisma);
    expect((await inscribir(otro.id_alumno, [id_horario])).status).toBe(400);
  });

  it("si la pre-inscripción falla por cupo, la medición tampoco queda", async () => {
    await prisma.actividades.update({
      where: { id_actividad: datosDemo.idActividad.get("FUNCIONAL") },
      data: { requiere_medidas: true },
    });
    const idHorario = await crearHorarioConCupo(1);
    const primero = await crearAlumno(prisma);
    const segundo = await crearAlumno(prisma);
    const pedir = (idAlumno: number) =>
      comoMarina("post", "/inscripciones").send({
        id_alumno: idAlumno,
        id_plan: datosDemo.idPlan.get("Básico"),
        id_profesora: datosDemo.idProfesora.get(LUCIA),
        ids_horarios: [idHorario],
        medidas: MEDIDAS,
      });
    expect((await pedir(primero.id_alumno)).status).toBe(201);

    const respuesta = await pedir(segundo.id_alumno);

    expect(respuesta.status).toBe(409);
    expect(await prisma.registros_progreso.count({ where: { id_alumno: segundo.id_alumno } })).toBe(0);
  });
});

describe("PI-38: la reserva de cupo de una pre-inscripción sin pagar vence", () => {
  const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;
  const haceDias = (dias: number) => new Date(fechaActualArgentina().getTime() - dias * UN_DIA_EN_MS);
  const enFormatoApi = (dias: number) => haceDias(dias).toISOString();

  // La API no deja pre-inscribir con una fecha de inicio pasada: el paso del tiempo se simula en la base.
  async function preinscribirQueEmpezoHace(dias: number, idHorario: number) {
    const alumno = await crearAlumno(prisma);
    const creada = await inscribir(alumno.id_alumno, [idHorario]);
    await prisma.inscripciones.update({
      where: { id_inscripcion: creada.body.id_inscripcion },
      data: { fecha_inicio: haceDias(dias) },
    });
    return creada.body.id_inscripcion as number;
  }

  it("guarda el lugar hasta 3 días después del inicio, ese día incluido", async () => {
    const idHorario = await crearHorarioConCupo(1);
    const idReserva = await preinscribirQueEmpezoHace(3, idHorario);
    const otro = await crearAlumno(prisma);

    const rechazada = await inscribir(otro.id_alumno, [idHorario]);
    const reserva = await comoMarina("get", `/inscripciones/${idReserva}`);
    const horario = await comoMarina("get", `/horarios/${idHorario}`);

    expect(rechazada.status).toBe(409);
    expect(reserva.body.reserva).toEqual({ vence: enFormatoApi(0), vencida: false });
    expect(horario.body).toMatchObject({ inscriptos: 1, cupo_disponible: 0 });
  });

  it("pasado el plazo el lugar queda libre, la reserva figura vencida y la pre-inscripción sigue vigente", async () => {
    const idHorario = await crearHorarioConCupo(1);
    const idReserva = await preinscribirQueEmpezoHace(4, idHorario);
    const otro = await crearAlumno(prisma);

    const horario = await comoMarina("get", `/horarios/${idHorario}`);
    const listado = await comoMarina("get", "/inscripciones?estado=PREINSCRIPTA");
    const nueva = await inscribir(otro.id_alumno, [idHorario]);

    expect(horario.body).toMatchObject({ inscriptos: 0, cupo_disponible: 1 });
    const vencida = listado.body.find((i: { id_inscripcion: number }) => i.id_inscripcion === idReserva);
    expect(vencida.reserva).toEqual({ vence: enFormatoApi(1), vencida: true });
    expect(nueva.status).toBe(201);
    expect(nueva.body.reserva).toEqual({ vence: enFormatoApi(-3), vencida: false });
    expect((await obtenerInscripcion(idReserva))?.estado).toBe("PREINSCRIPTA");
  });

  it("el pago tardío activa si el lugar sigue libre y no tiene cupo si otro lo ocupó", async () => {
    const libre = await crearHorarioConCupo(1);
    const idSinCompetencia = await preinscribirQueEmpezoHace(4, libre);
    const ocupado = await crearHorarioConCupo(1);
    const idDesplazada = await preinscribirQueEmpezoHace(4, ocupado);
    await inscribir((await crearAlumno(prisma)).id_alumno, [ocupado]);

    await infoInscripciones.activar(idSinCompetencia);

    expect((await obtenerInscripcion(idSinCompetencia))?.estado).toBe("ACTIVA");
    await expect(infoInscripciones.activar(idDesplazada)).rejects.toThrow("No hay cupo disponible");
    expect((await obtenerInscripcion(idDesplazada))?.estado).toBe("PREINSCRIPTA");
  });

  it("el plazo sale de DIAS_RESERVA_PREINSCRIPCION: con 7 días la misma pre-inscripción vuelve a ocupar el lugar", async () => {
    await prisma.parametros_sistema.update({
      where: { clave: "DIAS_RESERVA_PREINSCRIPCION" },
      data: { valor: "7" },
    });
    const idHorario = await crearHorarioConCupo(1);
    const idReserva = await preinscribirQueEmpezoHace(4, idHorario);
    const otro = await crearAlumno(prisma);

    const rechazada = await inscribir(otro.id_alumno, [idHorario]);
    const reserva = await comoMarina("get", `/inscripciones/${idReserva}`);

    expect(rechazada.status).toBe(409);
    expect(reserva.body.reserva).toEqual({ vence: enFormatoApi(-3), vencida: false });
  });

  it("cambiar de plan conserva el inicio de la pre-inscripción y no renueva su reserva", async () => {
    const idHorario = await crearHorarioConCupo(2);
    const idReserva = await preinscribirQueEmpezoHace(4, idHorario);
    const nuevoPlan = await crearPlan(prisma, { nombre: "Plan de la reserva vencida" });

    const cambio = await comoMarina("post", `/inscripciones/${idReserva}/cambio-plan`).send({
      id_plan: nuevoPlan.id_plan,
      id_profesora: datosDemo.idProfesora.get(LUCIA),
      ids_horarios: [idHorario],
    });

    expect(cambio.status).toBe(200);
    expect(cambio.body).toMatchObject({
      estado: "PREINSCRIPTA",
      fecha_inicio: enFormatoApi(4),
      reserva: { vence: enFormatoApi(1), vencida: true },
    });
    const horario = await comoMarina("get", `/horarios/${idHorario}`);
    expect(horario.body).toMatchObject({ inscriptos: 0, cupo_disponible: 2 });
  });

  it("una pre-inscripción con la reserva vencida sigue en el horario y no deja darlo de baja", async () => {
    const idHorario = await crearHorarioConCupo(1);
    await preinscribirQueEmpezoHace(4, idHorario);

    const baja = await comoMarina("delete", `/horarios/${idHorario}`);

    expect(baja.status).toBe(409);
    expect(await prisma.horarios.findUnique({ where: { id_horario: idHorario } })).toMatchObject({
      fecha_baja: null,
    });
  });
});

describe("PI-41: el detalle de la baja con el motivo OTRO", () => {
  const DETALLE = "Se pasó a un gimnasio más cerca de su casa";

  async function alumnoConDosInscripciones() {
    const alumno = await crearAlumno(prisma);
    const horarios = await horariosFuncionales();
    const basico = await inscribir(alumno.id_alumno, [horarios[0].id_horario]);
    const intermedio = await inscribir(
      alumno.id_alumno,
      [horarios[1].id_horario],
      datosDemo.idPlan.get("Intermedio"),
    );
    expect([basico.status, intermedio.status]).toEqual([201, 201]);
    return { idAlumno: alumno.id_alumno, ids: [basico.body.id_inscripcion, intermedio.body.id_inscripcion] };
  }

  function bajasDe(idAlumno: number) {
    return comoMarina("get", `/inscripciones?id_alumno=${idAlumno}&estado=BAJA`);
  }

  it("guarda el detalle en todas las inscripciones vigentes y el listado de bajas lo devuelve", async () => {
    const { idAlumno, ids } = await alumnoConDosInscripciones();

    const baja = await comoMarina("post", `/alumnos/${idAlumno}/baja`).send({
      motivo_baja: "OTRO",
      detalle_baja: DETALLE,
    });

    expect(baja.status).toBe(200);
    const guardadas = await prisma.inscripciones.findMany({
      where: { id_inscripcion: { in: ids } },
      select: { estado: true, motivo_baja: true, detalle_baja: true },
    });
    expect(guardadas).toEqual([
      { estado: "BAJA", motivo_baja: "OTRO", detalle_baja: DETALLE },
      { estado: "BAJA", motivo_baja: "OTRO", detalle_baja: DETALLE },
    ]);
    const listado = await bajasDe(idAlumno);
    expect(listado.status).toBe(200);
    expect(listado.body.map((inscripcion: { detalle_baja: string }) => inscripcion.detalle_baja)).toEqual([
      DETALLE,
      DETALLE,
    ]);
  });

  it("acepta el motivo OTRO sin detalle, o con el detalle vacío, y deja la columna en null", async () => {
    const sinDetalle = await crearAlumno(prisma);
    const conDetalleVacio = await crearAlumno(prisma);
    const [horario] = await horariosFuncionales();
    await inscribir(sinDetalle.id_alumno, [horario.id_horario]);
    await inscribir(conDetalleVacio.id_alumno, [horario.id_horario]);

    const respuestas = await Promise.all([
      comoMarina("post", `/alumnos/${sinDetalle.id_alumno}/baja`).send({ motivo_baja: "OTRO" }),
      comoMarina("post", `/alumnos/${conDetalleVacio.id_alumno}/baja`).send({
        motivo_baja: "OTRO",
        detalle_baja: "   ",
      }),
    ]);

    expect(respuestas.map(({ status }) => status)).toEqual([200, 200]);
    const guardadas = await prisma.inscripciones.findMany({
      where: { id_alumno: { in: [sinDetalle.id_alumno, conDetalleVacio.id_alumno] } },
      select: { motivo_baja: true, detalle_baja: true },
    });
    expect(guardadas).toEqual([
      { motivo_baja: "OTRO", detalle_baja: null },
      { motivo_baja: "OTRO", detalle_baja: null },
    ]);
  });

  it("rechaza el detalle con otro motivo o de más de 200 caracteres, sin dar de baja nada", async () => {
    const { idAlumno, ids } = await alumnoConDosInscripciones();
    const antes = await prisma.inscripciones.findMany({ where: { id_inscripcion: { in: ids } } });

    const conOtroMotivo = await comoMarina("post", `/alumnos/${idAlumno}/baja`).send({
      motivo_baja: "MUDANZA",
      detalle_baja: DETALLE,
    });
    const muyLargo = await comoMarina("post", `/alumnos/${idAlumno}/baja`).send({
      motivo_baja: "OTRO",
      detalle_baja: "a".repeat(201),
    });

    for (const respuesta of [conOtroMotivo, muyLargo]) {
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error.code).toBe("VALIDATION_ERROR");
    }
    expect(await prisma.inscripciones.findMany({ where: { id_inscripcion: { in: ids } } })).toEqual(antes);
    expect(await prisma.alumnos.findUnique({ where: { id_alumno: idAlumno } })).toMatchObject({
      estado: "INACTIVO",
    });
  });

  it("la base rechaza un detalle sin el motivo OTRO aunque se saltee la API", async () => {
    const { ids } = await alumnoConDosInscripciones();

    await expect(
      prisma.inscripciones.update({
        where: { id_inscripcion: ids[0] },
        data: { estado: "BAJA", motivo_baja: "CAMBIO_PLAN", detalle_baja: DETALLE },
      }),
    ).rejects.toThrow(/ck_inscripciones_x2/);
    expect(await prisma.inscripciones.findUnique({ where: { id_inscripcion: ids[0] } })).toMatchObject({
      estado: "PREINSCRIPTA",
      detalle_baja: null,
    });
  });
});

describe("PI-44: reactivar a quien nunca pagó", () => {
  async function estadoDelAlumno(idAlumno: number) {
    return prisma.alumnos.findUniqueOrThrow({
      where: { id_alumno: idAlumno },
      select: {
        estado: true,
        usuario: { select: { estado: true, roles: { select: { rol: { select: { codigo: true } } } } } },
      },
    });
  }

  function login(email: string) {
    return request(app).post("/api/v1/auth/google").send({ id_token: email });
  }

  it("vuelve como pre-inscripto, sin acceso, y el primer pago le da el alta con su rol", async () => {
    const alumno = await crearAlumno(prisma, { email: "sin.pago@example.com" });
    const [horario] = await horariosFuncionales();
    const anterior = await inscribir(alumno.id_alumno, [horario.id_horario]);
    await darDeBaja(alumno.id_alumno);

    const reactivacion = await comoMarina("post", `/alumnos/${alumno.id_alumno}/reactivar`).send({
      id_plan: datosDemo.idPlan.get("Básico"),
      id_profesora: datosDemo.idProfesora.get(LUCIA),
      ids_horarios: [horario.id_horario],
    });

    expect(reactivacion.status).toBe(201);
    expect(reactivacion.body).toMatchObject({ estado: "PREINSCRIPTA", reserva: { vencida: false } });
    expect((await obtenerInscripcion(anterior.body.id_inscripcion))?.estado).toBe("BAJA");
    expect(await estadoDelAlumno(alumno.id_alumno)).toEqual({
      estado: "INACTIVO",
      usuario: { estado: "INACTIVO", roles: [] },
    });
    expect((await login("sin.pago@example.com")).status).toBe(403);

    expect((await cobrarEnEfectivo(reactivacion.body.id_inscripcion, 25000)).status).toBe(201);

    expect((await obtenerInscripcion(reactivacion.body.id_inscripcion))?.estado).toBe("ACTIVA");
    expect(await estadoDelAlumno(alumno.id_alumno)).toEqual({
      estado: "ACTIVO",
      usuario: { estado: "ACTIVO", roles: [{ rol: { codigo: "ALUMNO" } }] },
    });
    expect((await login("sin.pago@example.com")).status).toBe(200);
  });
});
