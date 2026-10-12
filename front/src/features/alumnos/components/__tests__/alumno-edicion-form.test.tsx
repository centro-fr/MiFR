import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlumnoEdicionForm } from "@/features/alumnos/components/alumno-edicion-form";
import { ALUMNOS_SEMILLA } from "@/mocks/data/alumnos";

function crearAlumno() {
  const alumno = ALUMNOS_SEMILLA.find((item) => item.id_alumno === 1);
  if (!alumno) throw new Error("Falta el alumno de prueba");
  return structuredClone(alumno);
}

function renderFormulario(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe("AlumnoEdicionForm", () => {
  it("expone límites de nacimiento y valida nombres sin permitir dígitos", async () => {
    const alumno = crearAlumno();
    renderFormulario(
      <AlumnoEdicionForm
        alumno={alumno}
        esPropietaria
        onCancelar={vi.fn()}
        onGuardado={vi.fn()}
      />,
    );

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

  it("muestra y exige los datos del tutor si la fecha pasa a ser menor de edad", async () => {
    const alumno = crearAlumno();
    renderFormulario(
      <AlumnoEdicionForm
        alumno={alumno}
        esPropietaria
        onCancelar={vi.fn()}
        onGuardado={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Fecha de nacimiento *"), {
      target: { value: "2012-08-22" },
    });
    expect(screen.getByText("Tutor responsable")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ingresá el nombre");
    expect(screen.getByText("Ingresá el apellido")).toBeVisible();
  });

  it("marca como inválido un nombre de contacto de emergencia que contiene números", async () => {
    const alumno = crearAlumno();
    renderFormulario(
      <AlumnoEdicionForm
        alumno={alumno}
        esPropietaria
        onCancelar={vi.fn()}
        onGuardado={vi.fn()}
      />,
    );

    const contactoEmergencia = screen.getByLabelText("Contacto de emergencia");
    fireEvent.change(contactoEmergencia, { target: { value: "Sofía 2" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Usá solo letras, espacios, apóstrofes, puntos o guiones",
    );
    expect(contactoEmergencia).toHaveAttribute("aria-invalid", "true");
  });

  it("valida teléfonos y evita seleccionar una fecha futura para el apto médico", async () => {
    const alumno = crearAlumno();
    renderFormulario(
      <AlumnoEdicionForm
        alumno={alumno}
        esPropietaria
        onCancelar={vi.fn()}
        onGuardado={vi.fn()}
      />,
    );

    const fechaApto = screen.getByLabelText("Fecha del apto médico");
    const limiteFecha = new Date();
    const fechaMaxima = [
      limiteFecha.getFullYear().toString().padStart(4, "0"),
      (limiteFecha.getMonth() + 1).toString().padStart(2, "0"),
      limiteFecha.getDate().toString().padStart(2, "0"),
    ].join("-");
    expect(fechaApto).toHaveAttribute("max", fechaMaxima);
    expect(fechaApto).toHaveAttribute("min", alumno.usuario.fecha_nacimiento);

    const telefonoEmergencia = screen.getByLabelText("Teléfono de emergencia");
    fireEvent.change(telefonoEmergencia, {
      target: { value: "llamar al 5555" },
    });
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
    const alumno = crearAlumno();
    renderFormulario(
      <AlumnoEdicionForm
        alumno={alumno}
        esPropietaria
        onCancelar={vi.fn()}
        onGuardado={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Apto médico presentado"));

    expect(screen.queryByLabelText("Fecha del apto médico")).not.toBeInTheDocument();
  });

  it("no permite editar datos personales ni ver cuotas a una profesora", () => {
    const alumno = crearAlumno();
    renderFormulario(
      <AlumnoEdicionForm
        alumno={alumno}
        esPropietaria={false}
        onCancelar={vi.fn()}
        onGuardado={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Nombre *")).not.toBeInTheDocument();
    expect(screen.queryByText("Plan y horarios")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Notas de contacto")).toBeInTheDocument();
  });
});
