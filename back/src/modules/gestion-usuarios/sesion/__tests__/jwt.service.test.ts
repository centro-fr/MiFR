import { describe, expect, it } from "vitest";
import { UnauthorizedError } from "../../../../shared/errors/app-error.js";
import { JwtService } from "../jwt.service.js";

const usuario = {
  id_usuario: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  google_id: "google-123",
  email: "test@example.com",
  nombre: "Ana",
  apellido: "Perez",
  dni: null,
  telefono: null,
  fecha_nacimiento: null,
  direccion: null,
  estado: "ACTIVO" as const,
  fecha_alta: new Date(),
  fecha_actualizacion: new Date(),
  roles: [
    {
      id_usuario: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      rol: "PROPIETARIO" as const,
      fecha_asignacion: new Date(),
    },
  ],
};

describe("JwtService", () => {
  it("emite un token que se puede verificar con el mismo secreto", () => {
    const jwtService = new JwtService("test-secret", "1h");

    const token = jwtService.emitir(usuario);
    const payload = jwtService.verificar(token);

    expect(payload.usuarioId).toBe(usuario.id_usuario);
    expect(payload.roles).toEqual(["PROPIETARIO"]);
  });

  it("lanza UnauthorizedError con un token firmado con otro secreto", () => {
    const emisor = new JwtService("secreto-a", "1h");
    const verificador = new JwtService("secreto-b", "1h");

    const token = emisor.emitir(usuario);

    expect(() => verificador.verificar(token)).toThrow(UnauthorizedError);
  });
});
