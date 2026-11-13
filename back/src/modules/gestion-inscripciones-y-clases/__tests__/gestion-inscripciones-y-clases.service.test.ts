import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../shared/errors/app-error.js";
import type { IUnidadDeTrabajo } from "../../../shared/db/transaccion.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import { GestionInscripcionesYClasesService } from "../gestion-inscripciones-y-clases.service.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { AsistenciaService } from "../asistencia/asistencia.service.js";
import type { CierreAsistenciaService } from "../cierre-asistencia/cierre-asistencia.service.js";
import type { ClaseService } from "../clase/clase.service.js";
import type { InscripcionService } from "../inscripcion/inscripcion.service.js";
import type { SuplenciaService } from "../suplencia/suplencia.service.js";

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
    preinscribir: vi.fn().mockResolvedValue("inscripciones.preinscribir"),
    listar: vi.fn().mockResolvedValue("inscripciones.listar"),
    obtenerPara: vi.fn().mockResolvedValue("inscripciones.obtenerPara"),
    darDeBajaAlumno: vi.fn().mockResolvedValue("inscripciones.darDeBajaAlumno"),
    reactivarAlumno: vi.fn().mockResolvedValue("inscripciones.reactivarAlumno"),
    cambiarPlan: vi.fn().mockResolvedValue("inscripciones.cambiarPlan"),
    actualizarHorarios: vi.fn().mockResolvedValue("inscripciones.actualizarHorarios"),
    contarInscriptosParaAsistencia: vi.fn(),
    contarLugaresOcupados: vi.fn().mockResolvedValue(new Map()),
  };
  const cuotas = { tuvoPagoConfirmado: vi.fn(), habilitacionDeInscripciones: vi.fn() };
  const clases = {
    materializarDelDia: vi.fn(),
    listarDelDia: vi.fn(),
    obtenerPara: vi.fn(),
    bloquearParaCancelar: vi.fn(),
    cancelar: vi.fn(),
  };
  const asistencias = {
    listarDeClase: vi.fn(),
    marcar: vi.fn(),
    marcarTodosPresentes: vi.fn(),
    tieneMarcasManuales: vi.fn(),
  };
  const cierre = { procesarCierresAutomaticos: vi.fn(), cerrarManualmente: vi.fn() };
  const unidadDeTrabajo = { ejecutar: vi.fn(<T>(operacion: () => Promise<T>) => operacion()) };
  const suplencias = {
    listar: vi.fn().mockResolvedValue("suplencias.listar"),
    registrar: vi.fn().mockResolvedValue("suplencias.registrar"),
    cambiar: vi.fn().mockResolvedValue("suplencias.cambiar"),
    eliminar: vi.fn().mockResolvedValue("suplencias.eliminar"),
  };
  const gestion = new GestionInscripcionesYClasesService(
    inscripciones as unknown as InscripcionService,
    cuotas as unknown as IInfoCuotas,
    clases as unknown as ClaseService,
    asistencias as unknown as AsistenciaService,
    cierre as unknown as CierreAsistenciaService,
    unidadDeTrabajo as unknown as IUnidadDeTrabajo,
    suplencias as unknown as SuplenciaService,
  );

  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["crearInscripcion", [{ id_alumno: 5, ...cambios }, solicitante], "crear"],
    ["preinscribir", [{ alumno: { nombre: "Tomás" }, inscripcion: cambios }, solicitante], "preinscribir"],
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
    ["listarSuplencias", [{ id_profesora: 3 }], "listar"],
    ["registrarSuplencia", [{ id_clase: 40, id_profesora_suplente: 4 }, 1], "registrar"],
    ["cambiarSuplencia", [40, { id_profesora_suplente: 5 }, 1], "cambiar"],
    ["eliminarSuplencia", [40], "eliminar"],
  ] as const)("%s se delega en Suplencia", async (metodo, argumentos, destino) => {
    const llamar = gestion[metodo] as (...args: unknown[]) => Promise<unknown>;

    await expect(llamar.apply(gestion, [...argumentos])).resolves.toBe(`suplencias.${destino}`);
    expect(suplencias[destino]).toHaveBeenCalledWith(...argumentos);
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
    expect(clases.materializarDelDia).toHaveBeenCalledWith(solicitante, undefined);
  });

  it("listarClasesDeHoy suma los inscriptos de la lista y el cupo disponible, que descuenta también las reservas", async () => {
    clases.listarDelDia.mockResolvedValue([
      claseCon(1, 10, 20),
      claseCon(2, null, 8),
      claseCon(3, null, null),
    ]);
    inscripciones.contarInscriptosParaAsistencia.mockResolvedValue(new Map([[1, 4]]));
    // El horario 1 tiene además un pre-inscripto con la reserva vigente: ocupa lugar, pero no está en la lista.
    inscripciones.contarLugaresOcupados.mockResolvedValue(new Map([[1, 5]]));

    const resultado = await gestion.listarClasesDeHoy(solicitante);

    expect(inscripciones.contarInscriptosParaAsistencia).toHaveBeenCalledWith(
      [1, 2, 3],
      fechaActualArgentina(),
    );
    expect(inscripciones.contarLugaresOcupados).toHaveBeenCalledWith([1, 2, 3]);
    expect(resultado.map(({ inscriptos, cupo_disponible }) => [inscriptos, cupo_disponible])).toEqual([
      [4, 5],
      [0, 8],
      [0, null],
    ]);
  });

  it("listarClasesDeFecha materializa, lista y cuenta los inscriptos de ese día", async () => {
    const ayer = new Date("2026-10-11T00:00:00Z");
    clases.listarDelDia.mockResolvedValue([claseCon(1, 10, 20)]);
    inscripciones.contarInscriptosParaAsistencia.mockResolvedValue(new Map());

    await gestion.listarClasesDeFecha(ayer, solicitante);

    expect(clases.materializarDelDia).toHaveBeenCalledWith(solicitante, ayer);
    expect(cierre.procesarCierresAutomaticos).toHaveBeenCalled();
    expect(clases.listarDelDia).toHaveBeenCalledWith(solicitante, ayer);
    expect(inscripciones.contarInscriptosParaAsistencia).toHaveBeenCalledWith([1], ayer);
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

  describe("cancelarClase", () => {
    it("cancela una clase PROGRAMADA sin marcas, bajo el bloqueo de la clase, y la devuelve", async () => {
      clases.bloquearParaCancelar.mockResolvedValue("PROGRAMADA");
      asistencias.tieneMarcasManuales.mockResolvedValue(false);
      clases.obtenerPara.mockResolvedValue({ id_clase: 20, estado: "CANCELADA" });
      // Adentro de la transacción la lectura todavía vería la clase sin cancelar: se relee al confirmar.
      unidadDeTrabajo.ejecutar.mockImplementationOnce(async (operacion: () => Promise<unknown>) => {
        await operacion();
        expect(clases.obtenerPara).not.toHaveBeenCalled();
      });

      await expect(gestion.cancelarClase(20, solicitante)).resolves.toEqual({
        id_clase: 20,
        estado: "CANCELADA",
      });
      expect(unidadDeTrabajo.ejecutar).toHaveBeenCalledTimes(1);
      expect(clases.bloquearParaCancelar).toHaveBeenCalledWith(20);
      expect(asistencias.tieneMarcasManuales).toHaveBeenCalledWith(20);
      expect(clases.cancelar).toHaveBeenCalledWith(20);
      expect(clases.obtenerPara).toHaveBeenCalledWith(20, solicitante);
    });

    it("no cancela una clase que ya tiene asistencias marcadas", async () => {
      clases.bloquearParaCancelar.mockResolvedValue("PROGRAMADA");
      asistencias.tieneMarcasManuales.mockResolvedValue(true);

      await expect(gestion.cancelarClase(20, solicitante)).rejects.toBeInstanceOf(ConflictError);
      expect(clases.cancelar).not.toHaveBeenCalled();
    });

    it("cancelar una clase ya cancelada la devuelve sin tocar nada", async () => {
      clases.bloquearParaCancelar.mockResolvedValue("CANCELADA");
      clases.obtenerPara.mockResolvedValue({ id_clase: 20, estado: "CANCELADA" });

      await expect(gestion.cancelarClase(20, solicitante)).resolves.toMatchObject({ estado: "CANCELADA" });
      expect(asistencias.tieneMarcasManuales).not.toHaveBeenCalled();
      expect(clases.cancelar).not.toHaveBeenCalled();
    });
  });

  it("cerrarAsistencia se delega en CierreAsistencia", async () => {
    cierre.cerrarManualmente.mockResolvedValue("cerrada");

    await expect(gestion.cerrarAsistencia(20, solicitante)).resolves.toBe("cerrada");
    expect(cierre.cerrarManualmente).toHaveBeenCalledWith(20, solicitante);
  });
});
