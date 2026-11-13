import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO, type DatosDemoCargados } from "../../shared/db/datos-demo.js";
import { fechaActualArgentina } from "../../shared/utils/fecha-argentina.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { UN_DIA_EN_MS } from "./cobro.js";
import { crearEntornoDeIntegracion } from "./entorno.js";

// Casos PI-67 y PI-68: los avisos de vencimiento de cuota (US-25) sobre los datos de db:seed:demo.
// Valentina Herrera ya pagó su primera cuota del Intermedio (5 días de gracia); Mateo Romero, menor a
// cargo de su tutora Paula, está pre-inscripto en el Personalizado 2 días.
// El servicio de push es la frontera externa: se simula y se ve qué le llega. Los casos sin
// dispositivos suscriptos no lo usan.
const servicioPush = { enviar: vi.fn() };
const entorno = crearEntornoDeIntegracion({
  servicio: servicioPush,
  clavePublica: "clave-publica-de-prueba",
});
const { prisma, planificadorNotificaciones } = entorno;
const DNI_VALENTINA = "39222333";
const DNI_MATEO = "52111222";
const EMAIL_VALENTINA = "valentina.herrera@example.com";
const EMAIL_PAULA = "paula.romero@example.com";
const EMAIL_LUCIA = "lucia.gomez@example.com";
let datos: DatosDemoCargados;

beforeEach(async () => {
  servicioPush.enviar.mockReset().mockResolvedValue("ENTREGADO");
  await reiniciarBase(prisma);
  datos = await cargarDatosDemo(prisma);
});

afterEach(() => vi.useRealTimers());

afterAll(() => entorno.cerrar());

async function pedir(email: string, metodo: "get" | "post", ruta: string, cuerpo?: object) {
  const token = await entorno.iniciarSesion(email);
  const pedido = request(entorno.app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  return cuerpo ? pedido.send(cuerpo) : pedido;
}

function enDias(dias: number): Date {
  return new Date(fechaActualArgentina().getTime() + dias * UN_DIA_EN_MS);
}

async function venceEn(dniAlumno: string, dias: number): Promise<number> {
  const cuota = await prisma.cuotas.findFirstOrThrow({
    where: { id_inscripcion: datos.idInscripcion.get(dniAlumno) },
    orderBy: { numero_cuota: "desc" },
  });
  await prisma.cuotas.update({
    where: { id_cuota: cuota.id_cuota },
    data: { fecha_vencimiento: enDias(dias) },
  });
  return cuota.id_cuota;
}

async function idUsuario(email: string): Promise<number> {
  return (await prisma.usuarios.findUniqueOrThrow({ where: { email } })).id_usuario;
}

function avisos() {
  return prisma.notificaciones.findMany({
    select: { id_usuario: true, tipo: true, id_cuota: true, estado_envio: true, leida: true },
    orderBy: { id_notificacion: "asc" },
  });
}

describe("PI-67: los avisos de vencimiento de cuota", () => {
  it("avisa por vencer al entrar en la gracia, vencida al terminarla, y una sola vez por cuota", async () => {
    const idCuota = await venceEn(DNI_VALENTINA, -1);
    const valentina = await idUsuario(EMAIL_VALENTINA);
    const hoy = fechaActualArgentina();

    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(1);
    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(0);
    expect(await avisos()).toEqual([
      {
        id_usuario: valentina,
        tipo: "CUOTA_POR_VENCER",
        id_cuota: idCuota,
        estado_envio: "ENVIADA",
        leida: false,
      },
    ]);

    await venceEn(DNI_VALENTINA, -6);
    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(1);
    expect((await avisos()).map(({ tipo }) => tipo)).toEqual(["CUOTA_POR_VENCER", "CUOTA_VENCIDA"]);
  });

  it("no avisa al día ni el día del vencimiento, con una transferencia pendiente ni después de renovar", async () => {
    const hoy = fechaActualArgentina();
    await venceEn(DNI_VALENTINA, 10);
    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(0);

    await venceEn(DNI_VALENTINA, 0);
    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(0);

    await venceEn(DNI_VALENTINA, -1);
    const informada = await pedir("carla.ruiz@example.com", "post", "/pagos/transferencia", {
      id_inscripcion: datos.idInscripcion.get(DNI_VALENTINA),
      monto: 30000,
      fecha_hora_transferencia: new Date().toISOString(),
    });
    expect(informada.status).toBe(201);
    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(0);

    const aprobada = await pedir(EMAIL_MULTIROL_DEMO, "post", `/pagos/${informada.body.id_pago}/aprobar`);
    expect(aprobada.status).toBe(200);
    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(0);
    expect(await avisos()).toEqual([]);
  });

  it("el aviso de un menor va a su tutora, con el texto completo de la cuota", async () => {
    const cobro = await pedir(EMAIL_MULTIROL_DEMO, "post", "/pagos/efectivo", {
      id_inscripcion: datos.idInscripcion.get(DNI_MATEO),
      monto: 45000,
    });
    expect(cobro.status).toBe(201);
    const idCuota = await venceEn(DNI_MATEO, -1);
    const hoy = fechaActualArgentina();

    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(1);

    expect(await avisos()).toEqual([
      expect.objectContaining({ id_usuario: await idUsuario(EMAIL_PAULA), id_cuota: idCuota }),
    ]);
    const [{ mensaje }] = await prisma.notificaciones.findMany();
    expect(mensaje).toMatch(
      /^La cuota de Mateo Romero del plan Personalizado 2 días venció el \d\d\/\d\d\/\d{4}: hay tiempo de renovarla hasta el \d\d\/\d\d\/\d{4}\.$/,
    );
  });

  it("la base rechaza un segundo aviso del mismo tipo para la misma cuota y usuario", async () => {
    const idCuota = await venceEn(DNI_VALENTINA, -1);
    const fila = {
      id_usuario: await idUsuario(EMAIL_VALENTINA),
      tipo: "CUOTA_POR_VENCER" as const,
      id_cuota: idCuota,
      mensaje: "Aviso",
      estado_envio: "ENVIADA" as const,
    };
    await prisma.notificaciones.create({ data: fila });

    await expect(prisma.notificaciones.create({ data: fila })).rejects.toMatchObject({ code: "P2002" });
    expect(await prisma.notificaciones.count()).toBe(1);
  });
});

describe("PI-68: las notificaciones propias por la API", () => {
  it("la alumna ve su aviso al consultar, lo marca leído, y nadie más lo ve ni lo marca", async () => {
    // Un día fijo propio: el planificador genera una vez por día y otros tests usan el de hoy.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-03-10T15:00:00Z"));
    await venceEn(DNI_VALENTINA, -1);

    const mias = await pedir(EMAIL_VALENTINA, "get", "/notificaciones/mias");

    expect(mias.status).toBe(200);
    expect(mias.body).toMatchObject({ total: 1, no_leidas: 1, limit: 20, offset: 0 });
    const [aviso] = mias.body.datos;
    expect(aviso).toMatchObject({
      tipo: "CUOTA_POR_VENCER",
      leida: false,
      mensaje:
        "Tu cuota del plan Intermedio venció el 09/03/2031: hay tiempo de renovarla hasta el 14/03/2031.",
    });

    const deLucia = await pedir(EMAIL_LUCIA, "get", "/notificaciones/mias");
    expect(deLucia.body).toMatchObject({ datos: [], total: 0, no_leidas: 0 });
    const ajena = await pedir(EMAIL_LUCIA, "post", `/notificaciones/${aviso.id_notificacion}/leida`);
    expect(ajena.status).toBe(404);
    const inexistente = await pedir(EMAIL_VALENTINA, "post", "/notificaciones/999999/leida");
    expect(inexistente.status).toBe(404);
    expect((await avisos())[0].leida).toBe(false);

    const leida = await pedir(EMAIL_VALENTINA, "post", `/notificaciones/${aviso.id_notificacion}/leida`);
    expect(leida.status).toBe(200);
    expect(leida.body).toMatchObject({ id_notificacion: aviso.id_notificacion, leida: true });
    expect((await pedir(EMAIL_VALENTINA, "post", "/notificaciones/leidas")).body).toEqual({ marcadas: 0 });
    expect((await avisos())[0].leida).toBe(true);
  });

  it("marcar todas deja leídas solo las de quien pide; sin sesión responde 401", async () => {
    const valentina = await idUsuario(EMAIL_VALENTINA);
    const lucia = await idUsuario(EMAIL_LUCIA);
    const aviso = { tipo: "BIENVENIDA" as const, mensaje: "Hola", estado_envio: "ENVIADA" as const };
    await prisma.notificaciones.createMany({
      data: [
        { ...aviso, id_usuario: valentina },
        { ...aviso, id_usuario: valentina },
        { ...aviso, id_usuario: lucia },
      ],
    });

    const marcadas = await pedir(EMAIL_VALENTINA, "post", "/notificaciones/leidas");

    expect(marcadas.body).toEqual({ marcadas: 2 });
    expect(await prisma.notificaciones.count({ where: { leida: false } })).toBe(1);
    expect((await request(entorno.app).get("/api/v1/notificaciones/mias")).status).toBe(401);
  });
});

const ENDPOINT_DEL_CELULAR = "https://fcm.googleapis.com/fcm/send/celular-de-valentina";
const CLAVES = { p256dh: "B".repeat(87), auth: "a".repeat(22) };

function suscribir(email: string, endpoint = ENDPOINT_DEL_CELULAR) {
  return pedir(email, "post", "/notificaciones/push/suscripciones", { endpoint, keys: CLAVES });
}

describe("PI-92: los avisos de cuota llegan al celular por push", () => {
  it("la alumna suscribe su celular y le llega el aviso con el texto completo, una sola vez", async () => {
    const clave = await pedir(EMAIL_VALENTINA, "get", "/notificaciones/push/clave-publica");
    expect(clave.body).toEqual({ clave_publica: "clave-publica-de-prueba" });
    expect((await suscribir(EMAIL_VALENTINA)).status).toBe(204);
    const idCuota = await venceEn(DNI_VALENTINA, -1);
    const hoy = fechaActualArgentina();

    await planificadorNotificaciones.generarAvisos(hoy);
    await planificadorNotificaciones.generarAvisos(hoy);

    expect(servicioPush.enviar).toHaveBeenCalledTimes(1);
    const [destino, contenido] = servicioPush.enviar.mock.calls[0]!;
    expect(destino).toEqual({ endpoint: ENDPOINT_DEL_CELULAR, keys: CLAVES });
    const [{ mensaje }] = await prisma.notificaciones.findMany();
    expect(JSON.parse(contenido as string)).toEqual({
      titulo: "Cuota por vencer",
      cuerpo: mensaje,
      url: "/app/inicio",
      etiqueta: `cuota-${idCuota}`,
    });
  });

  it("el celular que el servicio de push da por vencido se borra, y su aviso queda igual en la campana", async () => {
    await suscribir(EMAIL_VALENTINA);
    servicioPush.enviar.mockResolvedValue("VENCIDA");
    await venceEn(DNI_VALENTINA, -1);

    await planificadorNotificaciones.generarAvisos(fechaActualArgentina());

    expect(await prisma.suscripciones_push.count()).toBe(0);
    expect(await prisma.notificaciones.count()).toBe(1);
  });

  it("un celular que pasa a otra cuenta es de esa cuenta, y nadie da de baja el de otro", async () => {
    await suscribir(EMAIL_VALENTINA);
    await suscribir(EMAIL_LUCIA);

    const ajena = await pedir(EMAIL_VALENTINA, "post", "/notificaciones/push/suscripciones/baja", {
      endpoint: ENDPOINT_DEL_CELULAR,
    });
    expect(ajena.status).toBe(204);
    expect(await prisma.suscripciones_push.findMany({ select: { id_usuario: true } })).toEqual([
      { id_usuario: await idUsuario(EMAIL_LUCIA) },
    ]);

    await pedir(EMAIL_LUCIA, "post", "/notificaciones/push/suscripciones/baja", {
      endpoint: ENDPOINT_DEL_CELULAR,
    });
    expect(await prisma.suscripciones_push.count()).toBe(0);
  });

  it("rechaza un endpoint que no es de un servicio de push: la API no le pega a direcciones internas", async () => {
    const interna = await suscribir(EMAIL_VALENTINA, "https://db:5432/");
    const sinSesion = await request(entorno.app)
      .post("/api/v1/notificaciones/push/suscripciones")
      .send({ endpoint: ENDPOINT_DEL_CELULAR, keys: CLAVES });

    expect(interna.status).toBe(400);
    expect(sinSesion.status).toBe(401);
    expect(await prisma.suscripciones_push.count()).toBe(0);
  });
});
