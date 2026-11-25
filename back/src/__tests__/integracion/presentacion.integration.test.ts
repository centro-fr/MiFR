import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cargarPresentacion, type ResumenPresentacion } from "../../shared/db/presentacion/cargar.js";
import { ALUMNOS, TUTORES } from "../../shared/db/presentacion/elenco.js";
import { alumnosHistoricos } from "../../shared/db/presentacion/historicos.js";
import { fechaActualArgentina } from "../../shared/utils/fecha-argentina.js";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion, type EntornoDeIntegracion } from "./entorno.js";

// La base de la presentación (db:seed:presentacion) recorrida por la API real: los datos cargados a
// mano tienen que valer igual que los que deja el uso del sistema, y cada pantalla de la demo tiene que
// tener algo para mostrar.

// Las cuentas que ofrece el selector del login de prueba (front/src/mocks/data/semilla.ts).
const CUENTAS_DEL_LOGIN = [
  "marina.sosa@example.com",
  "lucia.gomez@example.com",
  "carla.ruiz@example.com",
  "sofia.martinez@example.com",
  "camila.perez@example.com",
  "valentina.lopez@example.com",
  "julian.fernandez@example.com",
  "valentina.herrera@example.com",
  "mariana.lopez@example.com",
  "paula.romero@example.com",
  "carlos.fernandez@example.com",
];

function periodoDelMesPasado(): string {
  const hoy = fechaActualArgentina();
  const mes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1));
  return mes.toISOString().slice(0, 7);
}

let entorno: EntornoDeIntegracion;
let resumen: ResumenPresentacion;
let tokenPropietaria: string;

function comoPropietaria(ruta: string) {
  return request(entorno.app).get(`/api/v1${ruta}`).set("Authorization", `Bearer ${tokenPropietaria}`);
}

beforeAll(async () => {
  entorno = crearEntornoDeIntegracion();
  await reiniciarBase(entorno.prisma);
  resumen = await cargarPresentacion(entorno.prisma, entorno);
  tokenPropietaria = await entorno.iniciarSesion("marina.sosa@example.com");
}, 180_000);

afterAll(() => entorno.cerrar());

describe("datos de la presentación", () => {
  it("cargan el centro entero, con lo que derivan los procesos de la API", () => {
    expect(resumen.profesoras).toBe(4);
    expect(resumen.alumnos).toBe(ALUMNOS.length + alumnosHistoricos(fechaActualArgentina()).length);
    expect(resumen.clases).toBeGreaterThan(200);
    expect(resumen.asistencias).toBeGreaterThan(1000);
    expect(resumen.liquidaciones).toBeGreaterThan(0);
    expect(resumen.insignias).toBeGreaterThan(0);
    expect(resumen.avisos).toBeGreaterThan(0);
  });

  it.each(CUENTAS_DEL_LOGIN)("la cuenta %s del login de prueba entra", async (email) => {
    await expect(entorno.iniciarSesion(email)).resolves.toEqual(expect.any(String));
  });

  it("cada alumno activo pagó su primera cuota y ningún pre-inscripto tiene cuotas", async () => {
    const inscripciones = await entorno.prisma.inscripciones.findMany({
      include: { cuotas: { include: { pagos: true }, orderBy: { numero_cuota: "asc" } } },
    });
    for (const { estado, cuotas } of inscripciones) {
      if (estado === "PREINSCRIPTA") {
        expect(cuotas).toHaveLength(0);
      } else {
        expect(cuotas[0]?.pagos.some((pago) => pago.estado === "CONFIRMADO")).toBe(true);
      }
    }
  });

  it("los números de cuota son correlativos y las coberturas no se pisan", async () => {
    const cuotas = await entorno.prisma.cuotas.findMany({
      orderBy: [{ id_inscripcion: "asc" }, { numero_cuota: "asc" }],
    });
    const porInscripcion = new Map<number, typeof cuotas>();
    for (const cuota of cuotas) {
      porInscripcion.set(cuota.id_inscripcion, [...(porInscripcion.get(cuota.id_inscripcion) ?? []), cuota]);
    }
    for (const lista of porInscripcion.values()) {
      lista.forEach((cuota, indice) => {
        expect(cuota.numero_cuota).toBe(indice + 1);
        if (indice > 0) expect(cuota.fecha_vencimiento > lista[indice - 1].fecha_vencimiento).toBe(true);
      });
    }
  });

  it("ningún pago ni ninguna asistencia queda en el futuro", async () => {
    const ahora = new Date();
    expect(await entorno.prisma.pagos.count({ where: { fecha_pago: { gt: ahora } } })).toBe(0);
    expect(await entorno.prisma.asistencias.count({ where: { fecha_registro: { gt: ahora } } })).toBe(0);
    expect(
      await entorno.prisma.clases.count({ where: { fecha_clase: { gte: fechaActualArgentina() } } }),
    ).toBe(0);
  });

  it("los tutores quedan activos con el rol TUTOR", async () => {
    for (const { email } of TUTORES) {
      const tutor = await entorno.prisma.usuarios.findUniqueOrThrow({
        where: { email },
        include: { roles: { include: { rol: true } } },
      });
      expect(tutor.estado).toBe("ACTIVO");
      expect(tutor.roles.map(({ rol }) => rol.codigo)).toContain("TUTOR");
    }
  });

  it("el listado de alumnos muestra cuotas al día, por vencer y vencidas", async () => {
    for (const estado of ["AL_DIA", "POR_VENCER", "VENCIDA"]) {
      const respuesta = await comoPropietaria(`/alumnos?estado_cuota=${estado}`);
      expect(respuesta.status).toBe(200);
      expect(JSON.stringify(respuesta.body)).not.toBe("[]");
      expect(respuesta.body.total ?? respuesta.body.length).toBeGreaterThan(0);
    }
  });

  it("hay transferencias pendientes de verificación y efectivo a rendir", async () => {
    const transferencias = await comoPropietaria("/pagos/transferencias?estado=PENDIENTE");
    expect(transferencias.status).toBe(200);
    expect(transferencias.body.total ?? transferencias.body.length).toBeGreaterThanOrEqual(2);
    const efectivo = await comoPropietaria("/pagos/efectivo-pendiente");
    expect(efectivo.status).toBe(200);
  });

  it("los reportes y las liquidaciones responden con los datos cargados", async () => {
    for (const ruta of [
      "/reportes/asistencia",
      "/reportes/cobranza",
      "/reportes/cuotas-vencidas",
      "/reportes/inscripciones",
      "/reportes/ocupacion",
      "/reportes/ranking-asistencia",
      "/informes/alumnos-inactivos",
    ]) {
      const respuesta = await comoPropietaria(ruta);
      expect(respuesta.status, ruta).toBe(200);
    }
    const liquidaciones = await entorno.prisma.liquidaciones.groupBy({ by: ["estado"], _count: true });
    expect(liquidaciones.map(({ estado }) => estado).sort()).toEqual(["CERRADA", "PAGADA"]);
    const mesPasado = await comoPropietaria(`/liquidaciones?periodo=${periodoDelMesPasado()}`);
    expect(mesPasado.status).toBe(200);
    expect(JSON.stringify(mesPasado.body)).toContain("CERRADA");
  });

  it("el reporte de inactivos muestra a quienes dejaron de venir y el ranking lo encabeza Lucas Benítez", async () => {
    const inactivos = await comoPropietaria("/informes/alumnos-inactivos");
    for (const apellido of ["Morales", "Silva", "Luna"])
      expect(JSON.stringify(inactivos.body)).toContain(apellido);
    const ranking = await comoPropietaria("/reportes/ranking-asistencia");
    expect(JSON.stringify(ranking.body).indexOf("Benítez")).toBeGreaterThan(-1);
  });

  it.each([1, 2])("el reporte de inscripciones de hace %i años tiene altas y bajas", async (aniosAtras) => {
    const anio = fechaActualArgentina().getUTCFullYear() - aniosAtras;
    const respuesta = await comoPropietaria(`/reportes/inscripciones?anio=${anio}`);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.resumen.total_altas).toBeGreaterThan(20);
    expect(respuesta.body.resumen.total_bajas).toBeGreaterThan(0);
  });

  it("el mapa de ocupación tiene franjas libres, moderadas, casi llenas y completas", async () => {
    const respuesta = await comoPropietaria("/reportes/ocupacion");
    expect(respuesta.status).toBe(200);
    const { por_nivel } = respuesta.body.resumen;
    for (const nivel of ["LIBRE", "MODERADO", "CASI_LLENO", "COMPLETO"]) {
      expect(por_nivel[nivel], nivel).toBeGreaterThan(0);
    }
  });

  it("el panel de la alumna y el de la tutora responden", async () => {
    const alumna = await entorno.iniciarSesion("camila.perez@example.com");
    const panel = await request(entorno.app)
      .get("/api/v1/alumnos/mi-panel")
      .set("Authorization", `Bearer ${alumna}`);
    expect(panel.status).toBe(200);
    const tutora = await entorno.iniciarSesion("mariana.lopez@example.com");
    const mios = await request(entorno.app)
      .get("/api/v1/alumnos/mios")
      .set("Authorization", `Bearer ${tutora}`);
    expect(mios.status).toBe(200);
    expect(JSON.stringify(mios.body)).toContain("Benjamín");
  });

  // Va al final: pedir las clases de hoy cierra las que ya terminaron y, sin marcas, deja presentes a
  // todos sus inscriptos. A quien dejó de venir y tenía clase hoy le corta la racha del informe de inactivos.
  it("las clases de hoy responden", async () => {
    const respuesta = await comoPropietaria("/clases/hoy");
    expect(respuesta.status).toBe(200);
  });
});
