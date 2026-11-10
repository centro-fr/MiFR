import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth-provider";
import { useAuth } from "../use-auth";
import * as authApi from "@/features/auth/api/auth-api";
import { clearSessionToken, getStoredAvatarUrl } from "@/features/auth/api/session-token";

vi.mock("@/features/auth/api/auth-api", () => ({
  getMe: vi.fn(),
  postGoogleLogin: vi.fn(),
  postLoginDesarrollo: vi.fn(),
  postLogout: vi.fn(),
}));

function crearMockJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const payloadBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${payloadBase64}.signature`;
}

function ConsumidorAuth() {
  const { user, login, logout, isLoading } = useAuth();
  if (isLoading) return <div>Cargando...</div>;
  return (
    <div>
      <span data-testid="user-name">{user ? `${user.nombre} ${user.apellido}` : "Sin usuario"}</span>
      <span data-testid="user-photo">{user?.fotoUrl ?? "Sin foto"}</span>
      <button
        onClick={() => {
          const token = crearMockJwt({
            sub: "123",
            email: "valen@example.com",
            picture: "https://lh3.googleusercontent.com/avatar-test.jpg",
          });
          void login(token);
        }}
      >
        Login con Google
      </button>
      <button onClick={() => void logout()}>Logout</button>
    </div>
  );
}

describe("AuthProvider con perfil de Google", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    clearSessionToken();
    window.sessionStorage.clear();
  });

  it("al loguear con Google guarda la URL de la foto de perfil en la sesión y en el usuario", async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(new Error("No hay sesión"));
    vi.mocked(authApi.postGoogleLogin).mockResolvedValue({
      token: "jwt-sesion",
      usuario: {
        id_usuario: 1,
        email: "valen@example.com",
        nombre: "Valentina",
        apellido: "López",
        roles: ["ALUMNO"],
        permisos: [],
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConsumidorAuth />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Sin usuario")).toBeInTheDocument();

    await act(async () => {
      screen.getByText("Login con Google").click();
    });

    expect(screen.getByTestId("user-photo")).toHaveTextContent("https://lh3.googleusercontent.com/avatar-test.jpg");
    expect(getStoredAvatarUrl()).toBe("https://lh3.googleusercontent.com/avatar-test.jpg");
  });

  it("al restaurar la sesión con getMe asocia la foto almacenada", async () => {
    window.sessionStorage.setItem("mifr:user-avatar:v1", "https://lh3.googleusercontent.com/foto-guardada.jpg");
    vi.mocked(authApi.getMe).mockResolvedValue({
      id_usuario: 1,
      email: "valen@example.com",
      nombre: "Valentina",
      apellido: "López",
      roles: ["ALUMNO"],
      permisos: [],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConsumidorAuth />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Valentina López")).toBeInTheDocument();
    expect(screen.getByTestId("user-photo")).toHaveTextContent("https://lh3.googleusercontent.com/foto-guardada.jpg");
  });

  it("al hacer logout limpia la foto almacenada en sessionStorage", async () => {
    window.sessionStorage.setItem("mifr:user-avatar:v1", "https://lh3.googleusercontent.com/foto.jpg");
    vi.mocked(authApi.getMe).mockResolvedValue({
      id_usuario: 1,
      email: "valen@example.com",
      nombre: "Valentina",
      apellido: "López",
      roles: ["ALUMNO"],
      permisos: [],
    });
    vi.mocked(authApi.postLogout).mockResolvedValue();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConsumidorAuth />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Valentina López")).toBeInTheDocument();

    await act(async () => {
      screen.getByText("Logout").click();
    });

    expect(screen.getByTestId("user-name")).toHaveTextContent("Sin usuario");
    expect(getStoredAvatarUrl()).toBeNull();
  });
});
