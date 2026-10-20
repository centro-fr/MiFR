import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
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
  darRol,
} from "./fabricas.js";

// Casos PI-74 a PI-77: el informe de asistencia (US-33) y la ocupación de los horarios (US-37), que ve
// solo la propietaria. Ana, Beto y Caro están activos; Dani está dado de baja con su inscripción todavía
// activa y Eva sigue pre-inscripta.
const entorno = crearEntornoDeIntegracion();
const { prisma } = entorno;
const INICIO = new Date("2026-09-01T00:00:00Z");

type Nombre = "ana" | "beto" | "caro" | "dani" | "eva";
let ids: Record<Nombre, number>;
let inscripcionEnFuncional: Record<Nombre, number>;
let emailPropietaria: string;
let emailAlumna: string;
let titular: { id_profesora: number; id_usuario: number; email: string };
let suplente: { id_profesora: number };
let funcional: { id_actividad: number; id_horario: number };
let personalizado: { id_actividad: number; id_horario: number };
let libre: { id_horario: number };

beforeEach(async () => {
  await reiniciarBase(prisma);
  emailPropietaria = (await crearUsuario(prisma, { roles: ["PROPIETARIA"] })).email;
  titular = await crearProfesora(prisma);
  suplente = await crearProfesora(prisma);

  const actividadFuncional = await crearActividad(prisma);
  const actividadPersonalizada = await crearActividad(prisma, { modalidad: "PERSONALIZADA", cupo_maximo: 2 });
  const actividadSinCupo = await crearActividad(prisma);
  const horario = (
    id_actividad: number,
    id_profesora: number,
    dia_semana: number,
    cupo_maximo: number | null,
  ) =>
    crearHorarioDePrueba(prisma, {
      id_actividad,
      id_profesora,
      dia_semana,
      hora_inicio: "18:00",
      hora_fin: "19:00",
      cupo_maximo,
      fecha_alta: INICIO,
    });
  funcional = {
    ...actividadFuncional,
    ...(await horario(actividadFuncional.id_actividad, titular.id_profesora, 1, 4)),
  };
  personalizado = {
    ...actividadPersonalizada,
    ...(await horario(actividadPersonalizada.id_actividad, titular.id_profesora, 2, null)),
  };
  libre = await horario(actividadSinCupo.id_actividad, suplente.id_profesora, 3, null);
  const deBaja = await horario(actividadFuncional.id_actividad, titular.id_profesora, 4, 4);
  await prisma.horarios.update({ where: { id_horario: deBaja.id_horario }, data: { fecha_baja: INICIO } });

  const alumna = await crearAlumno(prisma, { nombre: "Ana", apellido: "Paz", estado: "ACTIVO" });
  await darRol(prisma, alumna.id_usuario, "ALUMNO");
  emailAlumna =
    (await prisma.usuarios.findUniqueOrThrow({ where: { id_usuario: alumna.id_usuario } })).email ?? "";
  ids = {
    ana: alumna.id_alumno,
    beto: (await crearAlumno(prisma, { nombre: "Beto", apellido: "Ruiz", estado: "ACTIVO" })).id_alumno,
    caro: (await crearAlumno(prisma, { nombre: "Caro", apellido: "Sosa", estado: "ACTIVO" })).id_alumno,
    dani: (await crearAlumno(prisma, { nombre: "Dani", apellido: "Vera", estado: "BAJA" })).id_alumno,
    eva: (await crearAlumno(prisma, { nombre: "Eva", apellido: "Zárate" })).id_alumno,
  };

  const plan = await crearPlan(prisma);
  const inscribir = (nombre: Nombre, id_horario: number, estado: "ACTIVA" | "PREINSCRIPTA" = "ACTIVA") =>
    crearInscripcionDePrueba(prisma, {
      id_alumno: ids[nombre],
      plan,
      id_profesora: titular.id_profesora,
      id_horario,
      estado,
      fecha_inicio: INICIO,
    });
  inscripcionEnFuncional = {} as typeof inscripcionEnFuncional;
  for (const nombre of ["ana", "beto", "caro", "dani"] as const) {
    inscripcionEnFuncional[nombre] = (await inscribir(nombre, funcional.id_horario)).id_inscripcion;
  }
  inscripcionEnFuncional.eva = (await inscribir("eva", funcional.id_horario, "PREINSCRIPTA")).id_inscripcion;
  await inscribir("ana", personalizado.id_horario);
  await inscribir("beto", personalizado.id_horario);
});

afterAll(() => entorno.cerrar());

async function pedir(ruta: string, email = emailPropietaria) {
  const token = await entorno.iniciarSesion(email);
  return request(entorno.app).get(`/api/v1/reportes${ruta}`).set("Authorization", `Bearer ${token}`);
}

function marcas(presentes: Partial<Record<Nombre, boolean>>, id_usuario_registra?: number) {
  return (Object.entries(presentes) as [Nombre, boolean][]).map(([nombre, asistio]) => ({
    id_alumno: ids[nombre],
    id_inscripcion: inscripcionEnFuncional[nombre],
    asistio,
    id_usuario_registra,
  }));
}

// En Funcional: el 1/9 la dicta la titular, el 2/9 la suplente, el 3/9 se cancela y el 7/9 la titular
// marca solo a Ana; el cierre automático registra ausentes a Beto y Caro. La del 10/9 sigue abierta.
async function cargarSeptiembre(): Promise<void> {
  const clase = (
    dia: number,
    id_prof_dictante: number,
    estado: "DICTADA" | "PROGRAMADA" | "CANCELADA",
    conMarcas = marcas({}),
  ) =>
    crearClase(prisma, {
      id_horario: funcional.id_horario,
      fecha_clase: new Date(Date.UTC(2026, 8, dia)),
      id_prof_dictante,
      estado,
      marcas: conMarcas,
    });
  await clase(1, titular.id_profesora, "DICTADA", marcas({ ana: true, beto: true, caro: false, dani: true }));
  await clase(2, suplente.id_profesora, "DICTADA", marcas({ ana: true, beto: false, caro: true }));
  await clase(3, titular.id_profesora, "CANCELADA");
  await clase(7, titular.id_profesora, "PROGRAMADA", marcas({ ana: true }, titular.id_usuario));
  // 07/09 a las 20:30 de Argentina: la clase de las 18 ya terminó.
  await entorno.cierreAsistencia.procesarCierresAutomaticos(new Date("2026-09-07T23:30:00Z"));
  // Sigue abierta: sus marcas todavía pueden cambiar y no cuentan.
  await clase(
    10,
    titular.id_profesora,
    "PROGRAMADA",
    marcas({ ana: false, beto: false }, titular.id_usuario),
  );
}

const SEPTIEMBRE = "desde=2026-09-01&hasta=2026-09-30";

describe("PI-74: el informe de asistencia", () => {
  it("cuenta solo clases dictadas, con las inasistencias del cierre automático y la suplente como dictante", async () => {
    await cargarSeptiembre();
    expect(
      await prisma.asistencias.count({
        where: {
          asistio: false,
          id_usuario_registra: null,
          clase: { fecha_clase: new Date("2026-09-07T00:00:00Z") },
        },
      }),
    ).toBe(2);

    const respuesta = await pedir(`/asistencia?${SEPTIEMBRE}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      periodo: { desde: "2026-09-01", hasta: "2026-09-30" },
      resumen: { clases_dictadas: 3, asistencias: 5, inasistencias: 4, porcentaje_asistencia: 55.56 },
      total: 3,
    });
    expect(respuesta.body.datos).toEqual([
      expect.objectContaining({
        nombre: "Ana",
        clases_previstas: 3,
        asistencias: 3,
        inasistencias: 0,
        porcentaje_asistencia: 100,
      }),
      expect.objectContaining({
        nombre: "Beto",
        clases_previstas: 3,
        asistencias: 1,
        porcentaje_asistencia: 33.33,
      }),
      expect.objectContaining({
        nombre: "Caro",
        clases_previstas: 3,
        asistencias: 1,
        porcentaje_asistencia: 33.33,
      }),
    ]);
    const deLa = (id: number) =>
      respuesta.body.por_profesora.find(({ id_profesora }: { id_profesora: number }) => id_profesora === id);
    expect(deLa(titular.id_profesora)).toMatchObject({
      clases_dictadas: 2,
      cantidad_alumnos: 3,
      asistencias: 3,
      porcentaje_promedio: 50,
    });
    expect(deLa(suplente.id_profesora)).toMatchObject({
      clases_dictadas: 1,
      cantidad_alumnos: 3,
      asistencias: 2,
      porcentaje_promedio: 66.67,
    });
  });
});

describe("PI-75: los filtros y los permisos del informe de asistencia", () => {
  it("combina los filtros, pagina, muestra las bajas solo si se piden y responde vacío sin datos", async () => {
    await cargarSeptiembre();

    const deAnaConLaSuplente = await pedir(
      `/asistencia?${SEPTIEMBRE}&id_alumno=${ids.ana}&id_profesora=${suplente.id_profesora}&id_actividad=${funcional.id_actividad}`,
    );
    expect(deAnaConLaSuplente.body).toMatchObject({
      resumen: { clases_dictadas: 1, asistencias: 1, inasistencias: 0 },
      datos: [{ id_alumno: ids.ana, clases_previstas: 1 }],
    });

    const pagina = await pedir(`/asistencia?${SEPTIEMBRE}&limit=1&offset=1`);
    expect(pagina.body).toMatchObject({ total: 3, limit: 1, offset: 1, datos: [{ nombre: "Beto" }] });

    const conBajas = await pedir(`/asistencia?${SEPTIEMBRE}&incluir_bajas=true`);
    expect(conBajas.body.datos.at(-1)).toMatchObject({ nombre: "Dani", estado: "BAJA", clases_previstas: 1 });
    expect(conBajas.body.resumen).toMatchObject({ asistencias: 6, inasistencias: 4 });

    const otraActividad = await pedir(`/asistencia?${SEPTIEMBRE}&id_actividad=${personalizado.id_actividad}`);
    expect(otraActividad.body).toMatchObject({
      resumen: { clases_dictadas: 0, asistencias: 0, inasistencias: 0, porcentaje_asistencia: 0 },
      por_profesora: [],
      datos: [],
      total: 0,
    });
  });

  it("solo la propietaria: una profesora y un alumno reciben 403", async () => {
    expect((await pedir(`/asistencia?${SEPTIEMBRE}`, titular.email)).status).toBe(403);
    expect((await pedir(`/asistencia?${SEPTIEMBRE}`, emailAlumna)).status).toBe(403);
  });
});

describe("PI-76: la ocupación de los horarios", () => {
  it("cuenta los inscriptos activos contra el cupo del horario o de la actividad, sin pre-inscriptos ni bajas", async () => {
    const respuesta = await pedir("/ocupacion");

    expect(respuesta.status).toBe(200);
    expect(
      respuesta.body.datos.map(
        ({ id_horario, cupo_maximo, inscriptos, porcentaje_ocupacion, nivel }: Record<string, unknown>) => [
          id_horario,
          cupo_maximo,
          inscriptos,
          porcentaje_ocupacion,
          nivel,
        ],
      ),
    ).toEqual([
      [funcional.id_horario, 4, 3, 75, "MODERADO"],
      [personalizado.id_horario, 2, 2, 100, "COMPLETO"],
      [libre.id_horario, null, 0, null, "SIN_CUPO"],
    ]);
    expect(respuesta.body.resumen).toEqual({
      total_horarios: 3,
      ocupacion_total: 83.33,
      por_nivel: { LIBRE: 0, MODERADO: 1, CASI_LLENO: 0, COMPLETO: 1, SIN_CUPO: 1 },
    });
  });
});

describe("PI-77: los filtros y los permisos de la ocupación", () => {
  it("filtra por modalidad, actividad y profesora", async () => {
    const idsDe = async (query: string) =>
      (await pedir(`/ocupacion?${query}`)).body.datos.map(
        ({ id_horario }: { id_horario: number }) => id_horario,
      );

    expect(await idsDe("modalidad=PERSONALIZADA")).toEqual([personalizado.id_horario]);
    expect(await idsDe(`id_actividad=${funcional.id_actividad}`)).toEqual([funcional.id_horario]);
    expect(await idsDe(`id_profesora=${suplente.id_profesora}`)).toEqual([libre.id_horario]);
  });

  it("solo la propietaria: una profesora recibe 403", async () => {
    expect((await pedir("/ocupacion", titular.email)).status).toBe(403);
  });
});
