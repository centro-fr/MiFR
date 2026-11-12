import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AsistenciaDeClaseApi,
  InscriptoConAsistenciaApi,
} from "@/features/asistencia/schemas/asistencia";
import { TomaDeAsistencia } from "../toma-de-asistencia";

// Martes 14/10/2026, 10:30 en Argentina (13:30 UTC): dentro de la clase de 10:00 a 11:00.
const AHORA = "2026-10-14T13:30:00.000Z";

function crearInscripto(parcial: Partial<InscriptoConAsistenciaApi> & Pick<InscriptoConAsistenciaApi, "id_alumno" | "nombre">): InscriptoConAsistenciaApi {
  return {
    id_inscripcion: parcial.id_alumno,
    apellido: "Test",
    asistencia: "sin_marcar",
    observaciones: null,
    situacion_cuota: {
      estado: "AL_DIA",
      fecha_vencimiento: "2026-10-30T00:00:00.000Z",
      dias_restantes: 16,
      puede_asistir: true,
      tiene_pago_pendiente: false,
    },
    ...parcial,
  };
}

function crearDatos(
  claseParcial: Partial<AsistenciaDeClaseApi["clase"]> = {},
  inscriptos: InscriptoConAsistenciaApi[] = [crearInscripto({ id_alumno: 1, nombre: "Mateo" })],
): AsistenciaDeClaseApi {
  return {
    clase: {
      id_clase: 5,
      id_horario: 2,
      fecha_clase: "2026-10-14T00:00:00.000Z",
      id_prof_dictante: 1,
      estado: "PROGRAMADA",
      fecha_cierre_asist: null,
      observaciones: null,
      horario: {
        hora_inicio: "2026-10-14T10:00:00.000Z",
        hora_fin: "2026-10-14T11:00:00.000Z",
        cupo_maximo: 10,
        actividad: { id_actividad: 1, nombre: "Funcional Matutino", modalidad: "GRUPAL", cupo_maximo: 10 },
      },
      ...claseParcial,
    },
    inscriptos,
  };
}

function renderToma(datos: AsistenciaDeClaseApi, props: { propietaria?: boolean; guardando?: boolean } = {}) {
  const acciones = {
    alMarcar: vi.fn().mockResolvedValue(undefined),
    alMarcarTodos: vi.fn().mockResolvedValue(undefined),
    alCerrar: vi.fn().mockResolvedValue(undefined),
    reintentar: vi.fn(),
  };
  render(
    <MemoryRouter>
      <TomaDeAsistencia
        datos={datos}
        volver="/app/hoy"
        propietaria={props.propietaria ?? false}
        guardando={props.guardando ?? false}
        error={null}
        {...acciones}
      />
    </MemoryRouter>,
  );
  return acciones;
}

const botonesDe = (nombre: string) => {
  const grupo = screen.getByRole("group", { name: `Asistencia de ${nombre} Test` });
  return {
    presente: within(grupo).getByRole("button", { name: "Presente" }),
    ausente: within(grupo).getByRole("button", { name: "Ausente" }),
  };
};

describe("TomaDeAsistencia (US-20)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(AHORA));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra la actividad, el horario y el resumen de marcas", () => {
    renderToma(
      crearDatos({}, [
        crearInscripto({ id_alumno: 1, nombre: "Mateo", asistencia: "presente" }),
        crearInscripto({ id_alumno: 2, nombre: "Bautista", asistencia: "ausente" }),
        crearInscripto({ id_alumno: 3, nombre: "Lola" }),
      ]),
    );

    expect(screen.getByRole("heading", { name: "Funcional Matutino", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Hoy de 10:00 a 11:00")).toBeInTheDocument();
    expect(screen.getByText("1 presente · 1 ausente · 1 sin marcar")).toBeInTheDocument();
    expect(botonesDe("Mateo").presente).toHaveAttribute("aria-pressed", "true");
    expect(botonesDe("Bautista").ausente).toHaveAttribute("aria-pressed", "true");
  });

  it("guarda cada marca al tocarla", () => {
    const { alMarcar } = renderToma(crearDatos());

    fireEvent.click(botonesDe("Mateo").presente);
    expect(alMarcar).toHaveBeenLastCalledWith(1, true);
    fireEvent.click(botonesDe("Mateo").ausente);
    expect(alMarcar).toHaveBeenLastCalledWith(1, false);
  });

  it("marca a todos presentes", () => {
    const { alMarcarTodos } = renderToma(crearDatos());
    fireEvent.click(screen.getByRole("button", { name: "Todos presentes" }));
    expect(alMarcarTodos).toHaveBeenCalledTimes(1);
  });

  it("deshabilita las marcas mientras guarda", () => {
    renderToma(crearDatos(), { guardando: true });
    expect(botonesDe("Mateo").presente).toBeDisabled();
    expect(screen.getByRole("button", { name: "Todos presentes" })).toBeDisabled();
  });

  it("avisa la cuota vencida, la habilitación y las observaciones debajo del nombre", () => {
    renderToma(
      crearDatos({}, [
        crearInscripto({
          id_alumno: 1,
          nombre: "Mateo",
          observaciones: "Lesión de rodilla",
          situacion_cuota: { estado: "VENCIDA", fecha_vencimiento: null, dias_restantes: -3, puede_asistir: true, tiene_pago_pendiente: false },
        }),
        crearInscripto({
          id_alumno: 2,
          nombre: "Bautista",
          situacion_cuota: { estado: "VENCIDA", fecha_vencimiento: null, dias_restantes: -20, puede_asistir: false, tiene_pago_pendiente: false },
        }),
      ]),
    );

    expect(screen.getByText("Cuota vencida · Lesión de rodilla")).toBeInTheDocument();
    expect(screen.getByText("Revisar habilitación")).toBeInTheDocument();
  });

  it("muestra el estado vacío sin ofrecer marcar a todos", () => {
    renderToma(crearDatos({}, []));
    expect(screen.getByText("No hay alumnos inscriptos en esta clase.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Todos presentes" })).not.toBeInTheDocument();
  });

  describe("cierre de la asistencia", () => {
    it("pide confirmación y avisa cuántos sin marcar pasarán a ausente", () => {
      const { alCerrar } = renderToma(
        crearDatos({}, [crearInscripto({ id_alumno: 1, nombre: "Mateo" }), crearInscripto({ id_alumno: 2, nombre: "Bautista" })]),
      );

      fireEvent.click(screen.getByRole("button", { name: "Cerrar asistencia" }));
      const dialogo = screen.getByRole("alertdialog");
      expect(within(dialogo).getByText(/2 inscriptos sin marcar pasarán a ausente/)).toBeInTheDocument();
      expect(alCerrar).not.toHaveBeenCalled();

      fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar cierre" }));
      expect(alCerrar).toHaveBeenCalledTimes(1);
    });

    it("deja la lista en solo lectura para la profesora cuando la clase ya se cerró", () => {
      renderToma(crearDatos({ estado: "DICTADA", fecha_cierre_asist: "2026-10-14T14:20:00.000Z" }));

      expect(screen.getByText(/Asistencia cerrada el/)).toBeInTheDocument();
      expect(botonesDe("Mateo").presente).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Cerrar asistencia" })).not.toBeInTheDocument();
    });

    it("permite a la propietaria corregir marcas de una clase cerrada", () => {
      const { alMarcar } = renderToma(crearDatos({ estado: "DICTADA" }), { propietaria: true });

      expect(screen.getByText(/Podés corregir marcas individuales/)).toBeInTheDocument();
      fireEvent.click(botonesDe("Mateo").presente);
      expect(alMarcar).toHaveBeenCalledWith(1, true);
    });

    it("bloquea a la profesora antes de que empiece la clase", () => {
      vi.setSystemTime(new Date("2026-10-14T12:00:00.000Z"));
      renderToma(crearDatos());

      expect(screen.getByText(/La asistencia se abre en el horario de la clase/)).toBeInTheDocument();
      expect(botonesDe("Mateo").presente).toBeDisabled();
    });
  });
});
