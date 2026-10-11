import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO, type DatosDemoCargados } from "../../shared/db/datos-demo.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";

// Casos PI-04 a PI-06 del plan de pruebas de integración, sobre los mismos datos que carga db:seed:demo:
// Marina (propietaria y profesora), Lucía y Carla (profesoras), Funcional Grupal y Entrenamiento Personalizado.
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
    expect(entrenamientoPersonalizado.body).toHaveLength(2);
    expect(
      entrenamientoPersonalizado.body.map((h: { cupo_maximo_efectivo: number }) => h.cupo_maximo_efectivo),
    ).toEqual([4, 4]);
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
    const deMarina = await comoMarina("get", `/horarios?id_profesora=${idProfesora(EMAIL_MULTIROL_DEMO)}`);

    expect(conCupoPropio.status).toBe(201);
    expect(conCupoPropio.body.cupo_maximo_efectivo).toBe(2);
    expect(deMarina.body).toHaveLength(1);
    expect(deMarina.body[0]).toMatchObject({ dia_semana: VIERNES, cupo_maximo_efectivo: 12 });
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
        hora_inicio: "18:30",
        hora_fin: "19:30",
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
  it("la descripción nueva de una actividad se ve en todos sus horarios", async () => {
    const modificar = await comoMarina("patch", `/actividades/${idActividad("FUNCIONAL")}`).send({
      descripcion: "Circuito funcional de alta intensidad",
    });
    const horarios = await comoMarina("get", `/horarios?id_actividad=${idActividad("FUNCIONAL")}`);

    expect(modificar.status).toBe(200);
    expect(horarios.body).toHaveLength(3);
    for (const horario of horarios.body) {
      expect(horario.actividad.descripcion).toBe("Circuito funcional de alta intensidad");
    }
  });

  it("no se puede dar de baja una actividad con alumnos inscriptos en sus horarios", async () => {
    // En el escenario, Sofía está inscripta en Funcional los lunes y los miércoles.
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
    ).toBe(3);
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
    const respuesta = await comoMarina("patch", `/actividades/${idActividad("FUNCIONAL")}`).send({
      modalidad: "PERSONALIZADA",
    });

    expect(respuesta.status).toBe(400);
    const funcional = await prisma.actividades.findUnique({
      where: { id_actividad: idActividad("FUNCIONAL") },
    });
    expect(funcional?.modalidad).toBe("GRUPAL");
  });
});
