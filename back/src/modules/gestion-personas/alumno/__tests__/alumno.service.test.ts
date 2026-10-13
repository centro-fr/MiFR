import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AlumnoExistenteError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/app-error.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IInfoUsuarios } from "../../../gestion-usuarios/usuario/interface/i-info-usuarios.js";
import type { UsuarioConRoles } from "../../../gestion-usuarios/usuario/usuario.types.js";
import type { AlumnoRepository } from "../alumno.repository.js";
import { AlumnoService, esMenorDeEdad } from "../alumno.service.js";
import type { Alumno, DatosPersonales } from "../alumno.types.js";

const HOY = new Date("2026-10-08T00:00:00Z");
const MAYOR = new Date("1995-04-20T00:00:00Z");
const MENOR = new Date("2014-05-10T00:00:00Z");

function crearRepositorioMock() {
  return {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorIdUsuario: vi.fn(),
    buscarPorIds: vi.fn(),
    listar: vi.fn(),
    listarIds: vi.fn(),
    actualizar: vi.fn(),
    activar: vi.fn(),
    darDeBaja: vi.fn(),
    reactivar: vi.fn(),
  };
}

function datosPersonales(datos: Partial<DatosPersonales> = {}): DatosPersonales {
  return {
    id_usuario: 10,
    nombre: "Ana",
    apellido: "López",
    dni: "40111222",
    email: "ana@example.com",
    telefono: null,
    fecha_nacimiento: MAYOR,
    direccion: null,
    estado: "INACTIVO",
    ...datos,
  };
}

function crearAlumno(datos: Partial<Alumno> = {}): Alumno {
  return {
    id_alumno: 1,
    id_usuario: 10,
    id_usuario_responsable: null,
    cont_emerg_nombre: null,
    cont_emerg_telefono: null,
    apto_medico: false,
    fecha_apto_medico: null,
    observaciones: null,
    estado: "INACTIVO",
    fecha_alta: HOY,
    fecha_baja: null,
    usuario: datosPersonales(),
    responsable: null,
    ...datos,
  };
}

const menorConTutor = crearAlumno({
  id_usuario_responsable: 20,
  usuario: datosPersonales({ email: null, fecha_nacimiento: MENOR }),
  responsable: datosPersonales({ id_usuario: 20 }),
});

function usuario(id: number, fecha_nacimiento = MAYOR): UsuarioConRoles {
  return { id_usuario: id, fecha_nacimiento } as UsuarioConRoles;
}

const tutorNuevo = {
  nombre: "Laura",
  apellido: "Pérez",
  dni: "30111222",
  telefono: "3794 112233",
  email: "laura@example.com",
  fecha_nacimiento: new Date("1985-03-02T00:00:00Z"),
};

const altaMayor = {
  nombre: "Ana",
  apellido: "López",
  dni: "40111222",
  email: "ana@example.com",
  fecha_nacimiento: MAYOR,
  apto_medico: false,
};

const altaMenor = {
  nombre: "Tomás",
  apellido: "Pérez",
  dni: "50111222",
  fecha_nacimiento: MENOR,
  apto_medico: false,
  tutor: tutorNuevo,
};

describe("esMenorDeEdad", () => {
  it.each([
    ["cumple 18 mañana", "2008-10-09", true],
    ["cumple 18 hoy", "2008-10-08", false],
    ["ya tiene 18", "2008-10-07", false],
  ])("%s", (_caso, nacimiento, esperado) => {
    expect(esMenorDeEdad(new Date(`${nacimiento}T00:00:00Z`), HOY)).toBe(esperado);
  });

  it("toma el 1 de marzo como cumpleaños de quien nació un 29 de febrero", () => {
    const nacimiento = new Date("2008-02-29T00:00:00Z");

    expect(esMenorDeEdad(nacimiento, new Date("2026-02-28T00:00:00Z"))).toBe(true);
    expect(esMenorDeEdad(nacimiento, new Date("2026-03-01T00:00:00Z"))).toBe(false);
  });
});

describe("AlumnoService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let usuarios: Record<keyof IInfoUsuarios, ReturnType<typeof vi.fn>>;
  let autorizacion: { tieneRol: ReturnType<typeof vi.fn>; asignarRol: ReturnType<typeof vi.fn> };
  let servicio: AlumnoService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T15:00:00Z"));
    repositorio = crearRepositorioMock();
    usuarios = {
      obtenerPorId: vi.fn(),
      buscarPorId: vi.fn().mockResolvedValue(null),
      identificarPorGoogle: vi.fn(),
      buscarPorEmail: vi.fn().mockResolvedValue(null),
      buscarPorDni: vi.fn().mockResolvedValue(null),
    };
    autorizacion = { tieneRol: vi.fn().mockReturnValue(false), asignarRol: vi.fn() };
    servicio = new AlumnoService(
      repositorio as unknown as AlumnoRepository,
      usuarios as unknown as IInfoUsuarios,
      autorizacion as unknown as IAutorizacion,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("crear", () => {
    it("da de alta a un mayor sin tutor, separando datos personales y ficha", async () => {
      repositorio.crear.mockResolvedValue(crearAlumno());

      await servicio.crear({ ...altaMayor, observaciones: "Lesión de rodilla" });

      expect(repositorio.crear).toHaveBeenCalledWith(
        {
          nombre: "Ana",
          apellido: "López",
          dni: "40111222",
          email: "ana@example.com",
          telefono: undefined,
          fecha_nacimiento: MAYOR,
          direccion: undefined,
        },
        { apto_medico: false, observaciones: "Lesión de rodilla" },
        null,
      );
    });

    it("da de alta a un menor con un tutor nuevo", async () => {
      repositorio.crear.mockResolvedValue(menorConTutor);

      await servicio.crear(altaMenor);

      expect(repositorio.crear).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        nuevo: tutorNuevo,
      });
    });

    it("reutiliza un tutor que ya existe con ese DNI y ese email", async () => {
      usuarios.buscarPorDni.mockImplementation(async (dni: string) =>
        dni === "30111222" ? usuario(20) : null,
      );
      usuarios.buscarPorEmail.mockResolvedValue(usuario(20));
      repositorio.crear.mockResolvedValue(menorConTutor);

      await servicio.crear(altaMenor);

      expect(repositorio.crear).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        id_usuario: 20,
      });
    });

    it("reutiliza un tutor que ya existe con ese email si no trae DNI", async () => {
      const { dni: _dni, ...tutorSinDni } = tutorNuevo;
      usuarios.buscarPorEmail.mockResolvedValue(usuario(21));
      repositorio.crear.mockResolvedValue(menorConTutor);

      await servicio.crear({ ...altaMenor, tutor: tutorSinDni });

      expect(repositorio.crear).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        id_usuario: 21,
      });
    });

    it.each([
      [
        "el DNI es de una cuenta y el email de otra",
        () => {
          usuarios.buscarPorDni.mockImplementation(async (dni: string) =>
            dni === "30111222" ? usuario(20) : null,
          );
          usuarios.buscarPorEmail.mockResolvedValue(usuario(21));
        },
      ],
      [
        "el DNI es de una cuenta con otro email",
        () =>
          usuarios.buscarPorDni.mockImplementation(async (dni: string) =>
            dni === "30111222" ? usuario(20) : null,
          ),
      ],
      [
        "el email es de una cuenta con otro DNI",
        () => usuarios.buscarPorEmail.mockResolvedValue({ ...usuario(21), dni: "29999888" }),
      ],
    ])("no reutiliza un tutor existente si %s", async (_caso, preparar) => {
      preparar();

      await expect(servicio.crear(altaMenor)).rejects.toThrow(
        "El DNI y el email del tutor corresponden a cuentas distintas",
      );
      expect(repositorio.crear).not.toHaveBeenCalled();
    });

    it("reutiliza la cuenta del email si todavía no tiene DNI cargado", async () => {
      usuarios.buscarPorEmail.mockResolvedValue({ ...usuario(21), dni: null });
      repositorio.crear.mockResolvedValue(menorConTutor);

      await servicio.crear(altaMenor);

      expect(repositorio.crear).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        id_usuario: 21,
      });
    });

    it("acepta un tutor indicado por su id_usuario", async () => {
      usuarios.buscarPorId.mockResolvedValue(usuario(22));
      repositorio.crear.mockResolvedValue(menorConTutor);

      await servicio.crear({ ...altaMenor, tutor: { id_usuario: 22 } });

      expect(repositorio.crear).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        id_usuario: 22,
      });
    });

    it.each([
      ["un menor sin tutor", { ...altaMenor, tutor: undefined }],
      ["un menor con email", { ...altaMenor, email: "tomas@example.com" }],
      ["un mayor con tutor", { ...altaMayor, tutor: tutorNuevo }],
      ["un mayor sin email", { ...altaMayor, email: undefined }],
      ["un tutor menor de edad", { ...altaMenor, tutor: { ...tutorNuevo, fecha_nacimiento: MENOR } }],
      [
        "un tutor con el mismo DNI que el alumno",
        { ...altaMenor, tutor: { ...tutorNuevo, dni: "50111222" } },
      ],
    ])("rechaza %s con ValidationError", async (_caso, input) => {
      await expect(servicio.crear(input)).rejects.toThrow(ValidationError);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });

    it("rechaza un tutor indicado por id que no existe", async () => {
      await expect(servicio.crear({ ...altaMenor, tutor: { id_usuario: 99 } })).rejects.toThrow(
        ValidationError,
      );
    });

    it("rechaza reutilizar como tutor a un usuario menor de edad", async () => {
      usuarios.buscarPorDni.mockImplementation(async (dni: string) =>
        dni === "30111222" ? usuario(20, MENOR) : null,
      );
      usuarios.buscarPorEmail.mockResolvedValue(usuario(20, MENOR));

      await expect(servicio.crear(altaMenor)).rejects.toThrow(ValidationError);
    });

    it("lanza AlumnoExistenteError si el DNI ya es de un alumno", async () => {
      usuarios.buscarPorDni.mockResolvedValue(usuario(10));
      repositorio.buscarPorIdUsuario.mockResolvedValue(crearAlumno({ id_alumno: 7 }));

      const error = await servicio.crear(altaMayor).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AlumnoExistenteError);
      expect((error as AlumnoExistenteError).message).toContain("alumno 7");
    });

    it("lanza ConflictError si el DNI es de un usuario que no es alumno", async () => {
      usuarios.buscarPorDni.mockResolvedValue(usuario(10));
      repositorio.buscarPorIdUsuario.mockResolvedValue(null);

      await expect(servicio.crear(altaMayor)).rejects.toThrow(ConflictError);
    });

    it("lanza ConflictError si el email ya es de otro usuario", async () => {
      usuarios.buscarPorEmail.mockResolvedValue(usuario(11));

      await expect(servicio.crear(altaMayor)).rejects.toThrow(ConflictError);
    });
  });

  it("listar devuelve la página con el total y los límites pedidos", async () => {
    repositorio.listar.mockResolvedValue({ datos: [crearAlumno()], total: 31 });
    const filtro = { busqueda: "lop", limit: 20, offset: 20 };

    await expect(servicio.listar(filtro)).resolves.toEqual({
      datos: [crearAlumno()],
      total: 31,
      limit: 20,
      offset: 20,
    });
    expect(repositorio.listar).toHaveBeenCalledWith(filtro);
  });

  it("listarIds pide al repositorio los ids del listado hasta el tope", async () => {
    repositorio.listarIds.mockResolvedValue([3, 1]);

    await expect(servicio.listarIds({ busqueda: "lop" }, 501)).resolves.toEqual([3, 1]);
    expect(repositorio.listarIds).toHaveBeenCalledWith({ busqueda: "lop" }, 501);
  });

  it("obtenerPorId lanza NotFoundError si no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.obtenerPorId(9)).rejects.toThrow(NotFoundError);
  });

  it("buscarPorId y buscarPorIds devuelven lo que hay, sin lanzar", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);
    repositorio.buscarPorIds.mockResolvedValue([crearAlumno()]);

    await expect(servicio.buscarPorId(9)).resolves.toBeNull();
    await expect(servicio.buscarPorIds([1])).resolves.toEqual([crearAlumno()]);
    await expect(servicio.buscarPorIds([])).resolves.toEqual([]);
    expect(repositorio.buscarPorIds).toHaveBeenCalledOnce();
  });

  describe("actualizar", () => {
    it("modifica el teléfono sin tocar el tutor", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearAlumno());
      repositorio.actualizar.mockResolvedValue(crearAlumno());

      await servicio.actualizar(1, { telefono: "3794 445566" });

      expect(repositorio.actualizar).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ telefono: "3794 445566" }),
        {},
        undefined,
      );
    });

    it("cambia el tutor de un menor", async () => {
      repositorio.buscarPorId.mockResolvedValue(menorConTutor);
      usuarios.buscarPorId.mockResolvedValue(usuario(22));
      repositorio.actualizar.mockResolvedValue(menorConTutor);

      await servicio.actualizar(1, { tutor: { id_usuario: 22 } });

      expect(repositorio.actualizar).toHaveBeenCalledWith(1, expect.anything(), {}, { id_usuario: 22 });
    });

    it("quita el tutor cuando el alumno resulta mayor de edad y tiene email", async () => {
      repositorio.buscarPorId.mockResolvedValue(menorConTutor);
      repositorio.actualizar.mockResolvedValue(crearAlumno());

      await servicio.actualizar(1, { fecha_nacimiento: MAYOR, email: "tomas@example.com" });

      expect(repositorio.actualizar).toHaveBeenCalledWith(1, expect.anything(), {}, null);
    });

    it.each([
      ["el alumno resulta menor y no tiene tutor", crearAlumno(), { fecha_nacimiento: MENOR }],
      ["el alumno resulta mayor y no tiene email", menorConTutor, { fecha_nacimiento: MAYOR }],
      ["se le agrega email a un menor", menorConTutor, { email: "tomas@example.com" }],
      ["se le agrega tutor a un mayor", crearAlumno(), { tutor: { id_usuario: 22 } }],
    ])("lanza ValidationError si %s", async (_caso, actual, input) => {
      repositorio.buscarPorId.mockResolvedValue(actual);

      await expect(servicio.actualizar(1, input)).rejects.toThrow(ValidationError);
      expect(repositorio.actualizar).not.toHaveBeenCalled();
    });

    it("compara el DNI del tutor nuevo con el DNI que el alumno trae en el mismo cambio", async () => {
      repositorio.buscarPorId.mockResolvedValue(menorConTutor);

      await expect(
        servicio.actualizar(1, { dni: "50999888", tutor: { ...tutorNuevo, dni: "50999888" } }),
      ).rejects.toThrow(ValidationError);
    });

    it("cambia el tutor de un menor que no tiene DNI cargado", async () => {
      const sinDni = { ...menorConTutor, usuario: { ...menorConTutor.usuario, dni: null } };
      repositorio.buscarPorId.mockResolvedValue(sinDni);
      repositorio.actualizar.mockResolvedValue(sinDni);

      await servicio.actualizar(1, { tutor: tutorNuevo });

      expect(repositorio.actualizar).toHaveBeenCalledWith(1, expect.anything(), {}, { nuevo: tutorNuevo });
    });

    it("rechaza al propio alumno como tutor", async () => {
      repositorio.buscarPorId.mockResolvedValue(menorConTutor);
      usuarios.buscarPorId.mockResolvedValue(usuario(10, MAYOR));

      await expect(servicio.actualizar(1, { tutor: { id_usuario: 10 } })).rejects.toThrow(ValidationError);
    });

    it("permite que el DNI y el email sigan siendo los propios", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearAlumno());
      usuarios.buscarPorDni.mockResolvedValue(usuario(10));
      usuarios.buscarPorEmail.mockResolvedValue(usuario(10));
      repositorio.actualizar.mockResolvedValue(crearAlumno());

      await servicio.actualizar(1, { dni: "40111222", email: "ana@example.com" });

      expect(repositorio.actualizar).toHaveBeenCalled();
    });

    it("lanza ConflictError si el DNI nuevo es de otro usuario", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearAlumno());
      usuarios.buscarPorDni.mockResolvedValue(usuario(11));

      await expect(servicio.actualizar(1, { dni: "30999888" })).rejects.toThrow(ConflictError);
    });
  });

  describe("activar", () => {
    it("activa a un mayor y le asigna el rol ALUMNO", async () => {
      const alumno = crearAlumno();
      repositorio.buscarPorId.mockResolvedValue(alumno);
      repositorio.activar.mockResolvedValue({ ...alumno, estado: "ACTIVO" });
      usuarios.obtenerPorId.mockResolvedValue(usuario(10));

      await expect(servicio.activar(1)).resolves.toMatchObject({ estado: "ACTIVO" });
      expect(repositorio.activar).toHaveBeenCalledWith(alumno);
      expect(autorizacion.asignarRol).toHaveBeenCalledWith(10, "ALUMNO");
    });

    it("a un menor le asigna el rol TUTOR a su responsable", async () => {
      repositorio.buscarPorId.mockResolvedValue(menorConTutor);
      repositorio.activar.mockResolvedValue(menorConTutor);
      usuarios.obtenerPorId.mockResolvedValue(usuario(20));

      await servicio.activar(1);

      expect(usuarios.obtenerPorId).toHaveBeenCalledWith(20);
      expect(autorizacion.asignarRol).toHaveBeenCalledWith(20, "TUTOR");
    });

    it("no vuelve a asignar un rol que ya tiene", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearAlumno());
      repositorio.activar.mockResolvedValue(crearAlumno({ estado: "ACTIVO" }));
      usuarios.obtenerPorId.mockResolvedValue(usuario(10));
      autorizacion.tieneRol.mockReturnValue(true);

      await servicio.activar(1);

      expect(autorizacion.asignarRol).not.toHaveBeenCalled();
    });

    it("con el alumno ya activo no reactiva su cuenta ni la del tutor, ni toca roles", async () => {
      const activo = { ...menorConTutor, estado: "ACTIVO" as const };
      repositorio.buscarPorId.mockResolvedValue(activo);

      await expect(servicio.activar(1)).resolves.toBe(activo);
      expect(repositorio.activar).not.toHaveBeenCalled();
      expect(usuarios.obtenerPorId).not.toHaveBeenCalled();
      expect(autorizacion.asignarRol).not.toHaveBeenCalled();
    });

    it("lanza ConflictError si el alumno está dado de baja", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearAlumno({ estado: "BAJA" }));

      await expect(servicio.activar(1)).rejects.toThrow(ConflictError);
      expect(repositorio.activar).not.toHaveBeenCalled();
    });
  });

  describe("darDeBaja y reactivar", () => {
    it("darDeBaja da de baja a un alumno que no lo estaba", async () => {
      const alumno = crearAlumno({ estado: "ACTIVO" });
      repositorio.buscarPorId.mockResolvedValue(alumno);
      repositorio.darDeBaja.mockResolvedValue({ ...alumno, estado: "BAJA" });

      await expect(servicio.darDeBaja(1)).resolves.toMatchObject({ estado: "BAJA" });
      expect(repositorio.darDeBaja).toHaveBeenCalledWith(alumno);
    });

    it("darDeBaja lanza ConflictError si ya estaba dado de baja", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearAlumno({ estado: "BAJA" }));

      await expect(servicio.darDeBaja(1)).rejects.toThrow(ConflictError);
    });

    it("reactivar devuelve a un alumno dado de baja al estado pedido", async () => {
      const alumno = crearAlumno({ estado: "BAJA" });
      repositorio.buscarPorId.mockResolvedValue(alumno);
      repositorio.reactivar.mockResolvedValue({ ...alumno, estado: "INACTIVO" });

      await expect(servicio.reactivar(1, "INACTIVO")).resolves.toMatchObject({ estado: "INACTIVO" });
      expect(repositorio.reactivar).toHaveBeenCalledWith(alumno, "INACTIVO");
    });

    it("reactivar lanza ConflictError si el alumno no está dado de baja", async () => {
      repositorio.buscarPorId.mockResolvedValue(crearAlumno({ estado: "ACTIVO" }));

      await expect(servicio.reactivar(1, "ACTIVO")).rejects.toThrow(ConflictError);
    });
  });
});
