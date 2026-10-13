import { lazy, Suspense, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DesktopAuthPanel } from "@/features/auth/components/desktop-auth-panel";
import { GisOfficialOverlay } from "@/features/auth/components/gis-official-overlay";
import { LoginHero } from "@/features/auth/components/login-hero";
import { MobileAuthView } from "@/features/auth/components/mobile-auth-view";
import { LoginDesarrolloPanel } from "@/features/auth/components/login-desarrollo-panel";
import { VolverAlInicio } from "@/features/auth/components/volver-al-inicio";
import { mapLoginError, useLogin, type LoginVariables } from "@/features/auth/hooks/use-login";
import { homePathForRoles, type AuthErrorCode } from "@/types/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
// Contra el back real requiere LOGIN_DESARROLLO=true en el back; con mocks muestra el selector de usuarios.
const LOGIN_DESARROLLO = import.meta.env.VITE_LOGIN_DESARROLLO === "true";

function useLoginFlow() {
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const loginMutation = useLogin();
  const navigate = useNavigate();

  async function startLogin(obtenerCredencial: () => Promise<LoginVariables>) {
    setErrorCode(null);
    let credencial: LoginVariables;
    try {
      credencial = await obtenerCredencial();
    } catch {
      setErrorCode("POPUP_BLOQUEADO");
      return;
    }
    try {
      // Sin toast de bienvenida: llegar al inicio, con el nombre en el menú, ya confirma el ingreso.
      const user = await loginMutation.mutateAsync(credencial);
      navigate(homePathForRoles(user.roles), { replace: true });
    } catch (error) {
      setErrorCode(mapLoginError(error));
    }
  }

  function cancelLogin() {
    if (!loginMutation.isPending) setErrorCode("POPUP_CANCELADO");
  }

  function clearError() {
    if (!loginMutation.isPending) setErrorCode(null);
  }

  return {
    errorCode,
    isLoading: loginMutation.isPending,
    startLogin,
    cancelLogin,
    clearError,
  };
}

type Flow = ReturnType<typeof useLoginFlow>;

function LoginLayout({ flow, onLogin, overlay }: { flow: Flow; onLogin: () => void; overlay?: ReactNode }) {
  return (
    <main className="min-h-dvh w-full overflow-x-clip bg-canvas">
      <div className="lg:hidden">
        <MobileAuthView
          errorCode={flow.errorCode}
          isLoading={flow.isLoading}
          onLogin={onLogin}
          onRetry={onLogin}
          onClear={flow.clearError}
          overlay={overlay}
        />
      </div>

      <div className="hidden h-dvh w-full lg:block">
        <div className="relative flex h-full w-full bg-white dark:bg-surface-low">
          <LoginHero />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 z-10 -translate-x-1/2">
            <div className="h-full w-px bg-gradient-to-b from-transparent via-primary/25 to-transparent" />
            <div className="absolute inset-y-0 -left-8 w-16 bg-gradient-to-r from-transparent via-primary/[0.06] to-transparent blur-lg" />
          </div>
          <DesktopAuthPanel
            errorCode={flow.errorCode}
            isLoading={flow.isLoading}
            onLogin={onLogin}
            onRetry={onLogin}
            onClear={flow.clearError}
            overlay={overlay}
          />
        </div>
      </div>
    </main>
  );
}

// Solo se pide con VITE_USE_MOCKS: así el selector de usuarios de prueba no entra al build real.
const LoginMocksPanel = lazy(() => import("@/features/auth/components/login-mocks-panel"));

// Con mocks se elige un perfil de la semilla, sin depender de la configuración del login de desarrollo.
function MockUserPickerPage() {
  const flow = useLoginFlow();
  return (
    <Suspense fallback={null}>
      <LoginMocksPanel
        errorCode={flow.errorCode}
        isLoading={flow.isLoading}
        onSelect={(email) => void flow.startLogin(() => Promise.resolve({ email }))}
      />
    </Suspense>
  );
}

function GoogleLoginInner() {
  const flow = useLoginFlow();
  // La credencial (ID token JWT) la emite el botón oficial de GIS, montado
  // invisible sobre nuestro botón Stitch. El back la verifica con verifyIdToken.
  const overlay = (
    <GisOfficialOverlay
      onCredential={(credential) => void flow.startLogin(() => Promise.resolve({ idToken: credential }))}
      onError={() => flow.cancelLogin()}
    />
  );
  return <LoginLayout flow={flow} onLogin={() => undefined} overlay={overlay} />;
}

function LoginDesarrolloPage() {
  const flow = useLoginFlow();
  return (
    <LoginDesarrolloPanel
      errorCode={flow.errorCode}
      isLoading={flow.isLoading}
      onSubmit={(email) => void flow.startLogin(() => Promise.resolve({ email }))}
    />
  );
}

function VarianteDeLogin() {
  if (USE_MOCKS) return <MockUserPickerPage />;
  if (LOGIN_DESARROLLO) return <LoginDesarrolloPage />;
  if (!GOOGLE_CLIENT_ID) return <LoginSinConfigurar />;
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleLoginInner />
    </GoogleOAuthProvider>
  );
}

// Sin client ID de Google y sin login de desarrollo no hay forma de entrar contra el back:
// mejor decirlo que mostrar un botón que siempre falla.
function LoginSinConfigurar() {
  return (
    <main className="flex h-dvh items-center justify-center bg-canvas px-4">
      <Alert
        variant="destructive"
        className="max-w-md rounded-2xl border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 [&>svg]:text-amber-600"
      >
        <AlertTitle>Falta configurar el login</AlertTitle>
        <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">
          Definí <code>VITE_GOOGLE_CLIENT_ID</code>, o en desarrollo{" "}
          <code>VITE_LOGIN_DESARROLLO=true</code> (con <code>LOGIN_DESARROLLO=true</code> en el back) o{" "}
          <code>VITE_USE_MOCKS=true</code>.
        </AlertDescription>
      </Alert>
    </main>
  );
}

export function LoginPage() {
  return (
    <>
      <VolverAlInicio />
      <VarianteDeLogin />
    </>
  );
}
