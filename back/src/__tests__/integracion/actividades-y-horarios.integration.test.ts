import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  ALUMNOS_DEMO,
  cargarDatosDemo,
  EMAIL_MULTIROL_DEMO,
  type DatosDemoCargados,
} from "../../shared/db/datos-demo.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";

// Casos PI-04 a PI-06 del plan de pruebas de integración, sobre los mismos datos que carga db:seed:demo:
// Marina (propietaria y profesora), Lucía y Carla (profesoras) y la grilla semanal del centro.
const entorno = crearEntornoDeIntegracion();
const { app, prisma } = entorno;

const LUNES = 1;
const VIERNES = 5;
const SABADO = 6;
const DOMINGO = 7;
const LUCIA = "lucia.gomez@example.com";
const CARLA = "carla.ruiz@example.com";

let datos: DatosDemoCargados;
let tokenMarina: string;

function idActividad(codigo: string): number {
  return datos.idActividad.get(codigo) as number;
}

function idProfesora(email: string): number {
  return datos.idProfesora.get(email) as number;
}

function comoMarina(metodo: "get" | "post" | "patch" | "delete", ruta: string) {
  return request(app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${tokenMarina}`);
}

function crearHorario(horario: Record<string, unknown>) {
  return comoMarina("post", "/horarios").send(horario);
}

beforeEach(async () => {
  await reiniciarBase(prisma);
  datos = await cargarDatosDemo(prisma);
  tokenMarina = await entorno.iniciarSesion(EMAIL_MULTIROL_DEMO);
});
afterAll(() => entorno.cerrar());

describe("PI-04: actividad personalizada y cupo de sus horarios", () => {
  it("una actividad personalizada sin cupo se rechaza y no se guarda", async () => {
    const respuesta = await comoMarina("post", "/actividades").send({
      codigo: "POSING",
      nombre: "Posing",
      modalidad: "PERSONALIZADA",
    });

    expect(respuesta.status).toBe(400);
    expect(await prisma.actividades.count({ where: { codigo: "POSING" } })).toBe(0);
  });

  it("un horario sin cupo propio toma el cupo de su actividad", async () => {
    const actividad = await comoMarina("post", "/actividades").send({
      codigo: "POSING",
      nombre: "Posing",
      modalidad: "PERSONALIZADA",
      cupo_maximo: 3,
    });

    const horario = await crearHorario({
      id_actividad: actividad.body.id_actividad,
      id_profesora: idProfesora(CARLA),
      dia_semana: LUNES,
      hora_inicio: "09:00",
      hora_fin: "10:00",
    });
    const entrenamientoPersonalizado = await comoMarina(
      "get",
      `/horarios?id_actividad=${idActividad("ENTRENAMIENTO_PERS")}`,
    );

    expect(actividad.status).toBe(201);
    expect(horario.status).toBe(201);
    expect(horario.body.cupo_maximo_efectivo).toBe(3);
    // Personalizado se da lunes, miércoles y viernes a las 15 y martes y jueves a las 18.
    expect(
      entrenamientoPersonalizado.body.map((h: { cupo_maximo_efectivo: number }) => h.cupo_maximo_efectivo),
    ).toEqual([4, 4, 4, 4, 4]);
  });

  it("el cupo propio de un horario manda sobre el de su actividad", async () => {
    const conCupoPropio = await crearHorario({
      id_actividad: idActividad("ENTRENAMIENTO_PERS"),
      id_profesora: idProfesora(CARLA),
      dia_semana: LUNES,
      hora_inicio: "11:00",
      hora_fin: "12:00",
      cupo_maximo: 2,
    });
    const training = await comoMarina("get", `/horarios?id_actividad=${idActividad("TRAINING")}`);

    expect(conCupoPropio.status).toBe(201);
    expect(conCupoPropio.body.cupo_maximo_efectivo).toBe(2);
    // Training tiene cupo 12; el del viernes, 15 propio (CA-07).
    expect(
      training.body.map((h: { dia_semana: number; cupo_maximo_efectivo: number }) => [
        h.dia_semana,
        h.cupo_maximo_efectivo,
      ]),
    ).toEqual([
      [LUNES, 12],
      [3, 12],
      [VIERNES, 15],
    ]);
  });

  it("una actividad grupal sin cupo se crea y se asigna sin cupo", async () => {
    const actividad = await comoMarina("post", "/actividades").send({
      codigo: "FUNC_SABADO",
      nombre: "Funcional Sábado",
      modalidad: "GRUPAL",
    });

    const horario = await crearHorario({
      id_actividad: actividad.body.id_actividad,
      id_profesora: idProfesora(LUCIA),
      dia_semana: SABADO,
      hora_inicio: "10:00",
      hora_fin: "11:00",
    });

    expect(actividad.status).toBe(201);
    expect(horario.status).toBe(201);
    expect(horario.body.cupo_maximo_efectivo).toBeNull();
  });
});

describe("PI-05: validaciones al asignar profesora y horario", () => {
  async function esperarRechazoSinCambios(
    pedido: Promise<request.Response>,
    status: number,
  ): Promise<request.Response> {
    const horariosAntes = await prisma.horarios.count();
    const respuesta = await pedido;

    expect(respuesta.status).toBe(status);
    expect(await prisma.horarios.count()).toBe(horariosAntes);
    return respuesta;
  }

  it("no se le puede asignar a una profesora un horario que se superpone con otro suyo", async () => {
    const respuesta = await esperarRechazoSinCambios(
      crearHorario({
        id_actividad: idActividad("ENTRENAMIENTO_PERS"),
        id_profesora: idProfesora(LUCIA),
        dia_semana: LUNES,
        hora_inicio: "18:30",
        hora_fin: "19:30",
      }),
      409,
    );

    expect(respuesta.body.error.message).toBe("La profesora ya tiene un horario superpuesto ese día");
  });

  it("dos profesoras distintas pueden dictar a la misma hora", async () => {
    const respuesta = await crearHorario({
      id_actividad: idActividad("FUNCIONAL"),
      id_profesora: idProfesora(EMAIL_MULTIROL_DEMO),
      dia_semana: LUNES,
      hora_inicio: "18:00",
      hora_fin: "19:00",
    });

    expect(respuesta.status).toBe(201);
  });

  it("la propietaria tampoco puede superponer dos horarios propios", async () => {
    await esperarRechazoSinCambios(
      crearHorario({
        id_actividad: idActividad("FUNCIONAL"),
        id_profesora: idProfesora(EMAIL_MULTIROL_DEMO),
        dia_semana: VIERNES,
        hora_inicio: "20:30",
        hora_fin: "21:30",
      }),
      409,
    );
  });

  it("un horario que termina antes de empezar se rechaza", async () => {
    await esperarRechazoSinCambios(
      crearHorario({
        id_actividad: idActividad("FUNCIONAL"),
        id_profesora: idProfesora(LUCIA),
        dia_semana: SABADO,
        hora_inicio: "10:00",
        hora_fin: "09:00",
      }),
      400,
    );
  });

  it("no se le puede asignar un horario a quien ya no tiene el rol profesora", async () => {
    const carla = await prisma.usuarios.findUniqueOrThrow({ where: { email: CARLA } });
    const quitarRol = await comoMarina("delete", `/usuarios/${carla.id_usuario}/roles/PROFESORA`);

    const respuesta = await esperarRechazoSinCambios(
      crearHorario({
        id_actividad: idActividad("ENTRENAMIENTO_PERS"),
        id_profesora: idProfesora(CARLA),
        dia_semana: VIERNES,
        hora_inicio: "09:00",
        hora_fin: "10:00",
      }),
      404,
    );

    expect(quitarRol.status).toBe(200);
    expect(respuesta.body.error.message).toBe("Profesora no encontrada, inactiva o sin el rol PROFESORA");
  });

  it("no se puede asignar un horario en domingo porque el centro no abre", async () => {
    const respuesta = await esperarRechazoSinCambios(
      crearHorario({
        id_actividad: idActividad("FUNCIONAL"),
        id_profesora: idProfesora(LUCIA),
        dia_semana: DOMINGO,
        hora_inicio: "10:00",
        hora_fin: "11:00",
      }),
      400,
    );

    expect(respuesta.body.error.details.fieldErrors.dia_semana).toEqual(["El centro no abre los domingos"]);
    expect(await prisma.horarios.count({ where: { dia_semana: DOMINGO } })).toBe(0);
  });

  it("una clase puede terminar a las 23:00, el cierre del centro, y no después", async () => {
    const hastaElCierre = await crearHorario({
      id_actividad: idActividad("FUNCIONAL"),
      id_profesora: idProfesora(LUCIA),
      dia_semana: SABADO,
      hora_inicio: "22:00",
      hora_fin: "23:00",
    });
    const despuesDelCierre = await esperarRechazoSinCambios(
      crearHorario({
        id_actividad: idActividad("FUNCIONAL"),
        id_profesora: idProfesora(CARLA),
        dia_semana: SABADO,
        hora_inicio: "22:30",
        hora_fin: "23:30",
      }),
      400,
    );

    expect(hastaElCierre.status).toBe(201);
    expect(despuesDelCierre.body.error.details.fieldErrors.hora_fin).toEqual([
      "La hora debe estar entre las 07:00 y las 23:00",
    ]);
  });

  it("no se puede pasar un horario al domingo", async () => {
    const delLunes = await prisma.horarios.findFirstOrThrow({
      where: { id_profesora: idProfesora(LUCIA), dia_semana: LUNES },
    });

    const respuesta = await comoMarina("patch", `/horarios/${delLunes.id_horario}`).send({
      dia_semana: DOMINGO,
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.code).toBe("VALIDATION_ERROR");
    const despues = await prisma.horarios.findUniqueOrThrow({ where: { id_horario: delLunes.id_horario } });
    expect(despues.dia_semana).toBe(LUNES);
  });
});

describe("PI-06: modificación y baja de actividades con horarios", () => {
  // Lunes, miércoles y viernes a las 8, 21 y 22, y martes y jueves a las 15.
  const HORARIOS_DE_FUNCIONAL = 11;

  it("la descripción nueva de una actividad se ve en todos sus horarios", async () => {
    const modificar = await comoMarina("patch", `/actividades/${idActividad("FUNCIONAL")}`).send({
      descripcion: "Circuito funcional de alta intensidad",
    });
    const horarios = await comoMarina("get", `/horarios?id_actividad=${idActividad("FUNCIONAL")}`);

    expect(modificar.status).toBe(200);
    expect(horarios.body).toHaveLength(HORARIOS_DE_FUNCIONAL);
    for (const horario of horarios.body) {
      expect(horario.actividad.descripcion).toBe("Circuito funcional de alta intensidad");
    }
  });

  it("no se puede dar de baja una actividad con alumnos inscriptos en sus horarios", async () => {
    // En el escenario, Sofía está inscripta en Funcional los lunes y los miércoles a las 8.
    const respuesta = await comoMarina("delete", `/actividades/${idActividad("FUNCIONAL")}`);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.message).toBe(
      "La actividad tiene 2 horario(s) con alumnos inscriptos: hay que reubicarlos antes de darla de baja",
    );
    const funcional = await prisma.actividades.findUnique({
      where: { id_actividad: idActividad("FUNCIONAL") },
    });
    expect(funcional?.activo).toBe(true);
    expect(
      await prisma.horarios.count({ where: { id_actividad: idActividad("FUNCIONAL"), fecha_baja: null } }),
    ).toBe(HORARIOS_DE_FUNCIONAL);
  });

  it("la baja de una actividad sin alumnos da de baja también sus horarios", async () => {
    const actividad = await comoMarina("post", "/actividades").send({
      codigo: "YOGA",
      nombre: "Yoga",
      modalidad: "GRUPAL",
    });
    const idYoga = actividad.body.id_actividad;
    for (const email of [LUCIA, CARLA]) {
      const creado = await crearHorario({
        id_actividad: idYoga,
        id_profesora: idProfesora(email),
        dia_semana: SABADO,
        hora_inicio: "10:00",
        hora_fin: "11:00",
      });
      expect(creado.status).toBe(201);
    }

    const respuesta = await comoMarina("delete", `/actividades/${idYoga}`);

    expect(respuesta.status).toBe(200);
    expect(await prisma.actividades.findUnique({ where: { id_actividad: idYoga } })).toMatchObject({
      activo: false,
    });
    expect(await prisma.horarios.count({ where: { id_actividad: idYoga } })).toBe(2);
    expect(await prisma.horarios.count({ where: { id_actividad: idYoga, fecha_baja: null } })).toBe(0);
  });

  it("una actividad sin horarios se da de baja", async () => {
    const actividad = await comoMarina("post", "/actividades").send({
      codigo: "RETO_3M",
      nombre: "Reto 3M",
      modalidad: "GRUPAL",
    });

    const respuesta = await comoMarina("delete", `/actividades/${actividad.body.id_actividad}`);

    expect(respuesta.status).toBe(200);
    const reto3m = await prisma.actividades.findUnique({
      where: { id_actividad: actividad.body.id_actividad },
    });
    expect(reto3m?.activo).toBe(false);
  });

  // Yoga con un horario sin alumnos y un plan que solo sirve para Yoga.
  async function yogaConPlanExclusivo() {
    const actividad = await comoMarina("post", "/actividades").send({
      codigo: "YOGA",
      nombre: "Yoga",
      modalidad: "GRUPAL",
    });
    const idYoga = actividad.body.id_actividad as number;
    const horario = await crearHorario({
      id_actividad: idYoga,
      id_profesora: idProfesora(LUCIA),
      dia_semana: SABADO,
      hora_inicio: "10:00",
      hora_fin: "11:00",
    });
    const plan = await comoMarina("post", "/planes").send({
      tipo: "MENSUAL",
      nombre: "Yoga 2 días",
      clases_por_semana: 2,
      dias_gracia: 5,
      precio: 20000,
      id_actividad_exclusiva: idYoga,
    });
    expect([horario.status, plan.status]).toEqual([201, 201]);
    return { idYoga, idPlan: plan.body.id_plan as number };
  }

  it("no se puede dar de baja una actividad con planes vigentes que son solo de ella", async () => {
    const { idYoga, idPlan } = await yogaConPlanExclusivo();

    const respuesta = await comoMarina("delete", `/actividades/${idYoga}`);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.message).toBe(
      "La actividad tiene planes vigentes que son solo de ella (Yoga 2 días): " +
        "dalos de baja o pasalos a otra actividad antes de darla de baja",
    );
    expect(await prisma.actividades.findUnique({ where: { id_actividad: idYoga } })).toMatchObject({
      activo: true,
    });
    expect(await prisma.horarios.count({ where: { id_actividad: idYoga, fecha_baja: null } })).toBe(1);
    expect(await prisma.planes.findUnique({ where: { id_plan: idPlan } })).toMatchObject({
      fecha_baja: null,
    });
  });

  it("con sus planes exclusivos dados de baja, la actividad se da de baja; los planes generales no la frenan", async () => {
    const { idYoga, idPlan } = await yogaConPlanExclusivo();
    expect((await comoMarina("delete", `/planes/${idPlan}`)).status).toBe(200);

    const respuesta = await comoMarina("delete", `/actividades/${idYoga}`);

    expect(respuesta.status).toBe(200);
    expect(await prisma.actividades.findUnique({ where: { id_actividad: idYoga } })).toMatchObject({
      activo: false,
    });
    expect(await prisma.horarios.count({ where: { id_actividad: idYoga, fecha_baja: null } })).toBe(0);
    // El escenario trae planes vigentes para cualquier actividad (Básico, Intermedio, Clase suelta).
    expect(
      await prisma.planes.count({ where: { id_actividad_exclusiva: null, fecha_baja: null } }),
    ).toBeGreaterThan(0);
  });

  it("una actividad no puede pasar a personalizada sin cupo", async () => {
    const actividad = await comoMarina("post", "/actividades").send({
      codigo: "YOGA",
      nombre: "Yoga",
      modalidad: "GRUPAL",
    });

    const respuesta = await comoMarina("patch", `/actividades/${actividad.body.id_actividad}`).send({
      modalidad: "PERSONALIZADA",
    });

    expect(respuesta.status).toBe(400);
    const yoga = await prisma.actividades.findUnique({
      where: { id_actividad: actividad.body.id_actividad },
    });
    expect(yoga?.modalidad).toBe("GRUPAL");
  });
});

describe("PI-46: las actividades públicas del centro", () => {
  const LUNES_A_VIERNES = [1, 2, 3, 4, 5];

  function consultarActividades() {
    return request(app).get("/api/v1/publico/actividades");
  }

  function actividad(respuesta: request.Response, nombre: string) {
    return respuesta.body.actividades.find((a: { nombre: string }) => a.nombre === nombre);
  }

  it("un visitante sin sesión ve las actividades con sus días, y la grilla de horarios no es pública", async () => {
    const publicas = await consultarActividades();
    const disponibilidad = await request(app).get("/api/v1/publico/disponibilidad");
    const grilla = await request(app).get("/api/v1/horarios");

    expect(publicas.status).toBe(200);
    expect(publicas.headers["cache-control"]).toBe("public, max-age=60");
    expect(publicas.body.actividades).toHaveLength(8);
    expect(actividad(publicas, "Funcional")).toEqual({
      id_actividad: idActividad("FUNCIONAL"),
      nombre: "Funcional",
      descripcion: "Entrenamiento funcional en grupo",
      modalidad: "GRUPAL",
      dias: LUNES_A_VIERNES,
      clases_por_semana: 11,
    });
    expect(actividad(publicas, "Combat")).toMatchObject({ dias: [2, 4], clases_por_semana: 2 });
    // Ni horas, ni profesoras, ni cupos, ni datos de alumnos.
    const texto = JSON.stringify(publicas.body);
    for (const campo of ["hora_inicio", "profesora", "cupo", "Lucía", "@"]) {
      expect(texto).not.toContain(campo);
    }
    for (const alumno of ALUMNOS_DEMO) {
      expect(texto).not.toContain(alumno.dni);
    }
    expect(disponibilidad.status).toBe(404);
    expect(grilla.status).toBe(401);
  });

  it("una actividad sin horarios vigentes deja de ofrecerse y la baja de un horario se refleja en sus días", async () => {
    const delCombat = await prisma.horarios.findMany({ where: { id_actividad: idActividad("COMBAT") } });
    const trainingDelViernes = await prisma.horarios.findFirstOrThrow({
      where: { id_actividad: idActividad("TRAINING"), dia_semana: VIERNES },
    });
    for (const { id_horario } of [...delCombat, trainingDelViernes]) {
      expect((await comoMarina("delete", `/horarios/${id_horario}`)).status).toBe(200);
    }

    const publicas = await consultarActividades();

    expect(actividad(publicas, "Combat")).toBeUndefined();
    expect(actividad(publicas, "Training")).toMatchObject({ dias: [LUNES, 3], clases_por_semana: 2 });
    expect(publicas.body.actividades).toHaveLength(7);
  });
});
