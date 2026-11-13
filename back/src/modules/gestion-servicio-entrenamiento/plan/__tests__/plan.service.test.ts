import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error.js";
import type { IInfoActividades } from "../../actividad/interface/i-info-actividades.js";
import type { Actividad } from "../../actividad/actividad.types.js";
import type { PlanRepository } from "../plan.repository.js";
import type { IInfoPromociones } from "../../promocion/interface/i-info-promociones.js";
import { PlanService } from "../plan.service.js";
import type { Plan, PrecioPlan } from "../plan.types.js";

function crearRepositorioMock() {
  return {
    crear: vi.fn(),
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    existeVigenteConNombre: vi.fn(),
    actualizar: vi.fn(),
    darDeBaja: vi.fn(),
    listarPrecios: vi.fn(),
    precioVigente: vi.fn(),
    registrarPrecio: vi.fn(),
  };
}

const planBase: Plan = {
  id_plan: 1,
  tipo: "MENSUAL",
  nombre: "Básico 2 días",
  descripcion: null,
  clases_por_semana: 2,
  dias_gracia: 5,
  id_actividad_exclusiva: null,
  profesora_unica: true,
  fecha_alta: new Date("2026-10-01T00:00:00Z"),
  fecha_baja: null,
  actividad_exclusiva: null,
  precio_vigente: null,
  precio_programado: null,
};

const claseSuelta: Plan = { ...planBase, tipo: "CLASE_SUELTA", clases_por_semana: null, dias_gracia: 0 };

const precio: PrecioPlan = {
  id_plan_precio: 7,
  id_plan: 1,
  precio: 28000,
  fecha_vigencia_desde: new Date("2026-11-01T00:00:00Z"),
  fecha_vigencia_hasta: null,
};

const actividadActiva = { id_actividad: 4, activo: true } as Actividad;

describe("PlanService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let actividades: { buscarPorId: ReturnType<typeof vi.fn> };
  let promociones: {
    vigenteParaPlan: ReturnType<typeof vi.fn>;
    descuentoAplicable: ReturnType<typeof vi.fn>;
  };
  let servicio: PlanService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T15:00:00Z"));
    repositorio = crearRepositorioMock();
    actividades = { buscarPorId: vi.fn().mockResolvedValue(actividadActiva) };
    promociones = {
      vigenteParaPlan: vi.fn().mockResolvedValue(null),
      descuentoAplicable: vi.fn().mockResolvedValue(null),
    };
    servicio = new PlanService(
      repositorio as unknown as PlanRepository,
      actividades as unknown as IInfoActividades,
      promociones as unknown as IInfoPromociones,
    );
    repositorio.existeVigenteConNombre.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const nuevo = {
    tipo: "MENSUAL" as const,
    nombre: "Básico 2 días",
    clases_por_semana: 2,
    dias_gracia: 5,
    profesora_unica: true,
    precio: 25000,
  };

  it("crear da de alta el plan con su precio inicial", async () => {
    repositorio.crear.mockResolvedValue(planBase);

    await expect(servicio.crear(nuevo)).resolves.toEqual(planBase);
    expect(repositorio.crear).toHaveBeenCalledWith(nuevo);
    expect(actividades.buscarPorId).not.toHaveBeenCalled();
  });

  it("crear valida que la actividad exclusiva exista y esté activa", async () => {
    repositorio.crear.mockResolvedValue(planBase);

    await servicio.crear({ ...nuevo, id_actividad_exclusiva: 4 });

    expect(actividades.buscarPorId).toHaveBeenCalledWith(4);
  });

  it.each([
    ["no existe", null],
    ["está dada de baja", { ...actividadActiva, activo: false }],
  ])("crear lanza ValidationError si la actividad exclusiva %s", async (_caso, actividad) => {
    actividades.buscarPorId.mockResolvedValue(actividad);

    await expect(servicio.crear({ ...nuevo, id_actividad_exclusiva: 4 })).rejects.toThrow(ValidationError);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("crear lanza ConflictError si ya hay un plan vigente con ese nombre", async () => {
    repositorio.existeVigenteConNombre.mockResolvedValue(true);

    await expect(servicio.crear(nuevo)).rejects.toThrow(ConflictError);
    expect(repositorio.existeVigenteConNombre).toHaveBeenCalledWith("Básico 2 días", undefined);
  });

  it("listar delega el filtro al repositorio", async () => {
    repositorio.listar.mockResolvedValue([planBase]);

    await expect(servicio.listar({ tipo: "MENSUAL" })).resolves.toEqual([planBase]);
    expect(repositorio.listar).toHaveBeenCalledWith({ tipo: "MENSUAL" });
  });

  it("obtenerPorId lanza NotFoundError si no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.obtenerPorId(9)).rejects.toThrow(NotFoundError);
  });

  it("buscarPorId devuelve null si no existe, sin lanzar", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.buscarPorId(9)).resolves.toBeNull();
  });

  it("actualizar cambia la frecuencia de un plan mensual", async () => {
    repositorio.buscarPorId.mockResolvedValue(planBase);
    repositorio.actualizar.mockResolvedValue({ ...planBase, clases_por_semana: 3 });

    await expect(servicio.actualizar(1, { clases_por_semana: 3 })).resolves.toMatchObject({
      clases_por_semana: 3,
    });
    expect(repositorio.actualizar).toHaveBeenCalledWith(1, { clases_por_semana: 3 });
  });

  it("actualizar lanza NotFoundError si el plan está dado de baja", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...planBase, fecha_baja: new Date() });

    await expect(servicio.actualizar(1, { nombre: "Otro" })).rejects.toThrow(NotFoundError);
  });

  it.each([
    ["clases por semana", { clases_por_semana: 2 }],
    ["días de gracia", { dias_gracia: 3 }],
  ])("actualizar lanza ValidationError si a una clase suelta le agrega %s", async (_caso, input) => {
    repositorio.buscarPorId.mockResolvedValue(claseSuelta);

    await expect(servicio.actualizar(1, input)).rejects.toThrow(ValidationError);
  });

  it("actualizar conserva los valores actuales que no se envían", async () => {
    repositorio.buscarPorId.mockResolvedValue(claseSuelta);
    repositorio.actualizar.mockResolvedValue(claseSuelta);

    await expect(servicio.actualizar(1, { descripcion: "Una clase" })).resolves.toEqual(claseSuelta);
  });

  it("actualizar valida la actividad exclusiva nueva", async () => {
    repositorio.buscarPorId.mockResolvedValue(planBase);
    actividades.buscarPorId.mockResolvedValue(null);

    await expect(servicio.actualizar(1, { id_actividad_exclusiva: 4 })).rejects.toThrow(ValidationError);
  });

  it("actualizar cambia el nombre y la actividad exclusiva si son válidos", async () => {
    const input = { nombre: "Kids", id_actividad_exclusiva: 4 };
    repositorio.buscarPorId.mockResolvedValue(planBase);
    repositorio.actualizar.mockResolvedValue({ ...planBase, ...input });

    await expect(servicio.actualizar(1, input)).resolves.toMatchObject(input);
    expect(actividades.buscarPorId).toHaveBeenCalledWith(4);
    expect(repositorio.existeVigenteConNombre).toHaveBeenCalledWith("Kids", 1);
  });

  it("actualizar permite quitar la actividad exclusiva sin consultarla", async () => {
    repositorio.buscarPorId.mockResolvedValue(planBase);
    repositorio.actualizar.mockResolvedValue(planBase);

    await servicio.actualizar(1, { id_actividad_exclusiva: null });

    expect(actividades.buscarPorId).not.toHaveBeenCalled();
  });

  it("actualizar lanza ConflictError si el nombre nuevo lo usa otro plan vigente", async () => {
    repositorio.buscarPorId.mockResolvedValue(planBase);
    repositorio.existeVigenteConNombre.mockResolvedValue(true);

    await expect(servicio.actualizar(1, { nombre: "Premium" })).rejects.toThrow(ConflictError);
    expect(repositorio.existeVigenteConNombre).toHaveBeenCalledWith("Premium", 1);
  });

  it("darDeBaja da de baja un plan vigente", async () => {
    repositorio.buscarPorId.mockResolvedValue(planBase);
    repositorio.darDeBaja.mockResolvedValue({ ...planBase, fecha_baja: new Date() });

    await servicio.darDeBaja(1);

    expect(repositorio.darDeBaja).toHaveBeenCalledWith(1);
  });

  it("darDeBaja lanza ConflictError si ya estaba dado de baja", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...planBase, fecha_baja: new Date() });

    await expect(servicio.darDeBaja(1)).rejects.toThrow(ConflictError);
  });

  it("listarPrecios devuelve el historial de un plan existente", async () => {
    repositorio.buscarPorId.mockResolvedValue(planBase);
    repositorio.listarPrecios.mockResolvedValue([precio]);

    await expect(servicio.listarPrecios(1)).resolves.toEqual([precio]);
  });

  it("listarPrecios lanza NotFoundError si el plan no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.listarPrecios(1)).rejects.toThrow(NotFoundError);
  });

  it.each([
    ["futura", "2026-11-01"],
    ["de hoy", "2026-10-08"],
  ])("registrarPrecio acepta una fecha de vigencia %s", async (_caso, dia) => {
    const input = { precio: 28000, fecha_vigencia_desde: new Date(`${dia}T00:00:00Z`) };
    repositorio.buscarPorId.mockResolvedValue(planBase);
    repositorio.registrarPrecio.mockResolvedValue(precio);

    await expect(servicio.registrarPrecio(1, input)).resolves.toEqual(precio);
    expect(repositorio.registrarPrecio).toHaveBeenCalledWith(1, input);
  });

  it("registrarPrecio lanza ValidationError si la fecha es anterior a hoy", async () => {
    repositorio.buscarPorId.mockResolvedValue(planBase);

    await expect(
      servicio.registrarPrecio(1, { precio: 28000, fecha_vigencia_desde: new Date("2026-10-07T00:00:00Z") }),
    ).rejects.toThrow(ValidationError);
    expect(repositorio.registrarPrecio).not.toHaveBeenCalled();
  });

  it("registrarPrecio lanza ConflictError si el plan está dado de baja", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...planBase, fecha_baja: new Date() });

    await expect(
      servicio.registrarPrecio(1, { precio: 28000, fecha_vigencia_desde: new Date("2026-11-01T00:00:00Z") }),
    ).rejects.toThrow(ConflictError);
  });

  it("registrarPrecio lanza ConflictError si ya hay un precio que empezó hoy", async () => {
    repositorio.buscarPorId.mockResolvedValue(planBase);
    repositorio.registrarPrecio.mockResolvedValue(null);

    await expect(
      servicio.registrarPrecio(1, { precio: 28000, fecha_vigencia_desde: new Date("2026-10-08T00:00:00Z") }),
    ).rejects.toThrow(ConflictError);
  });

  it("precioVigente delega la consulta al repositorio", async () => {
    const fecha = new Date("2026-10-08T00:00:00Z");
    repositorio.precioVigente.mockResolvedValue(precio);

    await expect(servicio.precioVigente(1, fecha)).resolves.toEqual(precio);
    expect(repositorio.precioVigente).toHaveBeenCalledWith(1, fecha);
  });

  describe("promociones (US-13)", () => {
    const HOY = new Date("2026-10-08T00:00:00Z");
    const promocion = {
      id_promocion: 4,
      codigo: "VERANO26",
      nombre: "Verano",
      tipo_descuento: "PORCENTAJE",
      valor: 10,
    };

    it("promocionVigente consulta a Promocion", async () => {
      promociones.vigenteParaPlan.mockResolvedValue(promocion);

      await expect(servicio.promocionVigente(1, HOY)).resolves.toBe(promocion);
      expect(promociones.vigenteParaPlan).toHaveBeenCalledWith(1, HOY);
    });

    it("precioACobrar descuenta la promoción de la inscripción si sigue vigente", async () => {
      repositorio.precioVigente.mockResolvedValue({ ...precio, precio: 25000.5 });
      promociones.descuentoAplicable.mockResolvedValue({ ...promocion, descuento: 2500.05 });

      await expect(servicio.precioACobrar(1, HOY, 4)).resolves.toEqual({
        id_plan_precio: 7,
        precio_lista: 25000.5,
        descuento: 2500.05,
        monto: 22500.45,
        promocion: { id_promocion: 4, codigo: "VERANO26", nombre: "Verano" },
      });
      expect(promociones.descuentoAplicable).toHaveBeenCalledWith(4, 1, HOY, 25000.5);
    });

    it("precioACobrar sin promoción, o con una que ya no aplica, cobra el precio de lista", async () => {
      repositorio.precioVigente.mockResolvedValue(precio);

      await expect(servicio.precioACobrar(1, HOY, null)).resolves.toMatchObject({
        descuento: 0,
        monto: 28000,
        promocion: null,
      });
      expect(promociones.descuentoAplicable).not.toHaveBeenCalled();
      await expect(servicio.precioACobrar(1, HOY, 4)).resolves.toMatchObject({
        monto: 28000,
        promocion: null,
      });
    });

    it("precioACobrar devuelve null si el plan no tiene precio ese día", async () => {
      repositorio.precioVigente.mockResolvedValue(null);

      await expect(servicio.precioACobrar(1, HOY, 4)).resolves.toBeNull();
    });
  });

  describe("listarVigentes", () => {
    it("delega a listar con incluirBajas en false y filtro opcional", async () => {
      repositorio.listar.mockResolvedValue([planBase]);

      const resultado = await servicio.listarVigentes({ id_actividad_exclusiva: 4 });

      expect(resultado).toEqual([planBase]);
      expect(repositorio.listar).toHaveBeenCalledWith({
        incluirBajas: false,
        id_actividad_exclusiva: 4,
      });
    });
  });
});
