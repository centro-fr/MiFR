import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DatosPersonales } from "@/features/alumnos/components/datos-personales";
import { crearFicha } from "@/features/alumnos/__tests__/ficha-de-prueba";

function seccion(nombre: string) {
  return within(screen.getByRole("region", { name: nombre }));
}

describe("DatosPersonales", () => {
  it("muestra los datos básicos formateados", () => {
    render(<DatosPersonales alumno={crearFicha()} />);

    const basica = seccion("Información básica");
    expect(basica.getByText("Martina Bianchi")).toBeInTheDocument();
    expect(basica.getByText("24/04/1996")).toBeInTheDocument();
    expect(basica.getByText("38.412.985")).toBeInTheDocument();
  });

  // Las columnas NULL del DER se muestran como faltantes, nunca con un valor inventado.
  it("indica 'Sin cargar' en los datos opcionales que faltan", () => {
    render(
      <DatosPersonales
        alumno={crearFicha({ dni: null, email: null, telefono: null, direccion: null })}
      />,
    );

    expect(seccion("Información básica").getByText("Sin cargar")).toBeInTheDocument();
    expect(seccion("Vías de contacto").getAllByText("Sin cargar")).toHaveLength(3);
  });

  it("ofrece WhatsApp solo para teléfonos con código de país", () => {
    render(
      <DatosPersonales
        alumno={crearFicha({ contactoEmergencia: { nombre: "Carla", telefono: "351 555-0101" } })}
      />,
    );

    const enlaces = seccion("Vías de contacto").getAllByRole("link", { name: /Abrir WhatsApp/ });
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]).toHaveAttribute("href", "https://wa.me/543514458910");
    expect(enlaces[0]).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("muestra el tutor a cargo solo cuando el alumno tiene uno", () => {
    const { rerender } = render(<DatosPersonales alumno={crearFicha()} />);
    expect(screen.queryByRole("heading", { name: "Tutor/a a cargo" })).not.toBeInTheDocument();

    rerender(
      <DatosPersonales
        alumno={crearFicha({ responsable: { nombre: "Carlos", apellido: "Pérez", telefono: null, email: null } })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Tutor/a a cargo" })).toBeInTheDocument();
    expect(screen.getByText("Carlos Pérez")).toBeInTheDocument();
  });

  it("muestra el apto médico con su fecha o avisa que no fue presentado", () => {
    const { rerender } = render(<DatosPersonales alumno={crearFicha()} />);
    expect(screen.getByText("Presentado el 10/03/2026")).toBeInTheDocument();

    rerender(<DatosPersonales alumno={crearFicha({ aptoMedico: false, fechaAptoMedico: null })} />);
    expect(screen.getByText("No presentado")).toBeInTheDocument();
  });
});
