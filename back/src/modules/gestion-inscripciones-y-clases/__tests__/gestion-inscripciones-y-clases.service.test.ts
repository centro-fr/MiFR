import { beforeEach, describe, expect, it, vi } from "vitest";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import { GestionInscripcionesYClasesService } from "../gestion-inscripciones-y-clases.service.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { AsistenciaService } from "../asistencia/asistencia.service.js";
import type { CierreAsistenciaService } from "../cierre-asistencia/cierre-asistencia.service.js";
import type { ClaseService } from "../clase/clase.service.js";
import type { InscripcionService } from "../inscripcion/inscripcion.service.js";

const solicitante: Solicitante = { idUsuario: 1, esPropietaria: true };
const cambios = { id_plan: 2, id_profesora: 3, ids_horarios: [8], sin_cargo: false };

function claseCon(idHorario: number, cupoHorario: number | null, cupoActividad: number | null) {
  return {
    id_clase: idHorario * 10,
    id_horario: idHorario,
    horario: { cupo_maximo: cupoHorario, actividad: { cupo_maximo: cupoActividad } },
  };
}

const vencida = {
  estado: "VENCIDA",
  fechaVencimiento: new Date("2026-10-01T00:00:00Z"),
  diasRestantes: -11,
  puedeAsistir: true,
  tienePagoPendiente: false,
};

describe("GestionInscripcionesYClasesService", () => {
  const inscripciones = {
    crear: vi.fn().mockResolvedValue("inscripciones.crear"),
    listar: vi.fn().mockResolvedValue("inscripciones.listar"),
    obtenerPara: vi.fn().mockResolvedValue("inscripciones.obtenerPara"),
    darDeBajaAlumno: vi.fn().mockResolvedValue("inscripciones.darDeBajaAlumno"),
    reactivarAlumno: vi.fn().mockResolvedValue("inscripciones.reactivarAlumno"),
    cambiarPlan: vi.fn().mockResolvedValue("inscripciones.cambiarPlan"),
    actualizarHorarios: vi.fn().mockResolvedValue("inscripciones.actualizarHorarios"),
    contarInscriptosParaAsistencia: vi.fn(),
  };
  const cuotas = { tuvoPagoConfirmado: vi.fn(), habilitacionDeInscripciones: vi.fn() };
  const clases = { materializarDelDia: vi.fn(), listarDelDia: vi.fn(), obtenerPara: vi.fn() };
  const asistencias = { listarDeClase: vi.fn(), marcar: vi.fn(), marcarTodosPresentes: vi.fn() };
  const cierre = { procesarCierresAutomaticos: vi.fn(), cerrarManualmente: vi.fn() };
  const gestion = new GestionInscripcionesYClasesService(
    inscripciones as unknown as InscripcionService,
    cuotas as unknown as IInfoCuotas,
    clases as unknown as ClaseService,
    asistencias as unknown as AsistenciaService,
    cierre as unknown as CierreAsistenciaService,
  );

  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["crearInscripcion", [{ id_alumno: 5, ...cambios }, solicitante], "crear"],
    ["listarInscripciones", [{ id_plan: 1 }, solicitante], "listar"],
    ["obtenerInscripcion", [12, solicitante], "obtenerPara"],
    ["darDeBajaAlumno", [5, { motivo_baja: "ABANDONO" }], "darDeBajaAlumno"],
    ["cambiarPlan", [12, cambios], "cambiarPlan"],
    ["actualizarHorarios", [12, { ids_horarios: [8] }], "actualizarHorarios"],
  ] as const)("%s se delega en Inscripcion", async (metodo, argumentos, destino) => {
    const llamar = gestion[metodo] as (...args: unknown[]) => Promise<unknown>;

    await expect(llamar.apply(gestion, [...argumentos])).resolves.toBe(`inscripciones.${destino}`);
    expect(inscripciones[destino]).toHaveBeenCalledWith(...argumentos);
  });

  it.each([
    [true, "ACTIVA"],
    [false, "PREINSCRIPTA"],
  ] as const)(
    "reactivarAlumno con tuvoPagoConfirmado %s reactiva con la inscripción %s (US-07)",
    async (yaPago, estado) => {
      cuotas.tuvoPagoConfirmado.mockResolvedValue(yaPago);

      await expect(gestion.reactivarAlumno(5, cambios)).resolves.toBe("inscripciones.reactivarAlumno");
      expect(cuotas.tuvoPagoConfirmado).toHaveBeenCalledWith(5);
      expect(inscripciones.reactivarAlumno).toHaveBeenCalledWith(5, cambios, estado);
    },
  );

  it("listarClasesDeHoy materializa, cierra las vencidas y después lista, en ese orden", async () => {
    clases.listarDelDia.mockResolvedValue([]);
    inscripciones.contarInscriptosParaAsistencia.mockResolvedValue(new Map());

    await gestion.listarClasesDeHoy(solicitante);

    const [materializar] = clases.materializarDelDia.mock.invocationCallOrder;
    const [cerrar] = cierre.procesarCierresAutomaticos.mock.invocationCallOrder;
    const [listar] = clases.listarDelDia.mock.invocationCallOrder;
    expect(materializar).toBeLessThan(cerrar!);
    expect(cerrar).toBeLessThan(listar!);
    expect(clases.materializarDelDia).toHaveBeenCalledWith(solicitante);
  });

  it("listarClasesDeHoy suma los inscriptos de hoy y el cupo disponible, del horario o de la actividad", async () => {
    clases.listarDelDia.mockResolvedValue([
      claseCon(1, 10, 20),
      claseCon(2, null, 8),
      claseCon(3, null, null),
    ]);
    inscripciones.contarInscriptosParaAsistencia.mockResolvedValue(new Map([[1, 4]]));

    const resultado = await gestion.listarClasesDeHoy(solicitante);

    expect(inscripciones.contarInscriptosParaAsistencia).toHaveBeenCalledWith(
      [1, 2, 3],
      fechaActualArgentina(),
    );
    expect(resultado.map(({ inscriptos, cupo_disponible }) => [inscriptos, cupo_disponible])).toEqual([
      [4, 6],
      [0, 8],
      [0, null],
    ]);
  });

  it("obtenerAsistenciaDeClase cierra las vencidas antes de leer y suma la situación de cuota de cada inscripto", async () => {
    const clase = { id_clase: 20 };
    clases.obtenerPara.mockResolvedValue(clase);
    asistencias.listarDeClase.mockResolvedValue([
      { id_alumno: 5, id_inscripcion: 50, asistencia: "presente" },
      { id_alumno: 6, id_inscripcion: 60, asistencia: "sin_marcar" },
    ]);
    cuotas.habilitacionDeInscripciones.mockResolvedValue(new Map([[50, vencida]]));

    const resultado = await gestion.obtenerAsistenciaDeClase(20, solicitante);

    expect(cierre.procesarCierresAutomaticos.mock.invocationCallOrder[0]).toBeLessThan(
      clases.obtenerPara.mock.invocationCallOrder[0]!,
    );
    expect(clases.obtenerPara).toHaveBeenCalledWith(20, solicitante);
    expect(cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([50, 60]);
    expect(resultado).toEqual({
      clase,
      inscriptos: [
        {
          id_alumno: 5,
          id_inscripcion: 50,
          asistencia: "presente",
          situacion_cuota: {
            estado: "VENCIDA",
            fecha_vencimiento: vencida.fechaVencimiento,
            dias_restantes: -11,
            puede_asistir: true,
            tiene_pago_pendiente: false,
          },
        },
        { id_alumno: 6, id_inscripcion: 60, asistencia: "sin_marcar", situacion_cuota: null },
      ],
    });
  });

  it("marcarAsistencia cierra las ventanas vencidas antes de delegar en Asistencia", async () => {
    await gestion.marcarAsistencia(20, 5, { asistio: true }, solicitante);

    expect(cierre.procesarCierresAutomaticos.mock.invocationCallOrder[0]).toBeLessThan(
      asistencias.marcar.mock.invocationCallOrder[0]!,
    );
    expect(asistencias.marcar).toHaveBeenCalledWith(20, 5, { asistio: true }, solicitante);
  });

  it("marcarTodosPresentes cierra las ventanas vencidas antes de delegar en Asistencia", async () => {
    await gestion.marcarTodosPresentes(20, solicitante);

    expect(cierre.procesarCierresAutomaticos.mock.invocationCallOrder[0]).toBeLessThan(
      asistencias.marcarTodosPresentes.mock.invocationCallOrder[0]!,
    );
    expect(asistencias.marcarTodosPresentes).toHaveBeenCalledWith(20, solicitante);
  });

  it("cerrarAsistencia se delega en CierreAsistencia", async () => {
    cierre.cerrarManualmente.mockResolvedValue("cerrada");

    await expect(gestion.cerrarAsistencia(20, solicitante)).resolves.toBe("cerrada");
    expect(cierre.cerrarManualmente).toHaveBeenCalledWith(20, solicitante);
  });
});
