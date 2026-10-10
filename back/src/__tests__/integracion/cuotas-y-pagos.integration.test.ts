import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO } from "../../shared/db/datos-demo.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";

// Casos PI-33 en adelante: cuotas y pagos (US-15, US-16, US-17) sobre los datos de db:seed:demo.
// Sofía Medina está pre-inscripta y sin cuotas; Valentina Herrera ya pagó su primera cuota.
const entorno = crearEntornoDeIntegracion();
const { prisma } = entorno;
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

describe("PI-28: restricciones de cuotas y pagos en la base", () => {
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

describe("PI-28 (escenario): el pago del alumno activo de la demostración", () => {
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
