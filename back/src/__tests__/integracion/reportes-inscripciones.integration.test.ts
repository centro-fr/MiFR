import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { reiniciarBase } from "./base-de-prueba.js";
import { crearEntornoDeIntegracion } from "./entorno.js";
import {
  crearActividad,
  crearAlumno,
  crearHorarioDePrueba,
  crearInscripcionDePrueba,
  crearPlan,
  crearProfesora,
  crearUsuario,
} from "./fabricas.js";

// Caso PI-87: altas, bajas, activos, motivos y permanencia del reporte de Inscripciones (US-35), sobre
// 2025. Ana y Beto ya estaban al empezar el año; Caro entra en febrero y Dani en marzo. En abril se van
// Beto (mudanza, después de 410 días) y Dani (abandono, a los 46). Eva sigue pre-inscripta y no cuenta.
const entorno = crearEntornoDeIntegracion();
const { prisma } = entorno;

let emailPropietaria: string;
let profesora: { id_profesora: number };
let otraProfesora: { id_profesora: number };

const instante = (dia: string) => new Date(`${dia}T15:00:00Z`);

async function alumnoCon(
  estado: "ACTIVO" | "INACTIVO" | "BAJA",
  alta: string,
  baja: string | null = null,
): Promise<number> {
  const { id_alumno } = await crearAlumno(prisma, { estado: estado === "BAJA" ? "ACTIVO" : estado });
  await prisma.alumnos.update({
    where: { id_alumno },
    data: { estado, fecha_alta: instante(alta), fecha_baja: baja ? instante(baja) : null },
  });
  return id_alumno;
}

beforeEach(async () => {
  await reiniciarBase(prisma);
  emailPropietaria = (await crearUsuario(prisma, { roles: ["PROPIETARIA"] })).email;
  profesora = await crearProfesora(prisma);
  otraProfesora = await crearProfesora(prisma);
  const plan = await crearPlan(prisma, { vigenteDesde: new Date("2024-01-01T00:00:00Z") });
  const { id_actividad } = await crearActividad(prisma);
  const { id_horario } = await crearHorarioDePrueba(prisma, {
    id_actividad,
    id_profesora: profesora.id_profesora,
    dia_semana: 1,
    hora_inicio: "18:00",
    hora_fin: "19:00",
    fecha_alta: new Date("2024-01-01T00:00:00Z"),
  });
  const inscribir = async (
    id_alumno: number,
    inicio: string,
    baja?: { dia: string; motivo: "MUDANZA" | "ABANDONO" },
  ) => {
    const { id_inscripcion } = await crearInscripcionDePrueba(prisma, {
      id_alumno,
      plan,
      id_profesora: profesora.id_profesora,
      id_horario,
      estado: baja ? "BAJA" : "ACTIVA",
      fecha_inicio: new Date(`${inicio}T00:00:00Z`),
    });
    if (baja) {
      await prisma.inscripciones.update({
        where: { id_inscripcion },
        data: { fecha_baja: instante(baja.dia), motivo_baja: baja.motivo },
      });
    }
  };

  await inscribir(await alumnoCon("ACTIVO", "2024-06-10"), "2024-06-10");
  await inscribir(await alumnoCon("BAJA", "2024-03-01", "2025-04-15"), "2024-03-01", {
    dia: "2025-04-15",
    motivo: "MUDANZA",
  });
  await inscribir(await alumnoCon("ACTIVO", "2025-02-10"), "2025-02-10");
  await inscribir(await alumnoCon("BAJA", "2025-03-05", "2025-04-20"), "2025-03-05", {
    dia: "2025-04-20",
    motivo: "ABANDONO",
  });
  await inscribir(await alumnoCon("INACTIVO", "2025-03-01"), "2025-03-01");
});

afterAll(() => entorno.cerrar());

async function pedir(consulta: string) {
  const token = await entorno.iniciarSesion(emailPropietaria);
  return request(entorno.app)
    .get(`/api/v1/reportes/inscripciones?${consulta}`)
    .set("Authorization", `Bearer ${token}`);
}

describe("PI-87: el movimiento de alumnos del año (US-35)", () => {
  it("S-01 cuenta altas y bajas de cada mes y arrastra los activos desde los que había al empezar", async () => {
    const respuesta = await pedir("anio=2025");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.resumen).toMatchObject({ total_altas: 2, total_bajas: 2, activos_al_inicio: 2 });
    const meses = respuesta.body.meses as { cantidad: number; bajas: number; activos_al_cierre: number }[];
    expect(
      meses.slice(0, 5).map(({ cantidad, bajas, activos_al_cierre }) => [cantidad, bajas, activos_al_cierre]),
    ).toEqual([
      [0, 0, 2],
      [1, 0, 3],
      [1, 0, 4],
      [0, 2, 2],
      [0, 0, 2],
    ]);
    expect(meses[11]?.activos_al_cierre).toBe(2);
  });

  it("S-02 informa por qué se fueron y cuánto llevaban, sin contar la pre-inscripción", async () => {
    const { body } = await pedir("anio=2025");

    expect(body.bajas.motivos).toHaveLength(2);
    expect(body.bajas.motivos).toEqual(
      expect.arrayContaining([
        { motivo: "MUDANZA", cantidad: 1 },
        { motivo: "ABANDONO", cantidad: 1 },
      ]),
    );
    expect(body.bajas.permanencia).toEqual({ cantidad: 2, promedio_meses: 7.5, primeros_tres_meses: 1 });
  });

  it("S-03 con otra profesora no hay movimiento, y en 2024 Beto y Ana son altas", async () => {
    const deOtra = (await pedir(`anio=2025&id_profesora=${otraProfesora.id_profesora}`)).body;
    const anterior = (await pedir("anio=2024")).body;

    expect(deOtra.resumen).toMatchObject({ total_altas: 0, total_bajas: 0, activos_al_inicio: 0 });
    expect(deOtra.bajas).toEqual({
      motivos: [],
      permanencia: { cantidad: 0, promedio_meses: null, primeros_tres_meses: 0 },
    });
    expect(anterior.resumen).toMatchObject({ total_altas: 2, total_bajas: 0, activos_al_inicio: 0 });
    expect(anterior.meses[11].activos_al_cierre).toBe(2);
  });
});
