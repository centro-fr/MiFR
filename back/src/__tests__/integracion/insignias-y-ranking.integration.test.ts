import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cargarCatalogoInsignias } from "../../shared/db/catalogo-insignias.js";
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

// Casos PI-71 a PI-73: la racha y las insignias (US-31) y el ranking de asistencia (US-30). Ana, Beto
// y Caro (menor, con su tutor) están activos en el mismo horario; Dani está dado de baja. Las clases
// de septiembre se cargan en la base: una suplida, una cancelada y una todavía abierta.
const entorno = crearEntornoDeIntegracion();
const { prisma } = entorno;
const INICIO = new Date("2026-09-01T00:00:00Z");

type Nombre = "ana" | "beto" | "caro" | "dani";
let alumnos: Record<Nombre, { id_alumno: number; id_usuario: number; id_inscripcion: number; email: string }>;
let emailTutor: string;
let emailPropietaria: string;
let emailProfesora: string;
let idProfesora: number;
let idSuplente: number;
let idHorario: number;
let idOtraActividad: number;

async function alumnoDelPortal(
  nombre: string,
  apellido: string,
  opciones: Parameters<typeof crearAlumno>[1] = {},
): Promise<{ id_alumno: number; id_usuario: number; email: string }> {
  const alumno = await crearAlumno(prisma, { nombre, apellido, estado: "ACTIVO", ...opciones });
  await darRol(prisma, alumno.id_usuario, "ALUMNO");
  const { email } = await prisma.usuarios.findUniqueOrThrow({ where: { id_usuario: alumno.id_usuario } });
  return { ...alumno, email: email ?? "" };
}

beforeEach(async () => {
  // El cierre mensual corre en cada consulta: en septiembre cierra agosto, que no tiene clases.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-30T15:00:00Z"));
  await reiniciarBase(prisma);

  emailPropietaria = (await crearUsuario(prisma, { roles: ["PROPIETARIA"] })).email;
  const tutor = await crearUsuario(prisma, { roles: ["TUTOR"] });
  emailTutor = tutor.email;
  ({ id_profesora: idProfesora, email: emailProfesora } = await crearProfesora(prisma));
  ({ id_profesora: idSuplente } = await crearProfesora(prisma));
  const { id_actividad } = await crearActividad(prisma);
  ({ id_actividad: idOtraActividad } = await crearActividad(prisma));
  ({ id_horario: idHorario } = await crearHorarioDePrueba(prisma, {
    id_actividad,
    id_profesora: idProfesora,
    dia_semana: 1,
    hora_inicio: "18:00",
    hora_fin: "19:00",
    fecha_alta: INICIO,
  }));
  const plan = await crearPlan(prisma);

  const personas = {
    ana: await alumnoDelPortal("Ana", "Paz"),
    beto: await alumnoDelPortal("Beto", "Ruiz"),
    caro: await alumnoDelPortal("Caro", "Sosa", {
      email: null,
      fecha_nacimiento: new Date("2014-05-10T00:00:00Z"),
      id_usuario_responsable: tutor.id_usuario,
    }),
    dani: { ...(await crearAlumno(prisma, { nombre: "Dani", apellido: "Vera", estado: "BAJA" })), email: "" },
  };
  alumnos = {} as typeof alumnos;
  for (const [nombre, persona] of Object.entries(personas) as [Nombre, (typeof personas)[Nombre]][]) {
    const { id_inscripcion } = await crearInscripcionDePrueba(prisma, {
      id_alumno: persona.id_alumno,
      plan,
      id_profesora: idProfesora,
      id_horario: idHorario,
      fecha_inicio: INICIO,
    });
    alumnos[nombre] = { ...persona, id_inscripcion };
  }
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => entorno.cerrar());

// Una clase por día desde el 01/09/2026, con las marcas que se indiquen.
async function clase(
  dia: number,
  marcas: Partial<Record<Nombre, boolean>>,
  {
    estado = "DICTADA",
    dictante = idProfesora,
  }: { estado?: "DICTADA" | "PROGRAMADA" | "CANCELADA"; dictante?: number } = {},
): Promise<void> {
  await crearClase(prisma, {
    id_horario: idHorario,
    fecha_clase: new Date(Date.UTC(2026, 8, dia)),
    id_prof_dictante: dictante,
    estado,
    marcas: (Object.entries(marcas) as [Nombre, boolean][]).map(([nombre, asistio]) => ({
      id_alumno: alumnos[nombre].id_alumno,
      id_inscripcion: alumnos[nombre].id_inscripcion,
      asistio,
    })),
  });
}

// En las clases dictadas: Ana P P P A P (80 %), Beto P P P P P (100 %), Caro P P P (100 %, menos de 4
// clases) y Dani P P. La del 3 está cancelada y la del 7 sigue abierta.
async function cargarSeptiembre(): Promise<void> {
  await clase(1, { ana: true, beto: true, caro: true, dani: true });
  await clase(2, { ana: true, beto: true, caro: true, dani: true }, { dictante: idSuplente });
  await clase(3, {}, { estado: "CANCELADA" });
  await clase(4, { ana: true, beto: true, caro: true });
  await clase(5, { ana: false, beto: true });
  await clase(6, { ana: true, beto: true });
  await clase(7, { ana: false, beto: false }, { estado: "PROGRAMADA" });
}

// El catálogo real pide 10 y 50 clases: se bajan los umbrales para no cargar medio año de clases.
async function umbralesDePrueba(): Promise<void> {
  await prisma.insignias.update({ where: { codigo: "RACHA_10" }, data: { valor_umbral: 3 } });
  await prisma.insignias.update({ where: { codigo: "TOTAL_50" }, data: { valor_umbral: 4 } });
}

async function pedir(ruta: string, email: string) {
  const token = await entorno.iniciarSesion(email);
  return request(entorno.app).get(`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
}

async function obtenidas(nombre: Nombre) {
  return prisma.alumno_insignias.findMany({
    where: { id_alumno: alumnos[nombre].id_alumno },
    include: { insignia: true },
    orderBy: [{ id_insignia: "asc" }, { periodo: "asc" }],
  });
}

function insigniaDe(cuerpo: { insignias: { codigo: string }[] }, codigo: string) {
  return cuerpo.insignias.find((insignia) => insignia.codigo === codigo);
}

const RANKING_SEPTIEMBRE = "/reportes/ranking-asistencia?desde=2026-09-01&hasta=2026-09-30";

describe("PI-71: la racha y las insignias del alumno", () => {
  it("la racha cuenta clases dictadas: una cancelada o una suplencia no la cortan, una falta sí, y una abierta todavía no cuenta", async () => {
    await cargarSeptiembre();
    await umbralesDePrueba();

    const respuesta = await pedir(`/alumnos/${alumnos.ana.id_alumno}/insignias`, alumnos.ana.email);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      id_alumno: alumnos.ana.id_alumno,
      racha: {
        actual: 1,
        mejor: 3,
        fecha_inicio: "2026-09-06T21:00:00.000Z",
        proximo_hito: { umbral: 3, faltantes: 2 },
      },
      clases_asistidas: 4,
      proximo_hito_clases: { umbral: 100, faltantes: 96 },
    });
    expect(respuesta.body.insignias).toHaveLength(6);
    expect(insigniaDe(respuesta.body, "RACHA_10")).toMatchObject({
      obtenida: true,
      fecha_obtencion: "2026-09-04T21:00:00.000Z",
      progreso: { actual: 3, umbral: 3 },
    });
    expect(insigniaDe(respuesta.body, "TOTAL_50")).toMatchObject({
      obtenida: true,
      fecha_obtencion: "2026-09-06T21:00:00.000Z",
    });
    expect(insigniaDe(respuesta.body, "RACHA_25")).toMatchObject({
      obtenida: false,
      progreso: { actual: 1, umbral: 25 },
    });
    expect(insigniaDe(respuesta.body, "MES_PERFECTO")).toMatchObject({ obtenida: false, progreso: null });
  });

  it("las insignias alcanzadas quedan guardadas una sola vez aunque se consulte de nuevo", async () => {
    await cargarSeptiembre();
    await umbralesDePrueba();

    await pedir(`/alumnos/${alumnos.ana.id_alumno}/insignias`, alumnos.ana.email);
    await pedir(`/alumnos/${alumnos.ana.id_alumno}/insignias`, alumnos.ana.email);

    const filas = await obtenidas("ana");
    expect(
      filas.map(({ insignia, periodo, fecha_obtencion }) => [insignia.codigo, periodo, fecha_obtencion]),
    ).toEqual([
      ["RACHA_10", "", new Date("2026-09-04T21:00:00Z")],
      ["TOTAL_50", "", new Date("2026-09-06T21:00:00Z")],
    ]);
  });

  it("el tutor ve la ficha de su menor y la propietaria la de cualquiera; otro alumno, una profesora o un id inexistente no", async () => {
    await cargarSeptiembre();

    expect((await pedir(`/alumnos/${alumnos.caro.id_alumno}/insignias`, emailTutor)).body).toMatchObject({
      id_alumno: alumnos.caro.id_alumno,
      racha: { actual: 3 },
    });
    expect((await pedir(`/alumnos/${alumnos.beto.id_alumno}/insignias`, emailPropietaria)).status).toBe(200);

    expect((await pedir(`/alumnos/${alumnos.beto.id_alumno}/insignias`, alumnos.ana.email)).status).toBe(403);
    expect((await pedir(`/alumnos/${alumnos.ana.id_alumno}/insignias`, emailTutor)).status).toBe(403);
    expect((await pedir(`/alumnos/${alumnos.ana.id_alumno}/insignias`, emailProfesora)).status).toBe(403);
    expect((await pedir("/alumnos/999999/insignias", alumnos.ana.email)).status).toBe(403);
    expect((await pedir("/alumnos/999999/insignias", emailPropietaria)).status).toBe(404);
    expect(await obtenidas("beto")).toEqual([]);
  });

  it("el catálogo inicial se carga una vez, recargarlo repone su definición y la base no admite umbrales en 0", async () => {
    expect(await prisma.insignias.count()).toBe(6);
    await prisma.insignias.update({ where: { codigo: "RACHA_10" }, data: { valor_umbral: 3 } });

    await cargarCatalogoInsignias(prisma);

    expect(await prisma.insignias.count()).toBe(6);
    expect((await prisma.insignias.findUniqueOrThrow({ where: { codigo: "RACHA_10" } })).valor_umbral).toBe(
      10,
    );
    await expect(
      prisma.$executeRaw`UPDATE insignias SET valor_umbral = 0 WHERE codigo = 'RACHA_10'`,
    ).rejects.toThrow();
  });

  it("una insignia mensual puede repetirse en otro mes pero no dos veces en el mismo", async () => {
    const { id_insignia } = await prisma.insignias.findUniqueOrThrow({ where: { codigo: "MES_PERFECTO" } });
    const id_alumno = alumnos.beto.id_alumno;

    await prisma.alumno_insignias.create({ data: { id_alumno, id_insignia, periodo: "2026-08" } });
    await prisma.alumno_insignias.create({ data: { id_alumno, id_insignia, periodo: "2026-09" } });
    await expect(
      prisma.alumno_insignias.create({ data: { id_alumno, id_insignia, periodo: "2026-09" } }),
    ).rejects.toThrow();
    expect(await prisma.alumno_insignias.count()).toBe(2);
  });
});

describe("PI-72: el ranking de asistencia", () => {
  it("ordena a los activos con el mínimo de clases, marca la fila propia y no muestra datos de contacto", async () => {
    await cargarSeptiembre();
    await umbralesDePrueba();

    const respuesta = await pedir(RANKING_SEPTIEMBRE, alumnos.ana.email);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      periodo: { desde: "2026-09-01T00:00:00.000Z", hasta: "2026-09-30T00:00:00.000Z" },
      actividad: null,
      minimo_clases: 4,
      total: 2,
    });
    expect(respuesta.body.datos).toEqual([
      expect.objectContaining({
        posicion: 1,
        id_alumno: alumnos.beto.id_alumno,
        nombre: "Beto",
        clases_previstas: 5,
        clases_asistidas: 5,
        porcentaje_asistencia: 100,
        racha_actual: 5,
        es_propia: false,
      }),
      expect.objectContaining({
        posicion: 2,
        id_alumno: alumnos.ana.id_alumno,
        porcentaje_asistencia: 80,
        racha_actual: 1,
        es_propia: true,
      }),
    ]);
    expect(respuesta.body.datos[1].insignias.map(({ codigo }: { codigo: string }) => codigo).sort()).toEqual([
      "RACHA_10",
      "TOTAL_50",
    ]);
    expect(respuesta.body.propias).toEqual([respuesta.body.datos[1]]);
    expect(JSON.stringify(respuesta.body)).not.toMatch(/email|telefono|id_usuario/);
  });

  it("por defecto toma el mes en curso; el mínimo sale de RANKING_MINIMO_CLASES y desempata por clases asistidas", async () => {
    await cargarSeptiembre();
    await prisma.parametros_sistema.update({
      where: { clave: "RANKING_MINIMO_CLASES" },
      data: { valor: "3" },
    });

    const respuesta = await pedir("/reportes/ranking-asistencia", emailTutor);

    expect(respuesta.body.periodo).toEqual({
      desde: "2026-09-01T00:00:00.000Z",
      hasta: "2026-09-30T00:00:00.000Z",
    });
    expect(
      respuesta.body.datos.map(({ nombre, posicion, es_propia }: Record<string, unknown>) => [
        nombre,
        posicion,
        es_propia,
      ]),
    ).toEqual([
      ["Beto", 1, false],
      ["Caro", 2, true],
      ["Ana", 3, false],
    ]);
  });

  it("filtra por actividad, pagina y lo ven las profesoras; sin el permiso responde 403", async () => {
    await cargarSeptiembre();

    expect(
      (await pedir(`${RANKING_SEPTIEMBRE}&actividad=${idOtraActividad}`, emailProfesora)).body,
    ).toMatchObject({
      actividad: idOtraActividad,
      datos: [],
      total: 0,
    });
    const pagina = await pedir(`${RANKING_SEPTIEMBRE}&limit=1&offset=1`, alumnos.ana.email);
    expect(pagina.body).toMatchObject({ total: 2, limit: 1, offset: 1 });
    expect(pagina.body.datos.map(({ nombre }: { nombre: string }) => nombre)).toEqual(["Ana"]);

    await prisma.rol_permisos.deleteMany({
      where: { rol: { codigo: "ALUMNO" }, permiso: { codigo: "REPORTES_RANKING_VER" } },
    });
    expect((await pedir(RANKING_SEPTIEMBRE, alumnos.ana.email)).status).toBe(403);
  });
});

describe("PI-73: el cierre mensual de insignias", () => {
  it("la primera consulta de octubre cierra septiembre: Mes perfecto y Podio del mes con su período", async () => {
    await cargarSeptiembre();
    vi.setSystemTime(new Date("2026-10-05T15:00:00Z"));

    const respuesta = await pedir(`/alumnos/${alumnos.beto.id_alumno}/insignias`, alumnos.beto.email);

    expect(insigniaDe(respuesta.body, "MES_PERFECTO")).toMatchObject({
      obtenida: true,
      periodos: ["2026-09"],
    });
    expect(insigniaDe(respuesta.body, "PODIO_MES")).toMatchObject({ obtenida: true, periodos: ["2026-09"] });
    const mensuales = await prisma.alumno_insignias.findMany({
      where: { insignia: { tipo: { in: ["MES_PERFECTO", "PODIO_MES"] } } },
      include: { insignia: true },
    });
    expect(
      mensuales.map(({ id_alumno, insignia, periodo }) => [id_alumno, insignia.codigo, periodo]).sort(),
    ).toEqual(
      [
        [alumnos.ana.id_alumno, "PODIO_MES", "2026-09"],
        [alumnos.beto.id_alumno, "MES_PERFECTO", "2026-09"],
        [alumnos.beto.id_alumno, "PODIO_MES", "2026-09"],
      ].sort(),
    );
  });

  it("volver a cerrar el mismo mes tras un reinicio no duplica ni agranda el podio", async () => {
    await cargarSeptiembre();
    const octubre = new Date("2026-10-02T12:00:00Z");
    // Cada entorno es un proceso nuevo: no recuerda que el mes ya se cerró.
    const primero = crearEntornoDeIntegracion();
    await expect(primero.cierreMensualInsignias.cerrarMesAnterior(octubre)).resolves.toEqual({
      periodo: "2026-09",
      mes_perfecto: 1,
      podio: 2,
    });
    await primero.cerrar();
    await prisma.parametros_sistema.update({
      where: { clave: "RANKING_MINIMO_CLASES" },
      data: { valor: "3" },
    });

    const reiniciado = crearEntornoDeIntegracion();
    const segundo = await reiniciado.cierreMensualInsignias.cerrarMesAnterior(octubre);
    await reiniciado.cerrar();

    expect(segundo).toMatchObject({ periodo: "2026-09", podio: 0 });
    expect(await prisma.alumno_insignias.count({ where: { insignia: { codigo: "PODIO_MES" } } })).toBe(2);
    expect(
      await prisma.alumno_insignias.count({
        where: { id_alumno: alumnos.beto.id_alumno, insignia: { codigo: "MES_PERFECTO" } },
      }),
    ).toBe(1);
  });
});
