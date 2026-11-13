import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { obtenerAlumno } from "@/features/alumnos/api/alumnos-api";
import { actualizarHorarios, cambiarPlan, cancelarCambioPlan } from "@/features/alumnos/api/inscripciones-api";
import { clearSessionToken, setSessionToken } from "@/features/auth/api/session-token";
import { cancelarBajaProgramadaHorario, darDeBajaHorario } from "@/features/horarios/api/horarios-api";
import { db } from "@/mocks/db";
import { alumnosHandlers } from "@/mocks/handlers/alumnos";
import { horariosHandlers } from "@/mocks/handlers/horarios";
import { inscripcionesHandlers } from "@/mocks/handlers/inscripciones";
import { MOCK_JWT } from "@/mocks/handlers/respuestas";
import { situacionCuotaDe } from "@/mocks/situacion-cuota";

const server = setupServer(...alumnosHandlers, ...inscripcionesHandlers, ...horariosHandlers);
let copia: string;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  copia = JSON.stringify({ inscripciones: db.inscripciones, horarios: db.horarios, cambiosPlan: db.cambiosPlan });
  setSessionToken(MOCK_JWT);
});
afterEach(() => {
  Object.assign(db, JSON.parse(copia));
  clearSessionToken();
});

// Una inscripción activa con la cuota al día y otro plan que admite sus mismos horarios.
function activaAlDiaConOtroPlan() {
  const inscripcion = db.inscripciones.find((i) => i.estado === "ACTIVA" && situacionCuotaDe(i).estado === "AL_DIA")!;
  const actividades = db.horarios.filter((h) => inscripcion.ids_horarios.includes(h.id_horario)).map((h) => h.id_actividad);
  const plan = db.planes.find(
    (p) =>
      p.id_plan !== inscripcion.id_plan &&
      p.fecha_baja === null &&
      p.tipo === "MENSUAL" &&
      (p.clases_por_semana === null || p.clases_por_semana >= inscripcion.ids_horarios.length) &&
      (p.id_actividad_exclusiva === null || actividades.every((a) => a === p.id_actividad_exclusiva)),
  )!;
  const cambio = { id_plan: plan.id_plan, id_profesora: inscripcion.id_profesora, ids_horarios: inscripcion.ids_horarios };
  return { inscripcion, plan, cambio };
}

describe("cambio de plan programado (US-14)", () => {
  it("con el plan vigente queda programado, la ficha lo muestra y se puede cancelar", async () => {
    const { inscripcion, plan, cambio } = activaAlDiaConOtroPlan();

    const { programadoPara } = await cambiarPlan(inscripcion.id_inscripcion, cambio);

    expect(programadoPara).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(db.inscripciones.find((i) => i.id_inscripcion === inscripcion.id_inscripcion)?.estado).toBe("ACTIVA");
    const ficha = await obtenerAlumno(inscripcion.id_alumno);
    const enFicha = ficha.inscripciones?.find((i) => i.id_inscripcion === inscripcion.id_inscripcion);
    expect(enFicha?.cambio_programado).toMatchObject({ id_plan: plan.id_plan, fecha_aplicacion: programadoPara });

    await cancelarCambioPlan(inscripcion.id_inscripcion);
    expect(db.cambiosPlan).toHaveLength(0);
    await expect(cancelarCambioPlan(inscripcion.id_inscripcion)).rejects.toMatchObject({ response: { status: 404 } });
  });

  it("los horarios no se cambian en una pre-inscripción", async () => {
    const preinscripta = db.inscripciones.find((i) => i.estado === "PREINSCRIPTA")!;

    await expect(actualizarHorarios(preinscripta.id_inscripcion, preinscripta.ids_horarios)).rejects.toMatchObject({
      response: { status: 409 },
    });
  });

  it("los horarios no pasan a otra profesora", async () => {
    const { inscripcion } = activaAlDiaConOtroPlan();
    const deOtra = db.horarios.find((h) => h.fecha_baja === null && h.id_profesora !== inscripcion.id_profesora)!;

    await expect(actualizarHorarios(inscripcion.id_inscripcion, [deOtra.id_horario])).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});

describe("baja programada de un horario (US-04)", () => {
  it("con alumnos se programa en lugar de darse de baja, y se cancela", async () => {
    const { inscripcion } = activaAlDiaConOtroPlan();
    const idHorario = String(inscripcion.ids_horarios[0]);

    await expect(darDeBajaHorario(idHorario)).resolves.toMatchObject({ programada: true });
    expect(db.horarios.find((h) => String(h.id_horario) === idHorario)?.fecha_baja).toBeNull();

    await cancelarBajaProgramadaHorario(idHorario);
    expect(db.horarios.find((h) => String(h.id_horario) === idHorario)?.fecha_baja_programada).toBeNull();
  });
});
