import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  darDeBajaDispositivo,
  obtenerClavePushPublica,
  suscribirDispositivo,
} from "@/features/notificaciones/api/push-api";
import { AvisosEnEsteCelular } from "../avisos-en-este-celular";

vi.mock("@/features/notificaciones/api/push-api", () => ({
  obtenerClavePushPublica: vi.fn(),
  suscribirDispositivo: vi.fn(),
  darDeBajaDispositivo: vi.fn(),
}));

const CLAVE = "AQID";
const SUSCRIPCION_JSON = { endpoint: "https://fcm.googleapis.com/fcm/send/a", keys: { p256dh: "p", auth: "a" } };

// Un navegador con push: el service worker registrado, su PushManager y el permiso de notificaciones.
interface SuscripcionFalsa {
  endpoint: string;
  toJSON: () => unknown;
  unsubscribe: ReturnType<typeof vi.fn>;
}

function navegadorConPush({ permiso = "default", suscripto = false, registrado = true } = {}) {
  let suscripcion: SuscripcionFalsa | null = null;
  const nueva = (): SuscripcionFalsa => ({
    endpoint: SUSCRIPCION_JSON.endpoint,
    toJSON: () => SUSCRIPCION_JSON,
    unsubscribe: vi.fn(async () => {
      suscripcion = null;
      return true;
    }),
  });
  if (suscripto) suscripcion = nueva();
  const pushManager = {
    getSubscription: vi.fn(async () => suscripcion),
    subscribe: vi.fn(async () => {
      suscripcion = nueva();
      return suscripcion;
    }),
  };
  const notification = { permission: permiso, requestPermission: vi.fn(async () => "granted") };
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", notification);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: vi.fn(async () => (registrado ? { pushManager } : undefined)) },
  });
  return { pushManager, notification, suscripcion: () => suscripcion };
}

function renderTarjeta() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AvisosEnEsteCelular />
    </QueryClientProvider>,
  );
}

describe("AvisosEnEsteCelular", () => {
  beforeEach(() => {
    vi.mocked(obtenerClavePushPublica).mockReset().mockResolvedValue(CLAVE);
    vi.mocked(suscribirDispositivo).mockReset().mockResolvedValue();
    vi.mocked(darDeBajaDispositivo).mockReset().mockResolvedValue();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("en un navegador sin push explica que los avisos están en la campana, sin botón", () => {
    renderTarjeta();

    expect(screen.getByText(/Este navegador no puede recibir avisos/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("en un iPhone desde Safari pide agregar MiFR a la pantalla de inicio", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");

    renderTarjeta();

    expect(screen.getByText(/agregá MiFR a la pantalla de inicio/)).toBeInTheDocument();
  });

  it("sin claves VAPID en el back dice que no está disponible", async () => {
    navegadorConPush();
    vi.mocked(obtenerClavePushPublica).mockResolvedValue(null);

    renderTarjeta();

    expect(await screen.findByText(/no están disponibles por ahora/)).toBeInTheDocument();
  });

  it("con las notificaciones bloqueadas explica cómo permitirlas", async () => {
    navegadorConPush({ permiso: "denied" });

    renderTarjeta();

    expect(await screen.findByText(/Bloqueaste las notificaciones/)).toBeInTheDocument();
  });

  it("activar pide el permiso, suscribe con la clave del back y le manda la suscripción", async () => {
    const { pushManager, notification } = navegadorConPush();
    renderTarjeta();

    fireEvent.click(await screen.findByRole("button", { name: "Activar avisos" }));

    expect(await screen.findByRole("button", { name: "Desactivar avisos" })).toBeInTheDocument();
    expect(notification.requestPermission).toHaveBeenCalled();
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    expect(suscribirDispositivo).toHaveBeenCalledWith(SUSCRIPCION_JSON);
  });

  it("si la persona no da el permiso, avisa por qué y no suscribe", async () => {
    const { notification, pushManager } = navegadorConPush();
    notification.requestPermission.mockResolvedValue("denied");
    renderTarjeta();

    fireEvent.click(await screen.findByRole("button", { name: "Activar avisos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sin el permiso de notificaciones");
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("sin service worker registrado (desarrollo) avisa que es de la versión publicada", async () => {
    navegadorConPush({ registrado: false });
    renderTarjeta();

    fireEvent.click(await screen.findByRole("button", { name: "Activar avisos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("versión publicada");
  });

  it("si el back rechaza la suscripción muestra un mensaje general", async () => {
    navegadorConPush();
    vi.mocked(suscribirDispositivo).mockRejectedValue(new Error("Network Error"));
    renderTarjeta();

    fireEvent.click(await screen.findByRole("button", { name: "Activar avisos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cambiar los avisos de este celular");
  });

  it("desactivar da de baja el dispositivo en el back y en el navegador", async () => {
    const { suscripcion } = navegadorConPush({ suscripto: true, permiso: "granted" });
    const actual = suscripcion();
    renderTarjeta();

    fireEvent.click(await screen.findByRole("button", { name: "Desactivar avisos" }));

    expect(await screen.findByRole("button", { name: "Activar avisos" })).toBeInTheDocument();
    expect(darDeBajaDispositivo).toHaveBeenCalledWith(SUSCRIPCION_JSON.endpoint);
    expect(actual?.unsubscribe).toHaveBeenCalled();
  });
});
