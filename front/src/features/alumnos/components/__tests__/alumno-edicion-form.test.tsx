import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlumnoEdicionForm } from "../alumno-edicion-form";
import type { AlumnoDetalle } from "../../schemas/alumno";

vi.mock("../../hooks/use-alumnos", () => ({
  useActualizarAlumno: () => ({ mutate: vi.fn(), isPending: false }),
}));

function crearAlumno(): AlumnoDetalle {
  return {
    id_alumno: 1,
    id_usuario_responsable: null,
    usuario: {
      id_usuario: 101,
      nombre: "Camila",
      apellido: "Pérez",
      dni: "35123456",
      fecha_nacimiento: "1992-04-18",
      telefono: "11 5555-0101",
      email: "camila.perez@example.com",
      direccion: "Av. San Martín 123",
    },
    tutor: null,
    cont_emerg_nombre: "Sofía Pérez",
    cont_emerg_telefono: "11 5555-0102",
    apto_medico: true,
    fecha_apto_medico: "2026-05-12",
    observaciones: "Prefiere clases por la tarde.",
    estado: "ACTIVO",
    fecha_alta: "2025-02-10T12:00:00.000Z",
    fecha_baja: null,
    inscripcion: null,
    inscripciones: [],
    inscripciones_de_la_baja: [],
    historial_cuotas: null,
  };
}

function renderFormulario(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

function formulario(esPropietaria = true) {
  return (
    <AlumnoEdicionForm
      alumno={crearAlumno()}
      esPropietaria={esPropietaria}
      onCancelar={vi.fn()}
      onGuardado={vi.fn()}
    />
  );
}

describe("AlumnoEdicionForm", () => {
  it("expone límites de nacimiento y valida nombres sin permitir dígitos", async () => {
    renderFormulario(formulario());

    const nombre = screen.getByLabelText("Nombre *");
    const nacimiento = screen.getByLabelText("Fecha de nacimiento *");
    expect(screen.getByText("Datos personales").closest("section")).toHaveClass("dark:bg-slate-800");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toHaveClass("bg-[#BC1266]");
    expect(nacimiento).toHaveAttribute("max");
    expect(nacimiento).toHaveAttribute("min");

    fireEvent.change(nombre, { target: { value: "Camila2" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Usá solo letras, espacios, apóstrofes, puntos o guiones",
    );
  });

  it("exige un tutor asociado si la fecha de nacimiento pasa a ser menor de edad", async () => {
    renderFormulario(formulario());

    fireEvent.change(screen.getByLabelText("Fecha de nacimiento *"), {
      target: { value: "2012-08-22" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Un alumno menor de 18 años necesita un tutor responsable",
    );
  });

  it("marca como inválido un nombre de contacto de emergencia que contiene números", async () => {
    renderFormulario(formulario());

    const contactoEmergencia = screen.getByLabelText("Contacto de emergencia");
    fireEvent.change(contactoEmergencia, { target: { value: "Sofía 2" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Usá solo letras, espacios, apóstrofes, puntos o guiones",
    );
    expect(contactoEmergencia).toHaveAttribute("aria-invalid", "true");
  });

  it("valida teléfonos y evita seleccionar una fecha futura para el apto médico", async () => {
    renderFormulario(formulario());

    const fechaApto = screen.getByLabelText("Fecha del apto médico");
    const limiteFecha = new Date();
    const fechaMaxima = [
      limiteFecha.getFullYear().toString().padStart(4, "0"),
      (limiteFecha.getMonth() + 1).toString().padStart(2, "0"),
      limiteFecha.getDate().toString().padStart(2, "0"),
    ].join("-");
    expect(fechaApto).toHaveAttribute("max", fechaMaxima);
    expect(fechaApto).toHaveAttribute("min", crearAlumno().usuario.fecha_nacimiento);

    const telefonoEmergencia = screen.getByLabelText("Teléfono de emergencia");
    fireEvent.change(telefonoEmergencia, { target: { value: "llamar al 5555" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ingresá un teléfono válido con entre 7 y 15 dígitos",
    );

    fireEvent.change(telefonoEmergencia, { target: { value: "" } });
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 1);
    const valorFechaFutura = [
      fechaFutura.getFullYear().toString().padStart(4, "0"),
      (fechaFutura.getMonth() + 1).toString().padStart(2, "0"),
      fechaFutura.getDate().toString().padStart(2, "0"),
    ].join("-");
    fireEvent.change(fechaApto, { target: { value: valorFechaFutura } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La fecha del apto médico no puede ser futura",
    );
  });

  it("elimina la fecha del apto médico al desmarcar su presentación", () => {
    renderFormulario(formulario());
    fireEvent.click(screen.getByLabelText("Apto médico presentado"));

    expect(screen.queryByLabelText("Fecha del apto médico")).not.toBeInTheDocument();
  });

  it("no permite editar datos personales ni ver cuotas a una profesora", () => {
    renderFormulario(formulario(false));

    expect(screen.queryByLabelText("Nombre *")).not.toBeInTheDocument();
    expect(screen.queryByText("Plan y horarios")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Observaciones")).toBeInTheDocument();
  });
});
