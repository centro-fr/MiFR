import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error.js";
import type { IInfoActividades } from "../../actividad/interface/i-info-actividades.js";
import type { IInfoProfesores } from "../../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { HorarioRepository } from "../horario.repository.js";
import { HorarioService } from "../horario.service.js";
import type { HorarioConDatos } from "../horario.types.js";

function crearRepositorioMock() {
  return {
    crear: vi.fn(),
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorIds: vi.fn(),
    listarActivosDelDia: vi.fn(),
    actualizar: vi.fn(),
    darDeBaja: vi.fn(),
    darDeBajaDeActividad: vi.fn(),
    tieneActivosDeProfesora: vi.fn(),
    programarBaja: vi.fn(),
    cancelarBajaProgramada: vi.fn(),
    listarConBajaProgramada: vi.fn(),
  };
}

describe("HorarioService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let actividades: IInfoActividades;
  let profesoras: IInfoProfesores;
  let servicio: HorarioService;

  const actividad = {
    id_actividad: 1,
    codigo: "HIIT",
    nombre: "HIIT",
    descripcion: null,
    modalidad: "GRUPAL" as const,
    cupo_maximo: 20,
    requiere_medidas: false,
    activo: true,
  };
  const profesora = {
    id_profesora: 1,
    id_usuario: 2,
    especialidad: null,
    fecha_alta: new Date("2026-09-30T00:00:00.000Z"),
    fecha_baja: null,
    usuario: { nombre: "Lucía", apellido: "Gómez" },
  };
  const horarioBase: HorarioConDatos = {
    id_horario: 1,
    id_actividad: 1,
    id_profesora: 1,
    dia_semana: 1,
    hora_inicio: new Date(Date.UTC(1970, 0, 1, 9, 0)),
    hora_fin: new Date(Date.UTC(1970, 0, 1, 10, 0)),
    cupo_maximo: null,
    fecha_alta: new Date("2026-09-30T00:00:00.000Z"),
    fecha_baja: null,
    fecha_baja_programada: null,
    actividad,
    profesora,
  };

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    actividades = { buscarPorId: vi.fn().mockResolvedValue(actividad) };
    profesoras = {
      buscarPorId: vi.fn().mockResolvedValue(profesora),
      buscarPorUsuario: vi.fn(),
      listar: vi.fn(),
    };
    servicio = new HorarioService(repositorio as unknown as HorarioRepository, actividades, profesoras);
  });

  it("crear guarda un horario y devuelve el cupo heredado", async () => {
    const input = {
      id_actividad: 1,
      id_profesora: 1,
      dia_semana: 1,
      hora_inicio: "09:00",
      hora_fin: "10:00",
    };
    repositorio.crear.mockResolvedValue(horarioBase);

    await expect(servicio.crear(input)).resolves.toMatchObject({ cupo_maximo_efectivo: 20 });
    expect(repositorio.crear).toHaveBeenCalledWith(input);
  });

  it("crear rechaza un horario superpuesto de la misma profesora", async () => {
    repositorio.crear.mockResolvedValue(null);

    await expect(
      servicio.crear({
        id_actividad: 1,
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "09:30",
        hora_fin: "10:30",
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("crear permite horarios consecutivos de la misma profesora", async () => {
    repositorio.crear.mockResolvedValue(horarioBase);

    await servicio.crear({
      id_actividad: 1,
      id_profesora: 1,
      dia_semana: 1,
      hora_inicio: "10:00",
      hora_fin: "11:00",
    });

    expect(repositorio.crear).toHaveBeenCalledWith({
      id_actividad: 1,
      id_profesora: 1,
      dia_semana: 1,
      hora_inicio: "10:00",
      hora_fin: "11:00",
    });
  });

  it("crear rechaza una actividad inexistente o inactiva", async () => {
    vi.mocked(actividades.buscarPorId).mockResolvedValue(null);

    await expect(
      servicio.crear({
        id_actividad: 1,
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "09:00",
        hora_fin: "10:00",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("crear rechaza una profesora no elegible", async () => {
    vi.mocked(profesoras.buscarPorId).mockResolvedValue(null);

    await expect(
      servicio.crear({
        id_actividad: 1,
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "09:00",
        hora_fin: "10:00",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("actualizar valida el solapamiento excluyendo el horario actual", async () => {
    repositorio.buscarPorId.mockResolvedValue(horarioBase);
    repositorio.actualizar.mockResolvedValue({
      ...horarioBase,
      hora_fin: new Date(Date.UTC(1970, 0, 1, 10, 30)),
    });

    await servicio.actualizar(1, { hora_fin: "10:30" });

    expect(repositorio.actualizar).toHaveBeenCalledWith(
      1,
      { hora_fin: "10:30" },
      {
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "09:00",
        hora_fin: "10:30",
      },
    );
  });

  it("actualizar rechaza un solapamiento detectado dentro de la transacción", async () => {
    repositorio.buscarPorId.mockResolvedValue(horarioBase);
    repositorio.actualizar.mockResolvedValue(null);

    await expect(servicio.actualizar(1, { hora_fin: "10:30" })).rejects.toThrow(ConflictError);
  });

  it("actualizar devuelve ValidationError si la hora de fin no es posterior", async () => {
    repositorio.buscarPorId.mockResolvedValue(horarioBase);

    await expect(servicio.actualizar(1, { hora_fin: "09:00" })).rejects.toThrow(ValidationError);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("darDeBaja conserva el registro para que la fachada consulte las inscripciones", async () => {
    repositorio.buscarPorId.mockResolvedValue(horarioBase);
    repositorio.darDeBaja.mockResolvedValue({ ...horarioBase, fecha_baja: new Date() });

    await expect(servicio.darDeBaja(1)).resolves.toMatchObject({ fecha_baja: expect.any(Date) });
  });

  it("darDeBaja lanza ConflictError si una inscripción entró antes de tomar el bloqueo", async () => {
    repositorio.buscarPorId.mockResolvedValue(horarioBase);
    repositorio.darDeBaja.mockResolvedValue(null);

    await expect(servicio.darDeBaja(1)).rejects.toThrow("alumnos inscriptos");
  });

  it("listarVigentes lista los horarios sin filtro, con el cupo efectivo", async () => {
    repositorio.listar.mockResolvedValue([horarioBase]);

    await expect(servicio.listarVigentes()).resolves.toMatchObject([
      { id_horario: 1, cupo_maximo_efectivo: 20 },
    ]);
    expect(repositorio.listar).toHaveBeenCalledWith({});
  });

  it("buscarPorIds no consulta la base si no recibe ids", async () => {
    await expect(servicio.buscarPorIds([])).resolves.toEqual([]);
    expect(repositorio.buscarPorIds).not.toHaveBeenCalled();
  });

  it("buscarPorIds devuelve horarios con el cupo efectivo", async () => {
    repositorio.buscarPorIds.mockResolvedValue([horarioBase]);

    await expect(servicio.buscarPorIds([1])).resolves.toMatchObject([
      { id_horario: 1, cupo_maximo_efectivo: 20 },
    ]);
  });

  it("listar devuelve los horarios con su cupo efectivo", async () => {
    repositorio.listar.mockResolvedValue([horarioBase, { ...horarioBase, id_horario: 2, cupo_maximo: 8 }]);

    const horarios = await servicio.listar({ id_actividad: 1 });

    expect(repositorio.listar).toHaveBeenCalledWith({ id_actividad: 1 });
    expect(horarios.map((h) => h.cupo_maximo_efectivo)).toEqual([20, 8]);
  });

  it("listarActivosDelDia calcula el día semanal y agrega el cupo efectivo", async () => {
    const fecha = new Date("2026-10-12T00:00:00Z");
    repositorio.listarActivosDelDia.mockResolvedValue([horarioBase]);

    await expect(servicio.listarActivosDelDia(fecha)).resolves.toMatchObject([
      { id_horario: 1, cupo_maximo_efectivo: 20 },
    ]);
    expect(repositorio.listarActivosDelDia).toHaveBeenCalledWith(1, fecha);
  });

  it("listarActivosDelDia representa el domingo como el día 7 del DER", async () => {
    const domingo = new Date("2026-10-18T00:00:00Z");
    repositorio.listarActivosDelDia.mockResolvedValue([]);

    await expect(servicio.listarActivosDelDia(domingo)).resolves.toEqual([]);
    expect(repositorio.listarActivosDelDia).toHaveBeenCalledWith(7, domingo);
  });

  it("obtenerPorId devuelve también un horario dado de baja, para consultar el historial", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...horarioBase, fecha_baja: new Date() });

    await expect(servicio.obtenerPorId(1)).resolves.toMatchObject({ id_horario: 1 });
  });

  it("obtenerPorId lanza NotFoundError si no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.obtenerPorId(99)).rejects.toThrow(NotFoundError);
  });

  it("actualizar conserva día, horas y cupo actuales para los campos que no se envían", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...horarioBase, cupo_maximo: 12 });
    repositorio.actualizar.mockResolvedValue({ ...horarioBase, cupo_maximo: 12, id_profesora: 2 });

    await expect(servicio.actualizar(1, { id_profesora: 2 })).resolves.toMatchObject({
      cupo_maximo_efectivo: 12,
    });
    expect(repositorio.actualizar).toHaveBeenCalledWith(
      1,
      { id_profesora: 2 },
      { id_profesora: 2, dia_semana: 1, hora_inicio: "09:00", hora_fin: "10:00" },
    );
  });

  it("actualizar lanza NotFoundError si el horario no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.actualizar(99, { hora_fin: "11:00" })).rejects.toThrow(NotFoundError);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("actualizar lanza ConflictError si el horario ya está dado de baja", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...horarioBase, fecha_baja: new Date() });

    await expect(servicio.actualizar(1, { hora_fin: "11:00" })).rejects.toThrow(ConflictError);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("actualizar exige cupo si la actividad es PERSONALIZADA y no tiene cupo propio", async () => {
    repositorio.buscarPorId.mockResolvedValue(horarioBase);
    vi.mocked(actividades.buscarPorId).mockResolvedValue({
      ...actividad,
      modalidad: "PERSONALIZADA",
      cupo_maximo: null,
    });

    await expect(servicio.actualizar(1, { hora_fin: "11:00" })).rejects.toThrow(ValidationError);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("crear exige cupo si la actividad es PERSONALIZADA y no tiene cupo propio", async () => {
    vi.mocked(actividades.buscarPorId).mockResolvedValue({
      ...actividad,
      modalidad: "PERSONALIZADA",
      cupo_maximo: null,
    });

    await expect(
      servicio.crear({
        id_actividad: 1,
        id_profesora: 1,
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: "10:00",
      }),
    ).rejects.toThrow(ValidationError);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("darDeBaja lanza ConflictError si el horario ya estaba dado de baja", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...horarioBase, fecha_baja: new Date() });

    await expect(servicio.darDeBaja(1)).rejects.toThrow(ConflictError);
    expect(repositorio.darDeBaja).not.toHaveBeenCalled();
  });

  it("darDeBajaDeActividad pide al repositorio la baja de los horarios de la actividad", async () => {
    repositorio.darDeBajaDeActividad.mockResolvedValue(3);

    await expect(servicio.darDeBajaDeActividad(7)).resolves.toBe(3);
    expect(repositorio.darDeBajaDeActividad).toHaveBeenCalledWith(7);
  });

  it("darDeBajaDeActividad lanza ConflictError si algún horario quedó con inscriptos", async () => {
    repositorio.darDeBajaDeActividad.mockResolvedValue(null);

    await expect(servicio.darDeBajaDeActividad(7)).rejects.toThrow(ConflictError);
  });

  it("tieneActivosDeProfesora consulta al repositorio", async () => {
    repositorio.tieneActivosDeProfesora.mockResolvedValue(false);

    await expect(servicio.tieneActivosDeProfesora(7)).resolves.toBe(false);
    expect(repositorio.tieneActivosDeProfesora).toHaveBeenCalledWith(7);
  });

  it("actualizar usa el cupo que se envía en lugar del actual", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...horarioBase, cupo_maximo: 12 });
    repositorio.actualizar.mockResolvedValue({ ...horarioBase, cupo_maximo: 6 });

    await expect(servicio.actualizar(1, { cupo_maximo: 6 })).resolves.toMatchObject({
      cupo_maximo_efectivo: 6,
    });
  });

  describe("baja programada (US-04)", () => {
    const DIA = new Date("2026-10-09T00:00:00Z");

    it("programarBaja la marca; si ya estaba programada, no la vuelve a escribir", async () => {
      repositorio.buscarPorId.mockResolvedValue(horarioBase);
      repositorio.programarBaja.mockResolvedValue({ ...horarioBase, fecha_baja_programada: DIA });
      await expect(servicio.programarBaja(1, DIA)).resolves.toMatchObject({ fecha_baja_programada: DIA });
      expect(repositorio.programarBaja).toHaveBeenCalledWith(1, DIA);

      repositorio.buscarPorId.mockResolvedValue({ ...horarioBase, fecha_baja_programada: DIA });
      await servicio.programarBaja(1, DIA);
      expect(repositorio.programarBaja).toHaveBeenCalledTimes(1);
    });

    it("cancelarBajaProgramada la quita; sin baja programada responde 409", async () => {
      repositorio.buscarPorId.mockResolvedValue({ ...horarioBase, fecha_baja_programada: DIA });
      repositorio.cancelarBajaProgramada.mockResolvedValue(horarioBase);
      await servicio.cancelarBajaProgramada(1);
      expect(repositorio.cancelarBajaProgramada).toHaveBeenCalledWith(1);

      repositorio.buscarPorId.mockResolvedValue(horarioBase);
      await expect(servicio.cancelarBajaProgramada(1)).rejects.toBeInstanceOf(ConflictError);
    });

    it("listarConBajaProgramada les suma el cupo efectivo", async () => {
      repositorio.listarConBajaProgramada.mockResolvedValue([horarioBase]);

      await expect(servicio.listarConBajaProgramada()).resolves.toEqual([
        expect.objectContaining({ id_horario: 1, cupo_maximo_efectivo: 20 }),
      ]);
    });

    it("completarBajaProgramada dice si pudo darlo de baja (no, si todavía tiene inscriptos)", async () => {
      repositorio.darDeBaja.mockResolvedValueOnce(horarioBase).mockResolvedValueOnce(null);

      await expect(servicio.completarBajaProgramada(1)).resolves.toBe(true);
      await expect(servicio.completarBajaProgramada(1)).resolves.toBe(false);
    });
  });
});
