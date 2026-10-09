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
    ["iniciarSesion", ["id-token"], "sesion", "iniciarSesion"],
    ["iniciarSesionDesarrollo", ["ana@example.com"], "sesion", "iniciarSesionDesarrollo"],
    ["obtenerPerfil", [1], "sesion", "obtenerPerfil"],
    ["crearUsuario", [{ nombre: "Ana" }], "usuarios", "crear"],
    ["listarUsuarios", [], "usuarios", "listar"],
    ["obtenerUsuarioPorId", [1], "usuarios", "obtenerPorId"],
    ["actualizarUsuario", [1, { telefono: "351" }], "usuarios", "actualizar"],
    ["eliminarUsuario", [1], "usuarios", "eliminar"],
    ["asignarRol", [1, "ALUMNO"], "usuarios", "asignarRol"],
    ["quitarRol", [1, "ALUMNO"], "usuarios", "quitarRol"],
    ["obtenerMatriz", [], "autorizacion", "obtenerMatriz"],
    [
      "actualizarMatriz",
      [[{ rol: "PROFESORA", permiso: "RUTINAS_EDITAR", otorgado: true }]],
      "autorizacion",
      "actualizarMatriz",
    ],
  ] as const)("%s se delega al componente dueño", async (metodo, argumentos, componente, metodoDestino) => {
    const destino = (componentes[componente] as Record<string, ReturnType<typeof vi.fn>>)[metodoDestino];
    const llamar = gestion[metodo] as (...args: unknown[]) => Promise<unknown>;

    await expect(llamar.apply(gestion, [...argumentos])).resolves.toBe(`${componente}.${metodoDestino}`);
    expect(destino).toHaveBeenCalledWith(...argumentos);
  });
});
