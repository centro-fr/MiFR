import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SuplenciaDialog } from "../suplencia-dialog";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";

function crearHorarioApi(id: number, actividadNombre: string, horaInicio: string, diaSemana = 1): HorarioApi {
  return {
    id_horario: id,
    id_actividad: id,
    id_profesora: 1,
    dia_semana: diaSemana,
    hora_inicio: `1970-01-01T${horaInicio}:00.000Z`,
    hora_fin: "1970-01-01T23:00:00.000Z",
    cupo_maximo: 10,
    cupo_maximo_efectivo: 10,
    fecha_alta: "2026-01-01T00:00:00.000Z",
    fecha_baja: null,
    actividad: {
      id_actividad: id,
      codigo: `ACT-${id}`,
      nombre: actividadNombre,
      descripcion: null,
      modalidad: "GRUPAL",
      cupo_maximo: 10,
      activo: true,
    },
    profesora: {
      id_profesora: 1,
      id_usuario: 1,
      especialidad: null,
      fecha_alta: "2026-01-01T00:00:00.000Z",
      fecha_baja: null,
      usuario: { nombre: "Lucia", apellido: "Gomez" },
    },
  };
}

const profesorasMock: ProfesoraDatos[] = [
  { id: "1", idUsuario: 1, nombre: "Lucía", apellido: "Gómez" },
  { id: "2", idUsuario: 2, nombre: "Carla", apellido: "Ruiz" },
];

describe("SuplenciaDialog", () => {
  it("ordena los horarios disponibles alfabéticamente por actividad y luego por hora", () => {
    const horariosDesordenados: HorarioApi[] = [
      crearHorarioApi(1, "Funcional", "21:00"),
      crearHorarioApi(2, "Acondicionamiento físico", "09:00"),
      crearHorarioApi(3, "Power", "14:00"),
      crearHorarioApi(4, "Funcional", "08:00"),
      crearHorarioApi(5, "HIIT", "16:00"),
    ];

    render(
      <SuplenciaDialog
        abierto
        suplencia={null}
        horarios={horariosDesordenados}
        profesoras={profesorasMock}
        guardando={false}
        error={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const fecha = screen.getByRole("dialog").querySelector('input[name="fechaClase"]');
    expect(fecha).not.toBeNull();
    fireEvent.change(fecha, { target: { value: "2026-10-26" } });
    fireEvent.click(screen.getByText("Elegí actividad y horario"));

    const opciones = screen.getAllByRole("option").map((opcion) => opcion.textContent);

    expect(opciones).toEqual([
      expect.stringContaining("Acondicionamiento físico · 09:00 hs"),
      expect.stringContaining("Funcional · 08:00 hs"),
      expect.stringContaining("Funcional · 21:00 hs"),
      expect.stringContaining("HIIT · 16:00 hs"),
      expect.stringContaining("Power · 14:00 hs"),
    ]);
  });
});
