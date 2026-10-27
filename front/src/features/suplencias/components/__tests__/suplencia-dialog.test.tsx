import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SuplenciaDialog } from "../suplencia-dialog";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";

function crearHorarioApi(
  id: number,
  actividadNombre: string,
  horaInicio: string,
  diaSemana = 1,
): HorarioApi {
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
      nombre: actividadNombre,
      tipo: "GRUPAL",
      cupo_sugerido: 10,
      duracion_minutos: 60,
      activo: true,
      fecha_alta: "2026-01-01T00:00:00.000Z",
      fecha_baja: null,
    },
    profesora: {
      id_profesora: 1,
      id_usuario: 1,
      especialidad: null,
      fecha_alta: "2026-01-01T00:00:00.000Z",
      fecha_baja: null,
      usuario: { nombre: "Lucía", apellido: "Gómez" },
    },
  };
}

const profesorasMock: ProfesoraDatos[] = [
  { id: "1", nombre: "Lucía", apellido: "Gómez", email: "lucia@gym.com" },
  { id: "2", nombre: "Carla", apellido: "Ruiz", email: "carla@gym.com" },
];

describe("SuplenciaDialog", () => {
  it("ordena los horarios disponibles alfabéticamente por actividad y luego por hora", () => {
    // 2026-10-26 es Lunes (dia_semana = 1)
    const horariosDesordenados: HorarioApi[] = [
      crearHorarioApi(1, "Funcional", "21:00", 1),
      crearHorarioApi(2, "Acondicionamiento físico", "09:00", 1),
      crearHorarioApi(3, "Power", "14:00", 1),
      crearHorarioApi(4, "Funcional", "08:00", 1),
      crearHorarioApi(5, "HIIT", "16:00", 1),
    ];

    render(
      <SuplenciaDialog
        abierto={true}
        suplencia={null}
        horarios={horariosDesordenados}
        profesoras={profesorasMock}
        guardando={false}
        error={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // Abrir el Select de Horario
    const trigger = screen.getByText("Elegí actividad y horario");
    fireEvent.click(trigger);

    // Los SelectItem renderizan con rol "option"
    const opciones = screen.getAllByRole("option");
    const textos = opciones.map((opcion) => opcion.textContent);

    expect(textos).toEqual([
      expect.stringContaining("Acondicionamiento físico · 09:00 hs"),
      expect.stringContaining("Funcional · 08:00 hs"),
      expect.stringContaining("Funcional · 21:00 hs"),
      expect.stringContaining("HIIT · 16:00 hs"),
      expect.stringContaining("Power · 14:00 hs"),
    ]);
  });
});
