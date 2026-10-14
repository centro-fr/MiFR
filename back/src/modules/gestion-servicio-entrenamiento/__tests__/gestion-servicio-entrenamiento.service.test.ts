import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ValidationError } from "../../../shared/errors/app-error.js";
import type { ActividadService } from "../actividad/actividad.service.js";
import type { Actividad } from "../actividad/actividad.types.js";
import type { HorarioService } from "../horario/horario.service.js";
import type { ParametrosSistemaService } from "../parametros-sistema/parametros-sistema.service.js";
import type { PlanService } from "../plan/plan.service.js";
import type { PromocionService } from "../promocion/promocion.service.js";
import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import { GestionServicioEntrenamientoService } from "../gestion-servicio-entrenamiento.service.js";

const actividadDadaDeBaja: Actividad = {
  id_actividad: 1,
  codigo: "HIIT",
  nombre: "HIIT",
  descripcion: null,
  modalidad: "GRUPAL",
  cupo_maximo: 20,
  requiere_medidas: false,
  activo: false,
};

describe("GestionServicioEntrenamientoService", () => {
  let actividades: Pick<ActividadService, "darDeBaja" | "obtenerPorId">;
  let horarios: Pick<HorarioService, "darDeBajaDeActividad" | "darDeBaja" | "listar" | "obtenerPorId">;
  let inscripciones: Pick<IInfoInscripciones, "contarInscriptosVigentes" | "contarLugaresOcupados">;
  let planes: Pick<PlanService, "listar">;
  let servicio: GestionServicioEntrenamientoService;

  beforeEach(() => {
    actividades = { darDeBaja: vi.fn(), obtenerPorId: vi.fn().mockResolvedValue({ id_actividad: 1 }) };
    horarios = {
      darDeBajaDeActividad: vi.fn().mockResolvedValue(3),
      darDeBaja: vi.fn().mockResolvedValue({ id_horario: 3 }),
      listar: vi.fn().mockResolvedValue([
        { id_horario: 3, cupo_maximo_efectivo: 4 },
        { id_horario: 4, cupo_maximo_efectivo: 1 },
        { id_horario: 5, cupo_maximo_efectivo: null },
      ]),
      obtenerPorId: vi.fn().mockResolvedValue({ id_horario: 3, cupo_maximo_efectivo: 4 }),
    };
    inscripciones = {
      contarInscriptosVigentes: vi.fn().mockResolvedValue(new Map()),
      contarLugaresOcupados: vi.fn().mockResolvedValue(new Map()),
    };
    planes = { listar: vi.fn().mockResolvedValue([]) };
    servicio = new GestionServicioEntrenamientoService(
      actividades as unknown as ActividadService,
      horarios as unknown as HorarioService,
      planes as unknown as PlanService,
      {} as unknown as ParametrosSistemaService,
      inscripciones as unknown as IInfoInscripciones,
      {} as unknown as PromocionService,
    );
  });

  it("darDeBajaActividad da de baja la actividad junto con sus horarios sin alumnos", async () => {
    vi.mocked(actividades.darDeBaja).mockResolvedValue(actividadDadaDeBaja);

    await expect(servicio.darDeBajaActividad(1)).resolves.toEqual(actividadDadaDeBaja);
    expect(planes.listar).toHaveBeenCalledWith({ id_actividad_exclusiva: 1 });
    expect(horarios.listar).toHaveBeenCalledWith({ id_actividad: 1 });
    expect(inscripciones.contarInscriptosVigentes).toHaveBeenCalledWith([3, 4, 5]);
    expect(horarios.darDeBajaDeActividad).toHaveBeenCalledWith(1);
    expect(actividades.darDeBaja).toHaveBeenCalledWith(1);
  });

  it("darDeBajaActividad bloquea la baja si algún horario tiene alumnos inscriptos", async () => {
    vi.mocked(inscripciones.contarInscriptosVigentes).mockResolvedValue(new Map([[4, 1]]));

    await expect(servicio.darDeBajaActividad(1)).rejects.toThrow("1 horario(s) con alumnos inscriptos");
    expect(horarios.darDeBajaDeActividad).not.toHaveBeenCalled();
    expect(actividades.darDeBaja).not.toHaveBeenCalled();
  });

  it("darDeBajaActividad bloquea la baja si tiene planes vigentes exclusivos y los nombra", async () => {
    vi.mocked(planes.listar).mockResolvedValue([
      { nombre: "Personalizado 2 días" },
      { nombre: "Personalizado 3 días" },
    ] as Awaited<ReturnType<PlanService["listar"]>>);

    const baja = servicio.darDeBajaActividad(1);

    await expect(baja).rejects.toThrow(ConflictError);
    await expect(baja).rejects.toThrow(
      "La actividad tiene planes vigentes que son solo de ella (Personalizado 2 días, Personalizado 3 días): " +
        "dalos de baja o pasalos a otra actividad antes de darla de baja",
    );
    expect(horarios.listar).not.toHaveBeenCalled();
    expect(horarios.darDeBajaDeActividad).not.toHaveBeenCalled();
    expect(actividades.darDeBaja).not.toHaveBeenCalled();
  });

  it("darDeBajaActividad no toca los horarios si la actividad no existe", async () => {
    vi.mocked(actividades.obtenerPorId).mockRejectedValue(new Error("no existe"));

    await expect(servicio.darDeBajaActividad(99)).rejects.toThrow("no existe");
    expect(horarios.darDeBajaDeActividad).not.toHaveBeenCalled();
  });

  it("darDeBajaHorario lanza ConflictError si el horario tiene alumnos inscriptos", async () => {
    vi.mocked(inscripciones.contarInscriptosVigentes).mockResolvedValue(new Map([[3, 2]]));

    await expect(servicio.darDeBajaHorario(3)).rejects.toThrow(ConflictError);
    expect(horarios.darDeBaja).not.toHaveBeenCalled();
  });

  it("listarHorarios suma a cada horario sus lugares ocupados y los que le quedan, en una consulta", async () => {
    vi.mocked(inscripciones.contarLugaresOcupados).mockResolvedValue(
      new Map([
        [3, 1],
        [4, 3],
        [5, 7],
      ]),
    );

    const horariosConOcupacion = await servicio.listarHorarios({});

    expect(inscripciones.contarLugaresOcupados).toHaveBeenCalledOnce();
    expect(inscripciones.contarLugaresOcupados).toHaveBeenCalledWith([3, 4, 5]);
    // Las pre-inscripciones con la reserva vencida no ocupan lugar, pero siguen impidiendo la baja.
    expect(inscripciones.contarInscriptosVigentes).not.toHaveBeenCalled();
    expect(
      horariosConOcupacion.map(({ inscriptos, cupo_disponible }) => [inscriptos, cupo_disponible]),
    ).toEqual([
      [1, 3],
      [3, 0],
      [7, null],
    ]);
  });

  it("obtenerHorarioPorId informa 0 inscriptos si no tiene ninguno", async () => {
    await expect(servicio.obtenerHorarioPorId(3)).resolves.toMatchObject({
      inscriptos: 0,
      cupo_disponible: 4,
    });
  });

  it("darDeBajaHorario da de baja el horario sin alumnos inscriptos", async () => {
    vi.mocked(horarios.darDeBaja).mockResolvedValue({ id_horario: 3 } as unknown as Awaited<
      ReturnType<HorarioService["darDeBaja"]>
    >);

    await expect(servicio.darDeBajaHorario(3)).resolves.toEqual({
      horario: { id_horario: 3 },
      advertencia: "El horario no tenía alumnos inscriptos.",
    });
    expect(inscripciones.contarInscriptosVigentes).toHaveBeenCalledWith([3]);
  });
});

describe("GestionServicioEntrenamientoService delega cada operación al componente dueño", () => {
  const actividades = {
    crear: vi.fn().mockResolvedValue("resultado"),
    listar: vi.fn().mockResolvedValue("resultado"),
    obtenerPorId: vi.fn().mockResolvedValue("resultado"),
    actualizar: vi.fn().mockResolvedValue("resultado"),
  };
  const horarios = {
    crear: vi.fn().mockResolvedValue("resultado"),
    listar: vi.fn().mockResolvedValue("resultado"),
    obtenerPorId: vi.fn().mockResolvedValue("resultado"),
    actualizar: vi.fn().mockResolvedValue("resultado"),
    darDeBaja: vi.fn().mockResolvedValue("resultado"),
  };
  const planes = {
    crear: vi.fn().mockResolvedValue("resultado"),
    listar: vi.fn().mockResolvedValue("resultado"),
    obtenerPorId: vi.fn().mockResolvedValue("resultado"),
    actualizar: vi.fn().mockResolvedValue("resultado"),
    darDeBaja: vi.fn().mockResolvedValue("resultado"),
    listarPrecios: vi.fn().mockResolvedValue("resultado"),
    registrarPrecio: vi.fn().mockResolvedValue("resultado"),
  };
  const parametros = {
    listar: vi.fn().mockResolvedValue("resultado"),
    actualizar: vi.fn().mockResolvedValue("resultado"),
    obtenerDatosBancarios: vi.fn().mockResolvedValue("resultado"),
  };
  const inscripciones = {
    contarInscriptosVigentes: vi.fn().mockResolvedValue(new Map()),
    contarLugaresOcupados: vi.fn().mockResolvedValue(new Map()),
  };
  const promociones = {
    listar: vi.fn().mockResolvedValue("resultado"),
    obtenerPorId: vi.fn().mockResolvedValue("resultado"),
    desactivar: vi.fn().mockResolvedValue("resultado"),
  };
  const servicio = new GestionServicioEntrenamientoService(
    actividades as unknown as ActividadService,
    horarios as unknown as HorarioService,
    planes as unknown as PlanService,
    parametros as unknown as ParametrosSistemaService,
    inscripciones as unknown as IInfoInscripciones,
    promociones as unknown as PromocionService,
  );
  const cuerpo = { nombre: "X" };

  it.each([
    ["crearActividad", [cuerpo], actividades.crear],
    ["listarActividades", [{ busqueda: "yo" }], actividades.listar],
    ["obtenerActividadPorId", [3], actividades.obtenerPorId],
    ["actualizarActividad", [3, cuerpo], actividades.actualizar],
    ["crearHorario", [cuerpo], horarios.crear],
    ["actualizarHorario", [3, cuerpo], horarios.actualizar],
    ["crearPlan", [cuerpo], planes.crear],
    ["listarPlanes", [{ tipo: "MENSUAL" }], planes.listar],
    ["obtenerPlanPorId", [3], planes.obtenerPorId],
    ["actualizarPlan", [3, cuerpo], planes.actualizar],
    ["darDeBajaPlan", [3], planes.darDeBaja],
    ["listarPreciosPlan", [3], planes.listarPrecios],
    ["registrarPrecioPlan", [3, cuerpo], planes.registrarPrecio],
    ["listarParametros", [], parametros.listar],
    ["actualizarParametro", ["DIAS_RESERVA_PREINSCRIPCION", 5], parametros.actualizar],
    ["obtenerDatosBancarios", [], parametros.obtenerDatosBancarios],
  ] as const)("%s", async (operacion, argumentos, destino) => {
    const metodo = servicio[operacion] as (...args: unknown[]) => Promise<unknown>;

    await expect(metodo.apply(servicio, [...argumentos])).resolves.toBe("resultado");
    expect(destino).toHaveBeenCalledWith(...argumentos);
  });
});

describe("GestionServicioEntrenamientoService: los planes de una promoción (US-13)", () => {
  const DESDE = new Date("2026-12-01T00:00:00Z");
  const alta = {
    codigo: "VERANO26",
    nombre: "Verano",
    tipo_descuento: "MONTO_FIJO" as const,
    valor: 5000,
    fecha_desde: DESDE,
    fecha_hasta: new Date("2027-02-28T00:00:00Z"),
    ids_planes: [1, 2],
  };
  let planes: { buscarPorId: ReturnType<typeof vi.fn>; precioVigente: ReturnType<typeof vi.fn> };
  let promociones: Record<string, ReturnType<typeof vi.fn>>;
  let servicio: GestionServicioEntrenamientoService;

  beforeEach(() => {
    planes = {
      buscarPorId: vi.fn(async (id: number) => ({ id_plan: id, fecha_baja: null })),
      precioVigente: vi.fn().mockResolvedValue({ precio: 25000 }),
    };
    promociones = {
      crear: vi.fn().mockResolvedValue("creada"),
      actualizar: vi.fn().mockResolvedValue("actualizada"),
      obtenerPorId: vi.fn().mockResolvedValue({
        tipo_descuento: "PORCENTAJE",
        valor: 10,
        fecha_desde: DESDE,
        planes: [{ id_plan: 1, nombre: "Básico" }],
      }),
    };
    servicio = new GestionServicioEntrenamientoService(
      {} as unknown as ActividadService,
      {} as unknown as HorarioService,
      planes as unknown as PlanService,
      {} as unknown as ParametrosSistemaService,
      {} as unknown as IInfoInscripciones,
      promociones as unknown as PromocionService,
    );
  });

  it("crea una promoción de monto fijo si no supera el precio de ningún plan al empezar", async () => {
    await expect(servicio.crearPromocion(alta)).resolves.toBe("creada");
    expect(planes.precioVigente).toHaveBeenCalledWith(1, DESDE);
    expect(planes.precioVigente).toHaveBeenCalledWith(2, DESDE);
    expect(promociones.crear).toHaveBeenCalledWith(alta);
  });

  it("un porcentaje no consulta los precios", async () => {
    await servicio.crearPromocion({ ...alta, tipo_descuento: "PORCENTAJE", valor: 20 });

    expect(planes.precioVigente).not.toHaveBeenCalled();
  });

  it.each([
    ["un plan que no existe", () => planes.buscarPorId.mockResolvedValueOnce(null)],
    [
      "un plan dado de baja",
      () => planes.buscarPorId.mockResolvedValueOnce({ id_plan: 1, fecha_baja: DESDE }),
    ],
    ["un plan sin precio al empezar", () => planes.precioVigente.mockResolvedValueOnce(null)],
    ["un monto mayor al precio", () => planes.precioVigente.mockResolvedValueOnce({ precio: 4999 })],
    ["un monto igual al precio", () => planes.precioVigente.mockResolvedValueOnce({ precio: 5000 })],
  ])("rechaza %s sin crear nada", async (_caso, preparar) => {
    preparar();

    await expect(servicio.crearPromocion(alta)).rejects.toBeInstanceOf(ValidationError);
    expect(promociones.crear).not.toHaveBeenCalled();
  });

  it("al editar revisa los planes con lo que resulta del cambio", async () => {
    await expect(
      servicio.actualizarPromocion(7, { tipo_descuento: "MONTO_FIJO", valor: 30000 }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(planes.precioVigente).toHaveBeenCalledWith(1, DESDE);

    await expect(servicio.actualizarPromocion(7, { nombre: "Otro" })).resolves.toBe("actualizada");
    expect(promociones.actualizar).toHaveBeenCalledWith(7, { nombre: "Otro" });
  });

  it("al cambiar los planes, revisa los nuevos", async () => {
    await servicio.actualizarPromocion(7, { ids_planes: [3], fecha_desde: new Date("2026-12-15T00:00:00Z") });

    expect(planes.buscarPorId).toHaveBeenCalledWith(3);
    expect(planes.buscarPorId).not.toHaveBeenCalledWith(1);
  });
});
