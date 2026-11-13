import { describe, expect, it, vi } from "vitest";
import { GestionRutinasYProgresoService } from "../gestion-rutinas-y-progreso.service.js";
import type { ProgresoService } from "../progreso/progreso.service.js";
import type { RutinaService } from "../rutina/rutina.service.js";

const SOLICITANTE = { idUsuario: 2, esPropietaria: false };

function crearFachada() {
  const rutinas = {
    crear: vi.fn().mockResolvedValue("rutina creada"),
    listarDeAlumno: vi.fn().mockResolvedValue("historial"),
    obtenerVigente: vi.fn().mockResolvedValue("vigente"),
    obtenerVigentePropia: vi.fn().mockResolvedValue("mi rutina"),
    listarPropia: vi.fn().mockResolvedValue("mis rutinas"),
  };
  const progreso = {
    registrar: vi.fn().mockResolvedValue("registrado"),
    listarDeAlumno: vi.fn().mockResolvedValue("mediciones"),
    actualizar: vi.fn().mockResolvedValue("corregido"),
    eliminar: vi.fn().mockResolvedValue(undefined),
    listarPropio: vi.fn().mockResolvedValue("mi progreso"),
  };
  const fachada = new GestionRutinasYProgresoService(
    rutinas as unknown as RutinaService,
    progreso as unknown as ProgresoService,
  );
  return { fachada, rutinas, progreso };
}

describe("GestionRutinasYProgresoService", () => {
  it("pasa cada operación de rutinas al componente Rutina", async () => {
    const { fachada, rutinas } = crearFachada();
    const input = { id_alumno: 5 } as Parameters<typeof fachada.crearRutina>[0];

    expect(await fachada.crearRutina(input, SOLICITANTE)).toBe("rutina creada");
    expect(await fachada.listarRutinasDeAlumno(5, SOLICITANTE)).toBe("historial");
    expect(await fachada.obtenerRutinaVigente(5, SOLICITANTE)).toBe("vigente");
    expect(await fachada.obtenerMiRutina(SOLICITANTE)).toBe("mi rutina");
    expect(await fachada.listarMiRutinas(SOLICITANTE)).toBe("mis rutinas");
    expect(rutinas.crear).toHaveBeenCalledWith(input, SOLICITANTE);
    expect(rutinas.listarDeAlumno).toHaveBeenCalledWith(5, SOLICITANTE);
    expect(rutinas.obtenerVigente).toHaveBeenCalledWith(5, SOLICITANTE);
    expect(rutinas.obtenerVigentePropia).toHaveBeenCalledWith(SOLICITANTE);
    expect(rutinas.listarPropia).toHaveBeenCalledWith(SOLICITANTE);
  });

  it("pasa cada operación de progreso al componente Progreso", async () => {
    const { fachada, progreso } = crearFachada();
    const alta = { id_alumno: 5 } as Parameters<typeof fachada.registrarProgreso>[0];
    const cambios = { observaciones: "x" };

    expect(await fachada.registrarProgreso(alta, SOLICITANTE)).toBe("registrado");
    expect(await fachada.listarProgresoDeAlumno(5, SOLICITANTE)).toBe("mediciones");
    expect(await fachada.actualizarProgreso(1, cambios, SOLICITANTE)).toBe("corregido");
    await fachada.eliminarProgreso(1, SOLICITANTE);
    expect(await fachada.listarMiProgreso(SOLICITANTE)).toBe("mi progreso");
    expect(progreso.registrar).toHaveBeenCalledWith(alta, SOLICITANTE);
    expect(progreso.listarDeAlumno).toHaveBeenCalledWith(5, SOLICITANTE);
    expect(progreso.actualizar).toHaveBeenCalledWith(1, cambios, SOLICITANTE);
    expect(progreso.eliminar).toHaveBeenCalledWith(1, SOLICITANTE);
    expect(progreso.listarPropio).toHaveBeenCalledWith(SOLICITANTE);
  });
});
