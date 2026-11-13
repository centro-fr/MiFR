import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MiniaturaEjercicio } from "../miniatura-ejercicio";

const COMMIT_DEL_CATALOGO = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd";
const GIF = "videos/0043-qXTaZnJ.gif";

describe("MiniaturaEjercicio", () => {
  it("carga el GIF del CDN fijado al commit del catálogo, no a una rama que puede cambiar", () => {
    render(<MiniaturaEjercicio nombre="Sentadilla con barra" gifUrl={GIF} className="size-10" />);

    expect(screen.getByRole("img", { name: "Sentadilla con barra" })).toHaveAttribute(
      "src",
      `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@${COMMIT_DEL_CATALOGO}/${GIF}`,
    );
  });

  it("si el CDN falla, usa el respaldo de GitHub fijado al mismo commit", () => {
    render(<MiniaturaEjercicio nombre="Sentadilla con barra" gifUrl={GIF} className="size-10" />);
    const imagen = screen.getByRole("img", { name: "Sentadilla con barra" });

    fireEvent.error(imagen);

    expect(imagen).toHaveAttribute(
      "src",
      `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${COMMIT_DEL_CATALOGO}/${GIF}`,
    );
  });

  it("sin GIF muestra las iniciales del ejercicio", () => {
    render(<MiniaturaEjercicio nombre="plancha lateral" className="size-10" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("PL")).toBeInTheDocument();
  });
});
