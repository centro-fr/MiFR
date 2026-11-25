import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Paso1DatosPersonales } from "../Paso1DatosPersonales";
import { VALOR_INICIAL_ALUMNO } from "../../../hooks/use-preinscripcion";
import type { AlumnoFormData } from "../../../schemas/alumno.schema";

function PasoConEstado() {
  const [datos, setDatos] = useState<AlumnoFormData>(VALOR_INICIAL_ALUMNO);
  return (
    <Paso1DatosPersonales
      datos={datos}
      onChange={setDatos}
      errores={{}}
      onRevisarCampo={() => undefined}
      edadCalculada={null}
      menorDeEdad={false}
    />
  );
}

describe("Paso1DatosPersonales", () => {
  it("muestra la dirección y el apto médico como campos opcionales, sin desplegar nada", () => {
    render(<PasoConEstado />);

    expect(screen.getByLabelText(/Dirección/)).toBeInTheDocument();
    expect(screen.getByText("Dirección").parentElement).toHaveTextContent("Dirección (opcional)");
    expect(screen.getByRole("switch", { name: /Apto médico \(opcional\)/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Observaciones o antecedentes médicos/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Dirección y salud/ })).not.toBeInTheDocument();
  });

  it("pide la fecha de emisión solo cuando se marca el apto médico", () => {
    render(<PasoConEstado />);
    expect(screen.queryByText(/Fecha de emisión del apto/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /Apto médico/ }));

    expect(screen.getByText(/Fecha de emisión del apto/)).toBeInTheDocument();
  });
});
