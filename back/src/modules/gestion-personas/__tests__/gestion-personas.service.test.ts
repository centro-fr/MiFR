import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../shared/errors/app-error.js";
import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { AlumnoService } from "../alumno/alumno.service.js";
import type { ProfesorService } from "../profesor/profesor.service.js";
import { GestionPersonasService } from "../gestion-personas.service.js";

describe("GestionPersonasService", () => {
  let profesoras: Pick<ProfesorService, "darDeBaja">;
  let horarios: IInfoHorarios;
  let servicio: GestionPersonasService;

  beforeEach(() => {
    profesoras = { darDeBaja: vi.fn() };
    horarios = {
      tieneActivosDeActividad: vi.fn(),
      tieneActivosDeProfesora: vi.fn().mockResolvedValue(false),
    };
    servicio = new GestionPersonasService(profesoras as ProfesorService, horarios, {} as AlumnoService);
  });

  it("darDeBajaProfesora permite la baja si no tiene horarios activos", async () => {
    profesoras.darDeBaja = vi.fn().mockResolvedValue({ id_profesora: 3 });

    await expect(servicio.darDeBajaProfesora(3)).resolves.toEqual({ id_profesora: 3 });
    expect(profesoras.darDeBaja).toHaveBeenCalledWith(3);
  });

  it("darDeBajaProfesora bloquea la baja si tiene horarios activos", async () => {
    vi.mocked(horarios.tieneActivosDeProfesora).mockResolvedValue(true);

    await expect(servicio.darDeBajaProfesora(3)).rejects.toThrow(ConflictError);
    expect(profesoras.darDeBaja).not.toHaveBeenCalled();
  });
});

describe("GestionPersonasService delega en Profesor", () => {
  it("crearProfesora y listarProfesoras llegan al componente Profesor", async () => {
    const profesoras = {
      crear: vi.fn().mockResolvedValue({ id_profesora: 1 }),
      listar: vi.fn().mockResolvedValue([]),
    };
    const horarios = { tieneActivosDeActividad: vi.fn(), tieneActivosDeProfesora: vi.fn() };
    const servicio = new GestionPersonasService(
      profesoras as unknown as ProfesorService,
      horarios,
      {} as AlumnoService,
    );

    await expect(servicio.crearProfesora({ id_usuario: 5 })).resolves.toEqual({ id_profesora: 1 });
    await expect(servicio.listarProfesoras()).resolves.toEqual([]);
    expect(profesoras.crear).toHaveBeenCalledWith({ id_usuario: 5 });
  });
});

describe("GestionPersonasService delega en Alumno", () => {
  const alumnos = {
    crear: vi.fn().mockResolvedValue("resultado"),
    listar: vi.fn().mockResolvedValue("resultado"),
    obtenerPorId: vi.fn().mockResolvedValue("resultado"),
    actualizar: vi.fn().mockResolvedValue("resultado"),
  };
  const horarios = { tieneActivosDeActividad: vi.fn(), tieneActivosDeProfesora: vi.fn() };
  const servicio = new GestionPersonasService(
    {} as ProfesorService,
    horarios,
    alumnos as unknown as AlumnoService,
  );
  const cuerpo = { nombre: "Ana" };

  it.each([
    ["crearAlumno", [cuerpo], alumnos.crear],
    ["listarAlumnos", [{ limit: 20, offset: 0 }], alumnos.listar],
    ["obtenerAlumnoPorId", [3], alumnos.obtenerPorId],
    ["actualizarAlumno", [3, cuerpo], alumnos.actualizar],
  ] as const)("%s", async (operacion, argumentos, destino) => {
    const metodo = servicio[operacion] as (...args: unknown[]) => Promise<unknown>;

    await expect(metodo.apply(servicio, [...argumentos])).resolves.toBe("resultado");
    expect(destino).toHaveBeenCalledWith(...argumentos);
  });
});
