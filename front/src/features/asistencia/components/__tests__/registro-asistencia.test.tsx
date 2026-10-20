import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AsistenciaDeClaseApi,
  InscriptoConAsistenciaApi,
} from "@/features/asistencia/schemas/asistencia";
import { RegistroAsistencia } from "../registro-asistencia";

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

function renderRegistro(datos: AsistenciaDeClaseApi, props: { propietaria?: boolean; guardando?: boolean; error?: string | null } = {}) {
  const acciones = {
    alMarcar: vi.fn().mockResolvedValue(undefined),
    alMarcarTodos: vi.fn().mockResolvedValue(undefined),
    alCerrar: vi.fn().mockResolvedValue(undefined),
    reintentar: vi.fn(),
  };
  render(
    <MemoryRouter>
      <RegistroAsistencia
        datos={datos}
        volver="/app/hoy"
        propietaria={props.propietaria ?? false}
        guardando={props.guardando ?? false}
        error={props.error ?? null}
        {...acciones}
      />
    </MemoryRouter>,
  );
  return acciones;
}

// La pantalla dibuja la lista dos veces (tarjetas en celular y tabla en escritorio, una oculta por CSS):
// se trabaja con las tarjetas, que son las del celular de la profesora.
const botonesDe = (nombre: string) => {
  const grupos = screen.getAllByLabelText(`Asistencia de ${nombre} Test`);
  return {
    presente: within(grupos[0]).getByRole("button", { name: "Presente" }),
    ausente: within(grupos[0]).getByRole("button", { name: "Ausente" }),
  };
};

describe("RegistroAsistencia (US-20)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(AHORA));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra la actividad, el horario y la cantidad de inscriptos", () => {
    renderRegistro(crearDatos());

    expect(screen.getByRole("heading", { name: "Funcional Matutino", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Grupal")).toBeInTheDocument();
    expect(screen.getByText(/10:00 a 11:00/)).toBeInTheDocument();
    expect(screen.getByText("1 inscripto")).toBeInTheDocument();
    expect(screen.getByText("Asistencia abierta")).toBeInTheDocument();
  });

  it("la profesora marca presente y ausente en el momento, sin guardar todo", () => {
    const { alMarcar } = renderRegistro(crearDatos());

    fireEvent.click(botonesDe("Mateo").presente);
    expect(alMarcar).toHaveBeenLastCalledWith(1, true);

    fireEvent.click(botonesDe("Mateo").ausente);
    expect(alMarcar).toHaveBeenLastCalledWith(1, false);
    expect(screen.getByText("Las marcas se guardan al instante.")).toBeInTheDocument();
  });

  it("refleja el estado marcado de cada alumno", () => {
    renderRegistro(
      crearDatos({}, [
        crearInscripto({ id_alumno: 1, nombre: "Mateo", asistencia: "presente" }),
        crearInscripto({ id_alumno: 2, nombre: "Bautista", asistencia: "ausente" }),
      ]),
    );

    expect(botonesDe("Mateo").presente).toHaveAttribute("aria-pressed", "true");
    expect(botonesDe("Mateo").ausente).toHaveAttribute("aria-pressed", "false");
    expect(botonesDe("Bautista").ausente).toHaveAttribute("aria-pressed", "true");
  });

  it("marca a todos presentes", () => {
    const { alMarcarTodos } = renderRegistro(crearDatos());

    fireEvent.click(screen.getByRole("button", { name: "Marcar todos presentes" }));

    expect(alMarcarTodos).toHaveBeenCalledTimes(1);
  });

  it("deshabilita los botones mientras se está guardando", () => {
    renderRegistro(crearDatos(), { guardando: true });

    expect(botonesDe("Mateo").presente).toBeDisabled();
    expect(botonesDe("Mateo").ausente).toBeDisabled();
    expect(screen.getByRole("button", { name: "Marcar todos presentes" })).toBeDisabled();
  });

  it("muestra el estado de cuota de cada alumno", () => {
    renderRegistro(crearDatos());

    expect(screen.getAllByText("Al día").length).toBeGreaterThan(0);
  });

  it("advierte con 'Revisar habilitación' a un alumno vencido que no puede asistir", () => {
    renderRegistro(
      crearDatos({}, [
        crearInscripto({
          id_alumno: 1,
          nombre: "Mateo",
          situacion_cuota: {
            estado: "VENCIDA",
            fecha_vencimiento: "2026-10-01T00:00:00.000Z",
            dias_restantes: -13,
            puede_asistir: false,
            tiene_pago_pendiente: false,
          },
        }),
      ]),
    );

    expect(screen.getAllByText("Vencida").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Revisar habilitación").length).toBeGreaterThan(0);
  });

  it("no advierte a un alumno con transferencia pendiente que puede asistir", () => {
    renderRegistro(
      crearDatos({}, [
        crearInscripto({
          id_alumno: 1,
          nombre: "Mateo",
          situacion_cuota: {
            estado: "VENCIDA",
            fecha_vencimiento: "2026-10-01T00:00:00.000Z",
            dias_restantes: -13,
            puede_asistir: true,
            tiene_pago_pendiente: true,
          },
        }),
      ]),
    );

    expect(screen.getAllByText("Transferencia pendiente de verificación").length).toBeGreaterThan(0);
    expect(screen.queryByText("Revisar habilitación")).not.toBeInTheDocument();
  });

  it("no usa la palabra pago en el estado de cuota de quien no abonó nunca", () => {
    renderRegistro(
      crearDatos({}, [
        crearInscripto({
          id_alumno: 1,
          nombre: "Mateo",
          situacion_cuota: { estado: "PENDIENTE_DE_PAGO", fecha_vencimiento: null, dias_restantes: null, puede_asistir: false, tiene_pago_pendiente: false },
        }),
      ]),
    );

    expect(screen.getAllByText("Sin transferencia confirmada").length).toBeGreaterThan(0);
  });

  it("muestra las observaciones del alumno", () => {
    renderRegistro(crearDatos({}, [crearInscripto({ id_alumno: 1, nombre: "Mateo", observaciones: "Lesión de rodilla" })]));

    expect(screen.getAllByText("Lesión de rodilla").length).toBeGreaterThan(0);
  });

  it("muestra el estado vacío si no hay inscriptos y no ofrece marcar a todos", () => {
    renderRegistro(crearDatos({}, []));

    expect(screen.getByText("No hay alumnos inscriptos")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar todos presentes" })).not.toBeInTheDocument();
  });

  describe("cierre de la asistencia", () => {
    it("pide confirmación y avisa cuántos sin marcar pasarán a ausente", () => {
      const { alCerrar } = renderRegistro(
        crearDatos({}, [
          crearInscripto({ id_alumno: 1, nombre: "Mateo", asistencia: "presente" }),
          crearInscripto({ id_alumno: 2, nombre: "Bautista" }),
          crearInscripto({ id_alumno: 3, nombre: "Lucía" }),
        ]),
      );

      fireEvent.click(screen.getByRole("button", { name: "Cerrar asistencia" }));

      const dialogo = screen.getByRole("alertdialog");
      expect(within(dialogo).getByText("¿Cerrar la asistencia de esta clase?")).toBeInTheDocument();
      expect(within(dialogo).getByText(/2 inscriptos sin marcar pasarán a ausente/)).toBeInTheDocument();
      expect(alCerrar).not.toHaveBeenCalled();
    });

    it("usa el singular con un solo inscripto sin marcar", () => {
      renderRegistro(crearDatos());

      fireEvent.click(screen.getByRole("button", { name: "Cerrar asistencia" }));

      expect(screen.getByText(/1 inscripto sin marcar pasará a ausente/)).toBeInTheDocument();
    });

    it("no cierra si se elige seguir tomando asistencia", () => {
      const { alCerrar } = renderRegistro(crearDatos());

      fireEvent.click(screen.getByRole("button", { name: "Cerrar asistencia" }));
      fireEvent.click(screen.getByRole("button", { name: "Seguir tomando asistencia" }));

      expect(alCerrar).not.toHaveBeenCalled();
    });

    it("cierra al confirmar", () => {
      const { alCerrar } = renderRegistro(crearDatos());

      fireEvent.click(screen.getByRole("button", { name: "Cerrar asistencia" }));
      fireEvent.click(screen.getByRole("button", { name: "Confirmar cierre" }));

      expect(alCerrar).toHaveBeenCalledTimes(1);
    });
  });

  describe("asistencia cerrada o fuera de horario", () => {
    it("deja la lista en solo lectura para la profesora cuando la clase ya se cerró", () => {
      renderRegistro(
        crearDatos({ estado: "DICTADA", fecha_cierre_asist: "2026-10-14T14:00:00.000Z" }, [
          crearInscripto({ id_alumno: 1, nombre: "Mateo", asistencia: "ausente" }),
        ]),
      );

      expect(screen.getByText("Asistencia cerrada", { selector: "span, div" })).toBeInTheDocument();
      expect(screen.getByText(/Los inscriptos que seguían sin marcar quedaron registrados como ausentes/)).toBeInTheDocument();
      expect(botonesDe("Mateo").presente).toBeDisabled();
      expect(botonesDe("Mateo").ausente).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Marcar todos presentes" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Cerrar asistencia" })).not.toBeInTheDocument();
      expect(screen.getByText("Esta lista está en modo de solo lectura.")).toBeInTheDocument();
    });

    it("permite a la propietaria corregir marcas de una clase ya cerrada", () => {
      const { alMarcar } = renderRegistro(
        crearDatos({ estado: "DICTADA", fecha_cierre_asist: "2026-10-14T14:00:00.000Z" }, [
          crearInscripto({ id_alumno: 1, nombre: "Mateo", asistencia: "ausente" }),
        ]),
        { propietaria: true },
      );

      expect(screen.getByText(/Podés corregir marcas individuales/)).toBeInTheDocument();
      expect(botonesDe("Mateo").presente).toBeEnabled();

      fireEvent.click(botonesDe("Mateo").presente);
      expect(alMarcar).toHaveBeenCalledWith(1, true);
    });

    it("bloquea a la profesora antes de que empiece la clase y explica por qué", () => {
      vi.setSystemTime(new Date("2026-10-14T11:00:00.000Z")); // 08:00 en Argentina
      renderRegistro(crearDatos());

      expect(screen.getByText(/La toma de asistencia se abrirá durante el horario de la clase/)).toBeInTheDocument();
      expect(botonesDe("Mateo").presente).toBeDisabled();
    });

    it("bloquea a la profesora cuando el horario de la clase ya terminó", () => {
      vi.setSystemTime(new Date("2026-10-14T16:00:00.000Z")); // 13:00 en Argentina
      renderRegistro(crearDatos());

      expect(screen.getByText(/El horario de la clase ha finalizado/)).toBeInTheDocument();
      expect(botonesDe("Mateo").ausente).toBeDisabled();
    });

    it("bloquea a la profesora si la clase es de otro día", () => {
      vi.setSystemTime(new Date("2026-10-15T13:30:00.000Z"));
      renderRegistro(crearDatos());

      expect(botonesDe("Mateo").presente).toBeDisabled();
    });

    it("no permite marcar en una clase cancelada, ni siquiera a la propietaria", () => {
      renderRegistro(crearDatos({ estado: "CANCELADA" }), { propietaria: true });

      expect(screen.getByText("La clase fue cancelada y no genera registros de inasistencia.")).toBeInTheDocument();
      expect(botonesDe("Mateo").presente).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Cerrar asistencia" })).not.toBeInTheDocument();
    });
  });

  it("muestra el error y permite actualizar", () => {
    const { reintentar } = renderRegistro(crearDatos(), { error: "No se pudo guardar la asistencia." });

    expect(screen.getByText("No se pudo guardar la asistencia.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(reintentar).toHaveBeenCalledTimes(1);
  });
});
