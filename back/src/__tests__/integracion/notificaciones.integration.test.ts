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
const entorno = crearEntornoDeIntegracion();
const { prisma, planificadorNotificaciones } = entorno;
const DNI_VALENTINA = "39222333";
const DNI_MATEO = "52111222";
const EMAIL_VALENTINA = "valentina.herrera@example.com";
const EMAIL_PAULA = "paula.romero@example.com";
const EMAIL_LUCIA = "lucia.gomez@example.com";
let datos: DatosDemoCargados;

beforeEach(async () => {
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
  it("avisa por vencer dentro de los días previos, vencida al pasar la gracia, y una sola vez por cuota", async () => {
    const idCuota = await venceEn(DNI_VALENTINA, 2);
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

  it("no avisa al día, en los días de gracia, con una transferencia pendiente ni después de renovar", async () => {
    const hoy = fechaActualArgentina();
    await venceEn(DNI_VALENTINA, 10);
    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(0);

    await venceEn(DNI_VALENTINA, -3);
    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(0);

    await venceEn(DNI_VALENTINA, 1);
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

  it("el aviso de un menor va a su tutora, y DIAS_AVISO_VENCIMIENTO cambia desde cuándo se avisa", async () => {
    const cobro = await pedir(EMAIL_MULTIROL_DEMO, "post", "/pagos/efectivo", {
      id_inscripcion: datos.idInscripcion.get(DNI_MATEO),
      monto: 45000,
    });
    expect(cobro.status).toBe(201);
    const idCuota = await venceEn(DNI_MATEO, 5);
    const hoy = fechaActualArgentina();

    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(0);
    await prisma.parametros_sistema.update({
      where: { clave: "DIAS_AVISO_VENCIMIENTO" },
      data: { valor: "7" },
    });
    expect(await planificadorNotificaciones.generarAvisos(hoy)).toBe(1);

    expect(await avisos()).toEqual([
      expect.objectContaining({ id_usuario: await idUsuario(EMAIL_PAULA), id_cuota: idCuota }),
    ]);
    const [{ mensaje }] = await prisma.notificaciones.findMany();
    expect(mensaje).toContain("La cuota de Mateo Romero del plan Personalizado 2 días vence el");
  });

  it("la base rechaza un segundo aviso del mismo tipo para la misma cuota y usuario", async () => {
    const idCuota = await venceEn(DNI_VALENTINA, 2);
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
    await venceEn(DNI_VALENTINA, 1);

    const mias = await pedir(EMAIL_VALENTINA, "get", "/notificaciones/mias");

    expect(mias.status).toBe(200);
    expect(mias.body).toMatchObject({ total: 1, no_leidas: 1, limit: 20, offset: 0 });
    const [aviso] = mias.body.datos;
    expect(aviso).toMatchObject({
      tipo: "CUOTA_POR_VENCER",
      leida: false,
      mensaje: "Tu cuota del plan Intermedio vence el 11/03/2031.",
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
