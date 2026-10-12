import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { enlacesDeContacto, enlaceInstagram, enlaceWhatsAppConMensaje } from "@/features/publico/utils/contacto";
import { Contacto } from "../contacto";

describe("enlaces de contacto", () => {
  it("enlaceInstagram acepta el usuario con o sin @ y rechaza lo que no es un usuario", () => {
    expect(enlaceInstagram("@fr.entrenamiento")).toBe("https://www.instagram.com/fr.entrenamiento/");
    expect(enlaceInstagram("fr_centro")).toBe("https://www.instagram.com/fr_centro/");
    expect(enlaceInstagram("https://evil.com")).toBeNull();
    expect(enlaceInstagram("")).toBeNull();
    expect(enlaceInstagram(undefined)).toBeNull();
  });

  it("enlaceWhatsAppConMensaje arma wa.me con el mensaje solo si el número es internacional", () => {
    expect(enlaceWhatsAppConMensaje("+54 9 379 412-3456")).toBe(
      "https://wa.me/5493794123456?text=Hola!%20Quiero%20sumarme%20a%20FR%20Centro%20de%20Entrenamiento.",
    );
    expect(enlaceWhatsAppConMensaje("379 412-3456")).toBeNull();
    expect(enlaceWhatsAppConMensaje(undefined)).toBeNull();
  });

  it("enlacesDeContacto los toma de las variables de entorno", () => {
    expect(enlacesDeContacto({ VITE_INSTAGRAM_USUARIO: "fr_centro" })).toEqual({
      instagram: "https://www.instagram.com/fr_centro/",
      whatsapp: null,
    });
  });
});

describe("Contacto", () => {
  it("ofrece escribir por WhatsApp y ver el Instagram, en otra pestaña", () => {
    render(<Contacto enlaces={{ whatsapp: "https://wa.me/5493794123456", instagram: "https://www.instagram.com/fr/" }} />);

    const whatsapp = screen.getByRole("link", { name: "Escribinos por WhatsApp" });
    expect(whatsapp).toHaveAttribute("href", "https://wa.me/5493794123456");
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Seguinos en Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/fr/",
    );
  });

  it("muestra solo el botón que está configurado", () => {
    render(<Contacto enlaces={{ whatsapp: null, instagram: "https://www.instagram.com/fr/" }} />);

    expect(screen.queryByRole("link", { name: "Escribinos por WhatsApp" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seguinos en Instagram" })).toBeInTheDocument();
  });

  it("no aparece si no hay ningún contacto configurado", () => {
    const { container } = render(<Contacto enlaces={{ whatsapp: null, instagram: null }} />);

    expect(container).toBeEmptyDOMElement();
  });
});
