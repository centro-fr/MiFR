import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PagoRepository } from "../../modules/gestion-cuotas-y-pagos/pago/pago.repository.js";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO } from "../../shared/db/datos-demo.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { armarCuotasYPagos, UN_DIA_EN_MS } from "./cobro.js";
import { crearEntornoDeIntegracion } from "./entorno.js";

// Casos PI-33 en adelante: cuotas y pagos (US-15, US-16, US-17) sobre los datos de db:seed:demo.
// Sofía Medina está pre-inscripta y sin cuotas; Valentina Herrera ya pagó su primera cuota.
const entorno = crearEntornoDeIntegracion();
const { prisma, infoInscripciones } = entorno;
const DNI_SOFIA = "38111222";
const VENCIMIENTO = new Date("2026-11-09T00:00:00Z");

let idInscripcion: number;
let idMarina: number;
let idCarla: number;

beforeEach(async () => {
  await reiniciarBase(prisma);
  const datos = await cargarDatosDemo(prisma);
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
    // El cálculo de prueba suma 30 días a "desde": la cuota 2 cubre desde el día siguiente al vencimiento de la 1.
    const desdeLaSegunda = new Date(primera.fecha_vencimiento.getTime() + UN_DIA_EN_MS);
    expect(historial[0].fecha_vencimiento).toEqual(new Date(desdeLaSegunda.getTime() + 30 * UN_DIA_EN_MS));
    expect(historial[0]).toMatchObject({
      plan: "Intermedio",
      pagos: [{ forma_pago: "EFECTIVO", estado: "CONFIRMADO", monto: 1, motivo_rechazo: null }],
    });
    expect(historial[1]).toMatchObject({ numero_cuota: 1, pagos: [{ estado: "CONFIRMADO" }] });
  });
});
