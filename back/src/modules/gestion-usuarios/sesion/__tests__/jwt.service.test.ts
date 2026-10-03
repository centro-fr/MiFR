import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../../../../shared/errors/app-error.js";
import { JwtService } from "../jwt.service.js";
import type { UsuarioConRoles } from "../../usuario/usuario.types.js";

const SECRETO = "test-secret";

function crearUsuario(codigos: ("PROPIETARIA" | "PROFESORA" | "ALUMNO" | "TUTOR")[]): UsuarioConRoles {
  return {
    id_usuario: 1,
    google_id: "google-123",
    email: "test@example.com",
    nombre: "Ana",
    apellido: "Perez",
    dni: null,
    telefono: null,
    fecha_nacimiento: new Date("1990-01-01"),
    direccion: null,
    estado: "ACTIVO",
    fecha_alta: new Date(),
    fecha_actualizacion: new Date(),
    roles: codigos.map((codigo, i) => ({
      id_usuario: 1,
      id_rol: i + 1,
      rol: { id_rol: i + 1, codigo, nombre: codigo, descripcion: null },
      fecha_asignacion: new Date(),
    })),
  };
}

describe("JwtService", () => {
  it("emite un token que se puede verificar con el mismo secreto", () => {
    const jwtService = new JwtService(SECRETO, "1h");

    const payload = jwtService.verificar(jwtService.emitir(crearUsuario(["PROPIETARIA"])));

    expect(payload).toEqual({ usuarioId: 1, roles: ["PROPIETARIA"] });
  });

  it("emitir guarda el id_usuario como sub (string, según el estándar JWT)", () => {
    const token = new JwtService(SECRETO).emitir(crearUsuario(["ALUMNO"]));

    expect(jwt.decode(token)).toMatchObject({ sub: "1", roles: ["ALUMNO"] });
  });

  it("emitir incluye todos los roles de un usuario multi-rol", () => {
    const jwtService = new JwtService(SECRETO);

    const payload = jwtService.verificar(jwtService.emitir(crearUsuario(["PROPIETARIA", "PROFESORA"])));

    expect(payload.roles).toEqual(["PROPIETARIA", "PROFESORA"]);
  });

  it("emitir con un usuario sin roles deja la lista vacía", () => {
    const jwtService = new JwtService(SECRETO);

    expect(jwtService.verificar(jwtService.emitir(crearUsuario([]))).roles).toEqual([]);
  });

  it("emitir respeta la expiración configurada", () => {
    const token = new JwtService(SECRETO, "2h").emitir(crearUsuario(["ALUMNO"]));
    const { iat, exp } = jwt.decode(token) as { iat: number; exp: number };

    expect(exp - iat).toBe(2 * 60 * 60);
  });

  it("emitir usa 8h de expiración por defecto", () => {
    const token = new JwtService(SECRETO).emitir(crearUsuario(["ALUMNO"]));
    const { iat, exp } = jwt.decode(token) as { iat: number; exp: number };

    expect(exp - iat).toBe(8 * 60 * 60);
  });

  it("verificar lanza UnauthorizedError con un token firmado con otro secreto", () => {
    const token = new JwtService("secreto-a").emitir(crearUsuario(["ALUMNO"]));

    expect(() => new JwtService("secreto-b").verificar(token)).toThrow(UnauthorizedError);
  });

  it("verificar lanza UnauthorizedError con un token vencido", () => {
    const vencido = jwt.sign({ sub: "1", roles: [], exp: Math.floor(Date.now() / 1000) - 60 }, SECRETO);

    expect(() => new JwtService(SECRETO).verificar(vencido)).toThrow(UnauthorizedError);
  });

  it("verificar lanza UnauthorizedError con un texto que no es JWT", () => {
    expect(() => new JwtService(SECRETO).verificar("no-es-un-jwt")).toThrow(UnauthorizedError);
  });

  it("verificar lanza UnauthorizedError con un token viejo cuyo sub es un uuid", () => {
    const viejo = jwt.sign({ sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6", roles: ["PROPIETARIO"] }, SECRETO);

    expect(() => new JwtService(SECRETO).verificar(viejo)).toThrow(UnauthorizedError);
  });
});
