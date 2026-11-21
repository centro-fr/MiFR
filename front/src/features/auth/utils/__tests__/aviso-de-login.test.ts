import { describe, expect, it } from "vitest";
import {
  avisoDeLogin,
  ETIQUETA_CONECTANDO,
  ETIQUETA_INICIAL,
  etiquetaDelBotonGoogle,
} from "@/features/auth/utils/aviso-de-login";

// US-01: qué le dice el login a la persona según cómo terminó el intento.
describe("avisoDeLogin", () => {
  it.each(["ACCESO_NO_HABILITADO", "USUARIO_INACTIVO"] as const)(
    "%s: avisa que la cuenta no tiene acceso y ofrece usar otra",
    (code) => {
      expect(avisoDeLogin(code)).toMatchObject({ tono: "error", titulo: "Esta cuenta no tiene acceso", accion: "Usar otra cuenta" });
    },
  );

  it("si la persona cerró la ventana de Google, el aviso es neutro y el botón vuelve a su texto inicial", () => {
    expect(avisoDeLogin("POPUP_CANCELADO")).toMatchObject({ tono: "neutro", accion: ETIQUETA_INICIAL });
  });

  it.each(["RED_ERROR", "ERROR_SERVIDOR", "INVALID_GOOGLE_TOKEN", "POPUP_BLOQUEADO"] as const)(
    "%s: es un error y ofrece reintentar",
    (code) => {
      expect(avisoDeLogin(code)).toMatchObject({ tono: "error", accion: "Reintentar con Google" });
    },
  );
});

describe("etiquetaDelBotonGoogle", () => {
  it("sin error dice el texto inicial", () => {
    expect(etiquetaDelBotonGoogle(null, false)).toBe(ETIQUETA_INICIAL);
  });

  it("mientras conecta lo dice, aunque haya un error previo", () => {
    expect(etiquetaDelBotonGoogle("RED_ERROR", true)).toBe(ETIQUETA_CONECTANDO);
  });

  it("con un error toma la acción del aviso", () => {
    expect(etiquetaDelBotonGoogle("ACCESO_NO_HABILITADO", false)).toBe("Usar otra cuenta");
  });
});
