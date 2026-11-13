import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CalculadorVencimientoCuota } from "../../modules/calculos-del-negocio/calculador-vencimiento-cuota/calculador-vencimiento-cuota.js";
import { PagoRepository } from "../../modules/gestion-cuotas-y-pagos/pago/pago.repository.js";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO, type DatosDemoCargados } from "../../shared/db/datos-demo.js";
import { fechaActualArgentina } from "../../shared/utils/fecha-argentina.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { armarCuotasYPagos, UN_DIA_EN_MS } from "./cobro.js";
import { crearEntornoDeIntegracion } from "./entorno.js";
import { crearAlumno, crearHorarioDePrueba, crearInscripcionDePrueba } from "./fabricas.js";

// Casos PI-33 en adelante: cuotas y pagos (US-15, US-16, US-17) y el precio que aplica el cobro
// (US-12) sobre los datos de db:seed:demo. Sofía Medina está pre-inscripta en el Básico y sin
// cuotas; Valentina Herrera está en el Intermedio y ya pagó su primera cuota.
const entorno = crearEntornoDeIntegracion();
const { prisma, infoInscripciones } = entorno;
const DNI_SOFIA = "38111222";
const DNI_VALENTINA = "39222333";
const VENCIMIENTO = new Date("2026-11-09T00:00:00Z");

let datos: DatosDemoCargados;
let idInscripcion: number;
let idMarina: number;
let idCarla: number;

beforeEach(async () => {
  await reiniciarBase(prisma);
  datos = await cargarDatosDemo(prisma);
  idInscripcion = datos.idInscripcion.get(DNI_SOFIA)!;
  idCarla = datos.idProfesora.get("carla.ruiz@example.com")!;
  idMarina = (await prisma.usuarios.findUniqueOrThrow({ where: { email: EMAIL_MULTIROL_DEMO } })).id_usuario;
});

afterAll(() => entorno.cerrar());

function crearCuota(cambios: Partial<{ numero_cuota: number; monto: number }> = {}) {
  return prisma.cuotas.create({
    data: {
      id_inscripcion: idInscripcion,
      numero_cuota: 1,
      fecha_vencimiento: VENCIMIENTO,
      monto: 30000,
      ...cambios,
    },
  });
}

function crearPago(idCuota: number, cambios: Record<string, unknown> = {}) {
  return prisma.pagos.create({
    data: {
      id_cuota: idCuota,
      forma_pago: "EFECTIVO",
      estado: "CONFIRMADO",
      monto: 30000,
      fecha_pago: new Date(),
      id_usuario_registra: idMarina,
      rendido: false,
      ...cambios,
    },
  });
}

describe("PI-33: restricciones de cuotas y pagos en la base", () => {
  it("la base aplica las restricciones del DER a las cuotas aunque se saltee la API", async () => {
    await expect(crearCuota({ numero_cuota: 0 })).rejects.toThrow(/ck_cuotas_x1/);
    await expect(crearCuota({ monto: -1 })).rejects.toThrow(/ck_cuotas_x2/);

    const cuotasDeDemo = await prisma.cuotas.count();
    await crearCuota();
    await expect(crearCuota()).rejects.toThrow(/UK_cuotas_inscripcion_numero|Unique constraint/);
    expect(await prisma.cuotas.count()).toBe(cuotasDeDemo + 1);
  });

  it("la base aplica las restricciones del DER a los pagos aunque se saltee la API", async () => {
    const cuota = await crearCuota();
    const pagosDeDemo = await prisma.pagos.count();

    await expect(crearPago(cuota.id_cuota, { monto: 0 })).rejects.toThrow(/ck_pagos_x1/);
    await expect(crearPago(cuota.id_cuota, { estado: "RECHAZADO" })).rejects.toThrow(/ck_pagos_x2/);
    await expect(
      crearPago(cuota.id_cuota, { forma_pago: "TRANSFERENCIA", id_profesora_cobra: idCarla }),
    ).rejects.toThrow(/ck_pagos_x3/);

    await crearPago(cuota.id_cuota, { id_profesora_cobra: idCarla });
    await crearPago(cuota.id_cuota, { estado: "RECHAZADO", motivo_rechazo: "No figura en el extracto" });
    expect(await prisma.pagos.count()).toBe(pagosDeDemo + 2);
  });
});

describe("PI-34: el pago del alumno activo de la demostración", () => {
  it("Valentina tiene su primera cuota pagada en efectivo a Carla, pendiente de rendición", async () => {
    const datos = await cargarDatosDemo(prisma);
    const cuotas = await prisma.cuotas.findMany({
      where: { id_inscripcion: datos.idInscripcion.get("39222333") },
      include: { pagos: true },
    });

    expect(cuotas).toHaveLength(1);
    expect(cuotas[0]).toMatchObject({
      numero_cuota: 1,
      pagos: [{ forma_pago: "EFECTIVO", estado: "CONFIRMADO", rendido: false }],
    });
    expect(cuotas[0].pagos[0].id_profesora_cobra).toBe(idCarla);
  });
});

// El guardado del pago falla después de que el alta ya escribió la inscripción, el alumno y su rol.
class PagoRepositoryQueFalla extends PagoRepository {
  override guardar(): never {
    throw new Error("se cayó la base al guardar el pago");
  }
}

// Lo que el primer pago de Sofía cambia: la inscripción, el alumno, su usuario y sus roles, y las
// cuotas y pagos de la inscripción.
async function estadoDelAlta() {
  const inscripcion = await prisma.inscripciones.findUniqueOrThrow({
    where: { id_inscripcion: idInscripcion },
    select: {
      estado: true,
      alumno: {
        select: {
          estado: true,
          usuario: { select: { estado: true, roles: { select: { rol: { select: { codigo: true } } } } } },
        },
      },
    },
  });
  const cuotas = await prisma.cuotas.findMany({
    where: { id_inscripcion: idInscripcion },
    select: { numero_cuota: true, pagos: { select: { forma_pago: true, estado: true } } },
  });
  return { inscripcion, cuotas };
}

describe("PI-35: el primer pago y el alta definitiva se guardan juntos", () => {
  async function cobrarComoLucia({ gestion }: ReturnType<typeof armarCuotasYPagos>) {
    const lucia = await prisma.usuarios.findUniqueOrThrow({ where: { email: "lucia.gomez@example.com" } });
    return gestion.registrarCobroEfectivo(
      { id_inscripcion: idInscripcion, monto: 1, confirmar_monto_distinto: true },
      { idUsuario: lucia.id_usuario, esPropietaria: false },
    );
  }

  it("si el pago no se puede guardar, no queda nada del alta: ni la inscripción activa, ni el alumno, ni el rol", async () => {
    const antes = await estadoDelAlta();
    const gestion = armarCuotasYPagos(prisma, infoInscripciones, new PagoRepositoryQueFalla(prisma));

    await expect(cobrarComoLucia(gestion)).rejects.toThrow("se cayó la base al guardar el pago");

    expect(await estadoDelAlta()).toEqual(antes);
    expect(antes.inscripcion.estado).toBe("PREINSCRIPTA");
  });

  it("con el pago guardado, la inscripción, el alumno y su usuario quedan activos, con el rol y la primera cuota paga", async () => {
    await cobrarComoLucia(armarCuotasYPagos(prisma, infoInscripciones));

    const despues = await estadoDelAlta();
    expect(despues.inscripcion).toMatchObject({
      estado: "ACTIVA",
      alumno: { estado: "ACTIVO", usuario: { estado: "ACTIVO" } },
    });
    expect(despues.inscripcion.alumno.usuario.roles).toContainEqual({ rol: { codigo: "ALUMNO" } });
    expect(despues.cuotas).toEqual([
      { numero_cuota: 1, pagos: [{ forma_pago: "EFECTIVO", estado: "CONFIRMADO" }] },
    ]);
  });
});

describe("PI-36: el pago adelantado y el historial de cuotas de la ficha", () => {
  it("el pago adelantado empieza el día después del vencimiento vigente y el historial muestra las dos cuotas", async () => {
    const datos = await cargarDatosDemo(prisma);
    const idAlumno = datos.idAlumno.get("39222333")!;
    const idInscripcionValentina = datos.idInscripcion.get("39222333")!;
    const { gestion, cuotas } = armarCuotasYPagos(prisma, infoInscripciones);
    const [primera] = await cuotas.historialDeAlumno(idAlumno);

    await gestion.registrarCobroEfectivo(
      { id_inscripcion: idInscripcionValentina, monto: 1, confirmar_monto_distinto: true },
      { idUsuario: idMarina, esPropietaria: true },
    );

    const historial = await cuotas.historialDeAlumno(idAlumno);
    expect(historial.map(({ numero_cuota }) => numero_cuota)).toEqual([2, 1]);
    // La cuota 2 cubre desde el día siguiente al vencimiento de la 1, de fecha a fecha.
    const desdeLaSegunda = new Date(primera.fecha_vencimiento.getTime() + UN_DIA_EN_MS);
    expect(historial[0].fecha_vencimiento).toEqual(
      new CalculadorVencimientoCuota().calcularVencimiento({ tipoPlan: "MENSUAL", desde: desdeLaSegunda }),
    );
    expect(historial[0]).toMatchObject({
      plan: "Intermedio",
      pagos: [{ forma_pago: "EFECTIVO", estado: "CONFIRMADO", monto: 1, motivo_rechazo: null }],
    });
    expect(historial[1]).toMatchObject({ numero_cuota: 1, pagos: [{ estado: "CONFIRMADO" }] });
  });
});

describe("PI-40: el cobro aplica el precio vigente el día del cobro", () => {
  // El precio se carga por la API, como lo hace la propietaria, para probar juntos Plan y Cuota.
  async function cargarPrecio(nombrePlan: string, precio: number, desde: Date) {
    const token = await entorno.iniciarSesion(EMAIL_MULTIROL_DEMO);
    const respuesta = await request(entorno.app)
      .post(`/api/v1/planes/${datos.idPlan.get(nombrePlan)}/precios`)
      .set("Authorization", `Bearer ${token}`)
      .send({ precio, fecha_vigencia_desde: desde.toISOString().slice(0, 10) });
    expect(respuesta.status).toBe(201);
  }

  // Sin confirmar un monto distinto: el cobro solo pasa si el monto es el precio que rige hoy.
  function cobrarComoMarina(idInscripcionACobrar: number, monto: number) {
    return armarCuotasYPagos(prisma, infoInscripciones).gestion.registrarCobroEfectivo(
      { id_inscripcion: idInscripcionACobrar, monto, confirmar_monto_distinto: false },
      { idUsuario: idMarina, esPropietaria: true },
    );
  }

  async function montosDeCuotas(idInscripcionCobrada: number) {
    const cuotas = await prisma.cuotas.findMany({
      where: { id_inscripcion: idInscripcionCobrada },
      orderBy: { numero_cuota: "asc" },
      include: { pagos: true },
    });
    return cuotas.map((cuota) => ({
      numero_cuota: cuota.numero_cuota,
      monto: cuota.monto.toNumber(),
      pagos: cuota.pagos.map((pago) => pago.monto.toNumber()),
    }));
  }

  it("un aumento programado para mañana no cambia lo que se cobra hoy", async () => {
    const manana = new Date(fechaActualArgentina().getTime() + UN_DIA_EN_MS);
    await cargarPrecio("Básico", 28000, manana);

    await cobrarComoMarina(idInscripcion, 25000);

    expect(await montosDeCuotas(idInscripcion)).toEqual([{ numero_cuota: 1, monto: 25000, pagos: [25000] }]);
  });

  it("un aumento que rige desde hoy ya se cobra hoy, y el precio anterior se rechaza sin guardar nada", async () => {
    await cargarPrecio("Básico", 28000, fechaActualArgentina());
    const antes = await estadoDelAlta();

    await expect(cobrarComoMarina(idInscripcion, 25000)).rejects.toMatchObject({
      statusCode: 409,
      code: "MONTO_DISTINTO",
      message: expect.stringContaining("(28000)"),
    });
    expect(await estadoDelAlta()).toEqual(antes);

    await cobrarComoMarina(idInscripcion, 28000);
    expect(await montosDeCuotas(idInscripcion)).toEqual([{ numero_cuota: 1, monto: 28000, pagos: [28000] }]);
  });

  it("un aumento no toca la cuota ya cobrada y la siguiente se cobra al precio nuevo", async () => {
    const idInscripcionValentina = datos.idInscripcion.get(DNI_VALENTINA)!;
    const cobradas = await prisma.cuotas.findMany({
      where: { id_inscripcion: idInscripcionValentina },
      include: { pagos: true },
    });

    await cargarPrecio("Intermedio", 35000, fechaActualArgentina());
    await cobrarComoMarina(idInscripcionValentina, 35000);

    const [primera, segunda] = await prisma.cuotas.findMany({
      where: { id_inscripcion: idInscripcionValentina },
      orderBy: { numero_cuota: "asc" },
      include: { pagos: true },
    });
    expect([primera]).toEqual(cobradas);
    expect(segunda.monto.toNumber()).toBe(35000);
    expect(segunda.pagos.map((pago) => pago.monto.toNumber())).toEqual([35000]);
  });
});

// Los casos siguientes recorren el subsistema montado en la API: rutas, permisos de la base y la
// transacción del alta, con los calculadores reales.
async function pedir(metodo: "get" | "post", ruta: string, email: string, cuerpo?: object) {
  const token = await entorno.iniciarSesion(email);
  const pedido = request(entorno.app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  return cuerpo ? pedido.send(cuerpo) : pedido;
}

const EMAIL_LUCIA = "lucia.gomez@example.com";
const EMAIL_SOFIA = "sofia.medina@example.com";
const EMAIL_VALENTINA = "valentina.herrera@example.com";
// US-16: la profesora a cargo de Valentina, que informa sus transferencias.
const EMAIL_CARLA = "carla.ruiz@example.com";
const HACE_UNA_HORA = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

describe("PI-42: el cobro en efectivo por la API", () => {
  it("la profesora a cargo cobra la primera cuota: el alumno queda activo con su rol y ve el comprobante", async () => {
    const idLucia = datos.idProfesora.get(EMAIL_LUCIA)!;

    const cobro = await pedir("post", "/pagos/efectivo", EMAIL_LUCIA, {
      id_inscripcion: idInscripcion,
      monto: 25000,
    });

    expect(cobro.status).toBe(201);
    expect(cobro.body).toMatchObject({ estado: "CONFIRMADO", rendido: false, id_profesora_cobra: idLucia });
    const despues = await estadoDelAlta();
    expect(despues.inscripcion).toMatchObject({
      estado: "ACTIVA",
      alumno: { estado: "ACTIVO", usuario: { estado: "ACTIVO" } },
    });
    expect(despues.inscripcion.alumno.usuario.roles).toContainEqual({ rol: { codigo: "ALUMNO" } });
    expect(despues.cuotas).toEqual([
      { numero_cuota: 1, pagos: [{ forma_pago: "EFECTIVO", estado: "CONFIRMADO" }] },
    ]);

    const comprobante = await pedir("get", `/pagos/${cobro.body.id_pago}/comprobante`, EMAIL_SOFIA);
    expect(comprobante.status).toBe(200);
    expect(comprobante.body).toMatchObject({
      numero: cobro.body.id_pago,
      forma_pago: "EFECTIVO",
      monto: 25000,
      plan: "Básico",
      cuota: { numero: 1 },
      profesora_cobra: { nombre: "Lucía", apellido: "Gómez" },
    });
  });

  it("un alumno y una profesora que no está a cargo no cobran: 403 y no queda nada guardado", async () => {
    const antes = await estadoDelAlta();
    const cuerpo = { id_inscripcion: idInscripcion, monto: 25000 };

    expect((await pedir("post", "/pagos/efectivo", EMAIL_VALENTINA, cuerpo)).status).toBe(403);
    expect((await pedir("post", "/pagos/efectivo", "carla.ruiz@example.com", cuerpo)).status).toBe(403);

    expect(await estadoDelAlta()).toEqual(antes);
  });
});

describe("PI-43: la transferencia informada y su revisión por la API", () => {
  let idInscripcionValentina: number;

  beforeEach(() => {
    idInscripcionValentina = datos.idInscripcion.get(DNI_VALENTINA)!;
  });

  function informar(monto = 30000) {
    return pedir("post", "/pagos/transferencia", EMAIL_CARLA, {
      id_inscripcion: idInscripcionValentina,
      monto,
      fecha_hora_transferencia: HACE_UNA_HORA(),
    });
  }

  function pagosDeValentina() {
    return prisma.cuotas.findMany({
      where: { id_inscripcion: idInscripcionValentina },
      orderBy: { numero_cuota: "asc" },
      select: { numero_cuota: true, pagos: { select: { estado: true }, orderBy: { id_pago: "asc" } } },
    });
  }

  it("la transferencia queda pendiente, la ve la propietaria y frena otro cobro hasta que se revise", async () => {
    const informada = await informar();

    expect(informada.status).toBe(201);
    expect(informada.body).toMatchObject({ forma_pago: "TRANSFERENCIA", estado: "PENDIENTE" });
    const mias = await pedir("get", "/pagos/mis-transferencias", EMAIL_VALENTINA);
    expect(mias.body.map(({ id_pago }: { id_pago: number }) => id_pago)).toEqual([informada.body.id_pago]);
    const enRevision = await pedir("get", "/pagos/transferencias?estado=PENDIENTE", EMAIL_MULTIROL_DEMO);
    expect(enRevision.body).toMatchObject({ total: 1, limit: 100, offset: 0 });
    expect(enRevision.body.datos).toEqual([
      expect.objectContaining({ id_pago: informada.body.id_pago, supera_24_horas: false }),
    ]);
    expect((await pedir("get", "/pagos/transferencias", EMAIL_LUCIA)).status).toBe(403);

    const otroCobro = await pedir("post", "/pagos/efectivo", EMAIL_MULTIROL_DEMO, {
      id_inscripcion: idInscripcionValentina,
      monto: 30000,
    });
    expect(otroCobro.status).toBe(409);
    expect(await pagosDeValentina()).toEqual([
      { numero_cuota: 1, pagos: [{ estado: "CONFIRMADO" }] },
      { numero_cuota: 2, pagos: [{ estado: "PENDIENTE" }] },
    ]);
  });

  it("la informa la profesora a cargo; el alumno y otra profesora reciben 403 sin guardar nada", async () => {
    const cuerpo = {
      id_inscripcion: idInscripcionValentina,
      monto: 30000,
      fecha_hora_transferencia: HACE_UNA_HORA(),
    };
    const antes = await pagosDeValentina();

    expect((await pedir("post", "/pagos/transferencia", EMAIL_VALENTINA, cuerpo)).status).toBe(403);
    expect((await pedir("post", "/pagos/transferencia", EMAIL_LUCIA, cuerpo)).status).toBe(403);
    expect(await pagosDeValentina()).toEqual(antes);

    const informada = await pedir("post", "/pagos/transferencia", EMAIL_CARLA, cuerpo);
    expect(informada.status).toBe(201);
    const carla = await prisma.usuarios.findUniqueOrThrow({ where: { email: EMAIL_CARLA } });
    expect(informada.body).toMatchObject({
      forma_pago: "TRANSFERENCIA",
      estado: "PENDIENTE",
      id_usuario_registra: carla.id_usuario,
      id_profesora_cobra: null,
    });
    const enRevision = await pedir("get", "/pagos/transferencias?estado=PENDIENTE", EMAIL_MULTIROL_DEMO);
    expect(enRevision.body.datos.map(({ id_pago }: { id_pago: number }) => id_pago)).toEqual([
      informada.body.id_pago,
    ]);
  });

  it("el rechazo exige motivo y la cuota se reusa en la próxima transferencia, sin saltear números", async () => {
    const { body: pago } = await informar();

    const sinMotivo = await pedir("post", `/pagos/${pago.id_pago}/rechazar`, EMAIL_MULTIROL_DEMO, {});
    expect(sinMotivo.status).toBe(400);
    const rechazo = await pedir("post", `/pagos/${pago.id_pago}/rechazar`, EMAIL_MULTIROL_DEMO, {
      motivo_rechazo: "No figura en el extracto",
    });
    expect(rechazo.status).toBe(200);
    expect(rechazo.body).toMatchObject({ estado: "RECHAZADO", motivo_rechazo: "No figura en el extracto" });
    expect((await pedir("post", `/pagos/${pago.id_pago}/aprobar`, EMAIL_MULTIROL_DEMO)).status).toBe(409);

    expect((await informar()).status).toBe(201);
    expect(await pagosDeValentina()).toEqual([
      { numero_cuota: 1, pagos: [{ estado: "CONFIRMADO" }] },
      { numero_cuota: 2, pagos: [{ estado: "RECHAZADO" }, { estado: "PENDIENTE" }] },
    ]);
  });

  it("la aprobación confirma el pago y registra quién la revisó; la transferencia que carga la propietaria da el alta", async () => {
    const { body: pago } = await informar();

    const aprobada = await pedir("post", `/pagos/${pago.id_pago}/aprobar`, EMAIL_MULTIROL_DEMO);
    expect(aprobada.status).toBe(200);
    expect(aprobada.body).toMatchObject({ estado: "CONFIRMADO", id_usuario_confirma: idMarina });
    expect(await pagosDeValentina()).toEqual([
      { numero_cuota: 1, pagos: [{ estado: "CONFIRMADO" }] },
      { numero_cuota: 2, pagos: [{ estado: "CONFIRMADO" }] },
    ]);

    const recibida = await pedir("post", "/pagos/transferencia-recibida", EMAIL_MULTIROL_DEMO, {
      id_inscripcion: idInscripcion,
      monto: 25000,
      fecha_hora_transferencia: HACE_UNA_HORA(),
    });
    expect(recibida.status).toBe(201);
    expect(recibida.body).toMatchObject({ forma_pago: "TRANSFERENCIA", estado: "CONFIRMADO" });
    expect((await estadoDelAlta()).inscripcion).toMatchObject({
      estado: "ACTIVA",
      alumno: { estado: "ACTIVO" },
    });
  });

  function transferencias(query: string) {
    return pedir("get", `/pagos/transferencias?${query}`, EMAIL_MULTIROL_DEMO);
  }

  it("el listado trae el plan, el monto esperado y el tipo de cada una, con filtros, orden y total", async () => {
    const { body: renovacion } = await informar();
    const { body: primera } = await pedir("post", "/pagos/transferencia-recibida", EMAIL_MULTIROL_DEMO, {
      id_inscripcion: idInscripcion,
      monto: 25000,
      fecha_hora_transferencia: HACE_UNA_HORA(),
    });

    const todas = await transferencias("orden=desc");
    expect(todas.status).toBe(200);
    expect(todas.body.total).toBe(2);
    expect(todas.body.datos).toEqual([
      expect.objectContaining({
        id_pago: primera.id_pago,
        plan: "Básico",
        monto_esperado: 25000,
        tipo: "PRIMERA_CUOTA",
      }),
      expect.objectContaining({
        id_pago: renovacion.id_pago,
        plan: "Intermedio",
        monto_esperado: 30000,
        tipo: "RENOVACION",
      }),
    ]);

    const primeras = await transferencias("tipo=PRIMERA_CUOTA");
    expect(primeras.body).toMatchObject({ total: 1, datos: [{ id_pago: primera.id_pago }] });
    const hoy = fechaActualArgentina().toISOString().slice(0, 10);
    expect((await transferencias(`desde=${hoy}&hasta=${hoy}`)).body.total).toBe(2);
    expect((await transferencias("desde=2026-01-01&hasta=2026-01-31")).body).toMatchObject({
      total: 0,
      datos: [],
    });
    expect((await transferencias("tipo=OTRO")).status).toBe(400);
  });

  it("la transferencia cargada después del vencimiento de la cuota anterior es de una cuota vencida", async () => {
    const ayer = new Date(fechaActualArgentina().getTime() - UN_DIA_EN_MS);
    await prisma.cuotas.updateMany({
      where: { id_inscripcion: idInscripcionValentina, numero_cuota: 1 },
      data: { fecha_vencimiento: ayer },
    });
    const { body: pago } = await informar();

    const vencidas = await transferencias("tipo=CUOTA_VENCIDA");

    expect(vencidas.body).toMatchObject({
      total: 1,
      datos: [{ id_pago: pago.id_pago, tipo: "CUOTA_VENCIDA" }],
    });
    expect((await transferencias("tipo=RENOVACION")).body.total).toBe(0);
  });
});

describe("PI-45: la situación de cuota en la ficha y el listado de alumnos", () => {
  let idAlumnoValentina: number;
  let idInscripcionValentina: number;

  beforeEach(() => {
    idAlumnoValentina = datos.idAlumno.get(DNI_VALENTINA)!;
    idInscripcionValentina = datos.idInscripcion.get(DNI_VALENTINA)!;
  });

  function aDiasDeHoy(dias: number) {
    return new Date(fechaActualArgentina().getTime() + dias * UN_DIA_EN_MS);
  }

  function ficha(idAlumno: number, email = EMAIL_MULTIROL_DEMO) {
    return pedir("get", `/alumnos/${idAlumno}`, email);
  }

  it("la ficha y el listado muestran al día a Valentina y pendiente de pago a Sofía; la profesora ve la transferencia sin revisar", async () => {
    const [cuota] = await prisma.cuotas.findMany({ where: { id_inscripcion: idInscripcionValentina } });
    const diasRestantes = Math.round(
      (cuota.fecha_vencimiento.getTime() - fechaActualArgentina().getTime()) / UN_DIA_EN_MS,
    );

    const deValentina = await ficha(idAlumnoValentina);

    expect(deValentina.status).toBe(200);
    expect(deValentina.body.inscripciones).toEqual([
      expect.objectContaining({
        id_inscripcion: idInscripcionValentina,
        situacion_cuota: {
          estado: "AL_DIA",
          fecha_vencimiento: cuota.fecha_vencimiento.toISOString(),
          dias_restantes: diasRestantes,
          puede_asistir: true,
          tiene_pago_pendiente: false,
        },
      }),
    ]);
    expect(deValentina.body.inscripciones_de_la_baja).toEqual([]);
    const listado = await pedir("get", "/alumnos", EMAIL_MULTIROL_DEMO);
    const situacionEnListado = (idAlumno: number) =>
      listado.body.datos.find(({ id_alumno }: { id_alumno: number }) => id_alumno === idAlumno)
        .situacion_cuota;
    expect(situacionEnListado(idAlumnoValentina)).toMatchObject({
      estado: "AL_DIA",
      dias_restantes: diasRestantes,
    });
    expect(situacionEnListado(datos.idAlumno.get(DNI_SOFIA)!)).toEqual({
      estado: "PENDIENTE_DE_PAGO",
      fecha_vencimiento: null,
      dias_restantes: null,
      puede_asistir: false,
      tiene_pago_pendiente: false,
    });

    await pedir("post", "/pagos/transferencia", EMAIL_CARLA, {
      id_inscripcion: idInscripcionValentina,
      monto: 30000,
      fecha_hora_transferencia: HACE_UNA_HORA(),
    });
    const deCarla = await ficha(idAlumnoValentina, "carla.ruiz@example.com");
    expect(deCarla.status).toBe(200);
    expect(deCarla.body.inscripciones[0].situacion_cuota).toMatchObject({
      estado: "AL_DIA",
      tiene_pago_pendiente: true,
    });
  });

  it("una cuota vencida muestra los días de atraso, y la ficha del alumno de baja muestra lo que debía al irse", async () => {
    await prisma.cuotas.updateMany({
      where: { id_inscripcion: idInscripcionValentina },
      data: { fecha_vencimiento: aDiasDeHoy(-12) },
    });

    const vencida = await ficha(idAlumnoValentina);
    expect(vencida.body.inscripciones[0].situacion_cuota).toMatchObject({
      estado: "VENCIDA",
      dias_restantes: -12,
    });

    const baja = await pedir("post", `/alumnos/${idAlumnoValentina}/baja`, EMAIL_MULTIROL_DEMO, {
      motivo_baja: "ECONOMICO",
    });
    expect(baja.status).toBe(200);
    // La baja se corre cuatro días atrás: lo que debía se calcula a ese día, no a hoy.
    await prisma.inscripciones.update({
      where: { id_inscripcion: idInscripcionValentina },
      data: { fecha_baja: new Date(Date.now() - 4 * UN_DIA_EN_MS) },
    });

    const deBaja = await ficha(idAlumnoValentina);
    expect(deBaja.body.inscripciones).toEqual([]);
    expect(deBaja.body.inscripciones_de_la_baja).toEqual([
      expect.objectContaining({
        id_inscripcion: idInscripcionValentina,
        estado: "BAJA",
        motivo_baja: "ECONOMICO",
        situacion_cuota: expect.objectContaining({ estado: "VENCIDA", dias_restantes: -8 }),
      }),
    ]);
  });
});

describe("PI-51: el filtro del listado de alumnos por estado de cuota", () => {
  function listar(consulta: string, email = EMAIL_MULTIROL_DEMO) {
    return pedir("get", `/alumnos?${consulta}`, email);
  }

  function apellidos(respuesta: request.Response) {
    return respuesta.body.datos.map(({ usuario }: { usuario: { apellido: string } }) => usuario.apellido);
  }

  it("filtra por el estado calculado, pagina sobre los que coinciden y a la profesora le deja solo los suyos", async () => {
    const pendientes = await listar("estado_cuota=PENDIENTE_DE_PAGO");
    expect(pendientes.status).toBe(200);
    expect(apellidos(pendientes)).toEqual(["Medina", "Romero"]);
    expect(pendientes.body.total).toBe(2);
    expect(pendientes.body.datos[0].situacion_cuota).toMatchObject({ estado: "PENDIENTE_DE_PAGO" });

    const segundaPagina = await listar("estado_cuota=PENDIENTE_DE_PAGO&limit=1&offset=1");
    expect(apellidos(segundaPagina)).toEqual(["Romero"]);
    expect(segundaPagina.body).toMatchObject({ total: 2, limit: 1, offset: 1 });

    expect(apellidos(await listar("estado_cuota=AL_DIA"))).toEqual(["Herrera"]);
    const deCarla = await listar("estado_cuota=PENDIENTE_DE_PAGO", "carla.ruiz@example.com");
    expect(apellidos(deCarla)).toEqual(["Romero"]);
    expect(deCarla.body.total).toBe(1);
  });

  it("sigue al vencimiento sin que nada se guarde, y rechaza un estado que no existe", async () => {
    await prisma.cuotas.updateMany({
      where: { id_inscripcion: datos.idInscripcion.get(DNI_VALENTINA)! },
      data: { fecha_vencimiento: new Date(fechaActualArgentina().getTime() - 30 * UN_DIA_EN_MS) },
    });

    expect(apellidos(await listar("estado_cuota=VENCIDA"))).toEqual(["Herrera"]);
    expect((await listar("estado_cuota=AL_DIA")).body).toMatchObject({ datos: [], total: 0 });
    expect((await listar("estado_cuota=MOROSO")).status).toBe(400);
  });
});

describe("PI-52: el historial de cuotas y pagos en la ficha", () => {
  it("la propietaria ve las cuotas con todos sus pagos, también el rechazado; la profesora a cargo no ve el historial", async () => {
    const idAlumnoValentina = datos.idAlumno.get(DNI_VALENTINA)!;
    const informada = await pedir("post", "/pagos/transferencia", EMAIL_CARLA, {
      id_inscripcion: datos.idInscripcion.get(DNI_VALENTINA)!,
      monto: 30000,
      fecha_hora_transferencia: HACE_UNA_HORA(),
    });
    expect(informada.status).toBe(201);
    const rechazo = await pedir("post", `/pagos/${informada.body.id_pago}/rechazar`, EMAIL_MULTIROL_DEMO, {
      motivo_rechazo: "No llegó a la cuenta",
    });
    expect(rechazo.status).toBe(200);

    const dePropietaria = await pedir("get", `/alumnos/${idAlumnoValentina}`, EMAIL_MULTIROL_DEMO);
    expect(dePropietaria.status).toBe(200);
    expect(dePropietaria.body.historial_cuotas).toEqual([
      expect.objectContaining({
        numero_cuota: 2,
        plan: "Intermedio",
        pagos: [
          expect.objectContaining({
            forma_pago: "TRANSFERENCIA",
            estado: "RECHAZADO",
            motivo_rechazo: "No llegó a la cuenta",
          }),
        ],
      }),
      expect.objectContaining({
        numero_cuota: 1,
        pagos: [expect.objectContaining({ forma_pago: "EFECTIVO", estado: "CONFIRMADO" })],
      }),
    ]);

    const deCarla = await pedir("get", `/alumnos/${idAlumnoValentina}`, "carla.ruiz@example.com");
    expect(deCarla.status).toBe(200);
    expect(deCarla.body.historial_cuotas).toBeNull();
    expect(deCarla.body.inscripciones[0].situacion_cuota).toMatchObject({ estado: "AL_DIA" });
  });
});

// Valentina suma el Básico con Carla los sábados, además de su Intermedio: un plan por actividad.
async function sumarleElBasicoAValentina(): Promise<number> {
  const idPlan = datos.idPlan.get("Básico")!;
  const precio = await prisma.plan_precios.findFirstOrThrow({
    where: { id_plan: idPlan },
    select: { id_plan_precio: true },
  });
  const { id_horario } = await crearHorarioDePrueba(prisma, {
    id_actividad: datos.idActividad.get("FUNCIONAL")!,
    id_profesora: idCarla,
    dia_semana: 6,
    hora_inicio: "10:00",
    hora_fin: "11:00",
  });
  const { id_inscripcion } = await crearInscripcionDePrueba(prisma, {
    id_alumno: datos.idAlumno.get(DNI_VALENTINA)!,
    plan: { id_plan: idPlan, id_plan_precio: precio.id_plan_precio },
    id_profesora: idCarla,
    id_horario,
    fecha_inicio: new Date("2026-01-05T00:00:00Z"),
  });
  return id_inscripcion;
}

describe("PI-95: el listado de alumnos trae todas las inscripciones vigentes de cada uno", () => {
  it("el alumno con dos planes trae los dos, cada uno con su cuota, y lo representa el más reciente", async () => {
    const idBasico = await sumarleElBasicoAValentina();
    const idIntermedio = datos.idInscripcion.get(DNI_VALENTINA)!;

    const listado = await pedir("get", "/alumnos?limit=100", EMAIL_MULTIROL_DEMO);

    expect(listado.status).toBe(200);
    const valentina = listado.body.datos.find(
      (alumno: { id_alumno: number }) => alumno.id_alumno === datos.idAlumno.get(DNI_VALENTINA),
    );
    expect(valentina.inscripcion).toMatchObject({ id_inscripcion: idIntermedio, nombre_plan: "Intermedio" });
    expect(valentina.situacion_cuota).toMatchObject({ estado: "AL_DIA" });
    expect(valentina.inscripciones).toEqual([
      expect.objectContaining({
        id_inscripcion: idIntermedio,
        nombre_plan: "Intermedio",
        situacion_cuota: expect.objectContaining({ estado: "AL_DIA" }),
      }),
      expect.objectContaining({
        id_inscripcion: idBasico,
        nombre_plan: "Básico",
        nombre_profesora: "Carla Ruiz",
        situacion_cuota: expect.objectContaining({ estado: "PENDIENTE_DE_PAGO" }),
      }),
    ]);
  });

  it("el alumno con un plan trae uno y el dado de baja ninguno", async () => {
    const idSofia = datos.idAlumno.get(DNI_SOFIA)!;
    const baja = await pedir("post", `/alumnos/${idSofia}/baja`, EMAIL_MULTIROL_DEMO, {
      motivo_baja: "ABANDONO",
    });
    expect(baja.status).toBe(200);

    const listado = await pedir("get", "/alumnos?limit=100&incluirBajas=true", EMAIL_MULTIROL_DEMO);

    const porId = new Map(
      listado.body.datos.map((alumno: { id_alumno: number; inscripciones: unknown[] }) => [
        alumno.id_alumno,
        alumno.inscripciones,
      ]),
    );
    expect(porId.get(datos.idAlumno.get(DNI_VALENTINA))).toHaveLength(1);
    expect(porId.get(idSofia)).toEqual([]);
  });
});

describe("PI-96: las transferencias de dos planes del mismo alumno", () => {
  it("cada plan informa la suya, el listado las distingue por inscripción y se revisan de a una", async () => {
    const idBasico = await sumarleElBasicoAValentina();
    const idIntermedio = datos.idInscripcion.get(DNI_VALENTINA)!;
    const informar = (id_inscripcion: number, monto: number) =>
      pedir("post", "/pagos/transferencia", EMAIL_CARLA, {
        id_inscripcion,
        monto,
        fecha_hora_transferencia: HACE_UNA_HORA(),
      });

    const delIntermedio = await informar(idIntermedio, 30000);
    const delBasico = await informar(idBasico, 25000);
    expect([delIntermedio.status, delBasico.status]).toEqual([201, 201]);

    const pendientes = await pedir("get", "/pagos/transferencias?estado=PENDIENTE", EMAIL_MULTIROL_DEMO);
    expect(pendientes.body.total).toBe(2);
    expect(pendientes.body.datos).toEqual([
      expect.objectContaining({
        id_pago: delIntermedio.body.id_pago,
        id_inscripcion: idIntermedio,
        plan: "Intermedio",
      }),
      expect.objectContaining({ id_pago: delBasico.body.id_pago, id_inscripcion: idBasico, plan: "Básico" }),
    ]);

    const aprobada = await pedir("post", `/pagos/${delBasico.body.id_pago}/aprobar`, EMAIL_MULTIROL_DEMO);

    expect(aprobada.status).toBe(200);
    const estados = await prisma.pagos.findMany({
      where: { id_pago: { in: [delIntermedio.body.id_pago, delBasico.body.id_pago] } },
      select: { id_pago: true, estado: true },
      orderBy: { id_pago: "asc" },
    });
    expect(estados).toEqual([
      { id_pago: delIntermedio.body.id_pago, estado: "PENDIENTE" },
      { id_pago: delBasico.body.id_pago, estado: "CONFIRMADO" },
    ]);
  });
});
