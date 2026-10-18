import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cargarDatosDemo, EMAIL_MULTIROL_DEMO, type DatosDemoCargados } from "../../shared/db/datos-demo.js";
import { fechaActualArgentina } from "../../shared/utils/fecha-argentina.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { UN_DIA_EN_MS } from "./cobro.js";
import { crearEntornoDeIntegracion } from "./entorno.js";

// Caso PI-65: el resumen diario de la propietaria (US-26) sobre los datos de db:seed:demo. Valentina
// Herrera ya pagó su primera cuota en efectivo a Carla Ruiz, que todavía no la rindió.
const entorno = crearEntornoDeIntegracion();
const { prisma } = entorno;
const DNI_VALENTINA = "39222333";
const EMAIL_CARLA = "carla.ruiz@example.com";
const EMAIL_LUCIA = "lucia.gomez@example.com";
let datos: DatosDemoCargados;

beforeEach(async () => {
  await reiniciarBase(prisma);
  datos = await cargarDatosDemo(prisma);
});

afterAll(() => entorno.cerrar());

async function pedir(email: string, metodo: "get" | "post", ruta: string, cuerpo?: object) {
  const token = await entorno.iniciarSesion(email);
  const pedido = request(entorno.app)[metodo](`/api/v1${ruta}`).set("Authorization", `Bearer ${token}`);
  return cuerpo ? pedido.send(cuerpo) : pedido;
}

function resumen(email = EMAIL_MULTIROL_DEMO) {
  return pedir(email, "get", "/resumen-diario");
}

describe("PI-65: el resumen diario de la propietaria", () => {
  it("junta la transferencia pendiente, el efectivo sin rendir y la cuota vencida, con sus montos", async () => {
    const idInscripcion = datos.idInscripcion.get(DNI_VALENTINA)!;
    const idCarla = datos.idProfesora.get(EMAIL_CARLA)!;
    const hace10Dias = new Date(fechaActualArgentina().getTime() - 10 * UN_DIA_EN_MS);
    await prisma.cuotas.updateMany({
      where: { id_inscripcion: idInscripcion, numero_cuota: 1 },
      data: { fecha_vencimiento: hace10Dias },
    });
    const informada = await pedir(EMAIL_CARLA, "post", "/pagos/transferencia", {
      id_inscripcion: idInscripcion,
      monto: 30000,
      fecha_hora_transferencia: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    });
    expect(informada.status).toBe(201);
    await prisma.pagos.update({
      where: { id_pago: informada.body.id_pago },
      data: { fecha_pago: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    const respuesta = await resumen();

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      fecha: fechaActualArgentina().toISOString(),
      bloques_con_error: [],
      sin_novedades: false,
      transferencias: { cantidad: 1, total: 30000, supera_24_horas: 1, por_superar_24_horas: 0 },
      efectivo: {
        cantidad: 1,
        total: 30000,
        profesoras: [{ id_profesora: idCarla, cantidad: 1, total: 30000 }],
      },
      cuotas_vencidas: {
        cantidad: 1,
        cantidad_alumnos: 1,
        monto_estimado: 30000,
        sin_precio: 0,
        por_profesora: [{ id_profesora: idCarla, cantidad: 1, monto_estimado: 30000 }],
        por_plan: [{ nombre: "Intermedio", cantidad: 1, monto_estimado: 30000 }],
      },
    });
    expect(respuesta.body.transferencias.mas_antiguas).toEqual([
      expect.objectContaining({ id_pago: informada.body.id_pago, supera_24_horas: true, plan: "Intermedio" }),
    ]);
    expect(respuesta.body.cuotas_vencidas.mas_atrasadas).toEqual([
      expect.objectContaining({ id_inscripcion: idInscripcion, dias_vencida: 10, monto_estimado: 30000 }),
    ]);
  });

  it("con todo resuelto está sin novedades, y una cuota en los días de gracia no cuenta como vencida", async () => {
    await prisma.cuotas.updateMany({
      where: { id_inscripcion: datos.idInscripcion.get(DNI_VALENTINA)!, numero_cuota: 1 },
      data: { fecha_vencimiento: new Date(fechaActualArgentina().getTime() - 2 * UN_DIA_EN_MS) },
    });
    const rendido = await pedir(EMAIL_MULTIROL_DEMO, "post", "/pagos/rendir", {
      id_profesora: datos.idProfesora.get(EMAIL_CARLA),
    });
    expect(rendido.status).toBe(200);

    const respuesta = await resumen();

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      sin_novedades: true,
      bloques_con_error: [],
      transferencias: { cantidad: 0, total: 0 },
      efectivo: { cantidad: 0, total: 0, mas_antiguo: null },
      cuotas_vencidas: { cantidad: 0, monto_estimado: 0 },
    });
  });

  it("solo lo ve la propietaria: una profesora recibe 403", async () => {
    expect((await resumen(EMAIL_LUCIA)).status).toBe(403);
    expect((await request(entorno.app).get("/api/v1/resumen-diario")).status).toBe(401);
  });
});
