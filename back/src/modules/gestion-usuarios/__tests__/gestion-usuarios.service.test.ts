import { beforeEach, describe, expect, it, vi } from "vitest";
import { GestionUsuariosService } from "../gestion-usuarios.service.js";
import type { IAutorizacion } from "../rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../sesion/interface/i-autenticacion.js";
import type { UsuarioService } from "../usuario/usuario.service.js";

function crearComponentesMock() {
  return {
    usuarios: {
      crear: vi.fn().mockResolvedValue("usuarios.crear"),
      listar: vi.fn().mockResolvedValue("usuarios.listar"),
      obtenerPorId: vi.fn().mockResolvedValue("usuarios.obtenerPorId"),
      actualizar: vi.fn().mockResolvedValue("usuarios.actualizar"),
      eliminar: vi.fn().mockResolvedValue("usuarios.eliminar"),
      asignarRol: vi.fn().mockResolvedValue("usuarios.asignarRol"),
      quitarRol: vi.fn().mockResolvedValue("usuarios.quitarRol"),
    },
    sesion: {
      iniciarSesion: vi.fn().mockResolvedValue("sesion.iniciarSesion"),
      iniciarSesionDesarrollo: vi.fn().mockResolvedValue("sesion.iniciarSesionDesarrollo"),
      obtenerPerfil: vi.fn().mockResolvedValue("sesion.obtenerPerfil"),
      validarSesion: vi.fn(),
    },
    autorizacion: {
      obtenerMatriz: vi.fn().mockResolvedValue("autorizacion.obtenerMatriz"),
      actualizarMatriz: vi.fn().mockResolvedValue("autorizacion.actualizarMatriz"),
    },
  };
}

describe("GestionUsuariosService", () => {
  let componentes: ReturnType<typeof crearComponentesMock>;
  let gestion: GestionUsuariosService;

  beforeEach(() => {
    componentes = crearComponentesMock();
    gestion = new GestionUsuariosService(
      componentes.usuarios as unknown as UsuarioService,
      componentes.sesion as unknown as IAutenticacion,
      componentes.autorizacion as unknown as IAutorizacion,
    );
  });

  it.each([
    ["iniciarSesion", ["id-token"], "sesion"],
    ["iniciarSesionDesarrollo", ["ana@example.com"], "sesion"],
    ["obtenerPerfil", [1], "sesion"],
    ["crear", [{ nombre: "Ana" }], "usuarios"],
    ["listar", [], "usuarios"],
    ["obtenerPorId", [1], "usuarios"],
    ["actualizar", [1, { telefono: "351" }], "usuarios"],
    ["eliminar", [1], "usuarios"],
    ["asignarRol", [1, "ALUMNO"], "usuarios"],
    ["quitarRol", [1, "ALUMNO"], "usuarios"],
    ["obtenerMatriz", [], "autorizacion"],
    ["actualizarMatriz", [[{ rol: "PROFESORA", permiso: "RUTINAS_EDITAR", otorgado: true }]], "autorizacion"],
  ] as const)("%s se delega al componente dueño", async (metodo, argumentos, componente) => {
    const destino = (componentes[componente] as Record<string, ReturnType<typeof vi.fn>>)[metodo];
    const llamar = gestion[metodo] as (...args: unknown[]) => Promise<unknown>;

    await expect(llamar.apply(gestion, [...argumentos])).resolves.toBe(`${componente}.${metodo}`);
    expect(destino).toHaveBeenCalledWith(...argumentos);
  });
});
