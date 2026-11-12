import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrearRutinaBody } from "@/features/rutinas/schemas/rutinas";
import { DialogoRutina } from "../dialogo-rutina";

const crearRutina = vi.fn<(cuerpo: CrearRutinaBody) => Promise<void>>();

vi.mock("@/features/rutinas/hooks/use-rutinas", () => ({
  useCrearRutina: () => ({ mutateAsync: crearRutina, isPending: false }),
  useActualizarRutina: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEliminarRutina: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/features/rutinas/data/catalogo-ejercicios", () => ({
  cargarEjerciciosDataset: () => Promise.resolve([]),
  buscarEjerciciosDelCatalogo: () => [],
  resolverGifUrl: () => undefined,
}));

function renderDialogo() {
  render(<DialogoRutina abierto idAlumno={7} nombreAlumno="Sofía" rutinasExistentes={[]} onClose={vi.fn()} />);
}

function tocar(nombre: string) {
  fireEvent.click(screen.getByRole("button", { name: nombre }));
}

function agregarEjercicioPropio(nombre: string) {
  fireEvent.change(screen.getByPlaceholderText(/Buscar ejercicio en el catálogo/), { target: { value: nombre } });
  tocar(`Agregar uno: "${nombre}"`);
}

function nombresDeEjerciciosVisibles() {
  // La primera línea de cada fila es el nombre del ejercicio.
  return screen
    .queryAllByRole("button", { name: "Quitar ejercicio" })
    .map((boton) => boton.closest("div.rounded-xl")?.querySelector("p")?.textContent);
}

describe("DialogoRutina", () => {
  beforeEach(() => {
    crearRutina.mockReset();
    crearRutina.mockResolvedValue();
  });

  // Recorre varios días y pestañas: con toda la suite en paralelo supera los 5 s por defecto.
  it("cada día conserva su nombre y sus ejercicios al agregar días y cambiar de pestaña", () => {
    renderDialogo();

    agregarEjercicioPropio("Sentadilla");
    tocar("+ Día");
    expect(screen.getByLabelText("Nombre del día")).toHaveValue("Día 2");
    expect(nombresDeEjerciciosVisibles()).toEqual([]);

    agregarEjercicioPropio("Remo");
    tocar("+ Día");
    agregarEjercicioPropio("Plancha");

    tocar("Día 1");
    expect(screen.getByLabelText("Nombre del día")).toHaveValue("Día 1");
    expect(nombresDeEjerciciosVisibles()).toEqual(["Sentadilla"]);

    tocar("Día 2");
    expect(screen.getByLabelText("Nombre del día")).toHaveValue("Día 2");
    expect(nombresDeEjerciciosVisibles()).toEqual(["Remo"]);
  }, 15_000);

  it("guarda todos los días cargados de una sola vez", async () => {
    renderDialogo();

    fireEvent.change(screen.getByPlaceholderText("Ej: Movilidad y core"), { target: { value: "Fuerza" } });
    agregarEjercicioPropio("Sentadilla");
    tocar("+ Día");
    agregarEjercicioPropio("Remo");
    tocar("Crear rutina");

    await waitFor(() => expect(crearRutina).toHaveBeenCalledOnce());
    const dias = crearRutina.mock.calls[0][0].contenido.dias;
    expect(dias.map(({ nombre, ejercicios }) => [nombre, ejercicios.map((ej) => ej.nombre)])).toEqual([
      ["Día 1", ["Sentadilla"]],
      ["Día 2", ["Remo"]],
    ]);
  });
});
