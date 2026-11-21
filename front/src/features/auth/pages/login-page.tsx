import { lazy, Suspense, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GisOfficialOverlay } from "@/features/auth/components/gis-official-overlay";
import { LoginDesarrolloPanel } from "@/features/auth/components/login-desarrollo-panel";
import { LoginEscena } from "@/features/auth/components/login-escena";
import { LoginTarjeta } from "@/features/auth/components/login-tarjeta";
import { VolverAlInicio } from "@/features/auth/components/volver-al-inicio";
import { mapLoginError, useLogin, type LoginVariables } from "@/features/auth/hooks/use-login";
import { homePathForRoles, type AuthErrorCode } from "@/types/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
// Contra el back real requiere LOGIN_DESARROLLO=true en el back; con mocks muestra el selector de cuentas.
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

  return { errorCode, isLoading: loginMutation.isPending, startLogin, cancelLogin };
}

type Flow = ReturnType<typeof useLoginFlow>;

interface LoginLayoutProps {
  flow: Flow;
  onLogin: () => void;
  overlay?: ReactNode;
  children?: ReactNode;
}

function LoginLayout({ flow, onLogin, overlay, children }: LoginLayoutProps) {
  return (
    <LoginEscena>
      <LoginTarjeta errorCode={flow.errorCode} isLoading={flow.isLoading} onLogin={onLogin} overlay={overlay} />
      {children}
    </LoginEscena>
  );
}

// Solo se pide con VITE_USE_MOCKS: así el selector de cuentas de prueba no entra al build real.
const SelectorCuentasDePrueba = lazy(() => import("@/features/auth/components/selector-cuentas-de-prueba"));

// "Continuar con Google" abre un selector de cuentas de la semilla en lugar del de Google: el recorrido
// es el mismo que en producción. Lo comparten el login con mocks y el de desarrollo.
function useSelectorDeCuentas(flow: Flow, onUsarOtraCuenta?: () => void) {
  const [eligiendo, setEligiendo] = useState(false);

  function elegir(email: string) {
    setEligiendo(false);
    void flow.startLogin(() => Promise.resolve({ email }));
  }

  function cerrar() {
    setEligiendo(false);
    flow.cancelLogin();
  }

  function usarOtraCuenta() {
    setEligiendo(false);
    onUsarOtraCuenta?.();
  }

  const selector = eligiendo && (
    <Suspense fallback={null}>
      <SelectorCuentasDePrueba
        onCerrar={cerrar}
        onElegir={elegir}
        onUsarOtraCuenta={onUsarOtraCuenta && usarOtraCuenta}
      />
    </Suspense>
  );

  return { abrir: () => setEligiendo(true), selector };
}

function MockUserPickerPage() {
  const flow = useLoginFlow();
  const { abrir, selector } = useSelectorDeCuentas(flow);
  return (
    <LoginLayout flow={flow} onLogin={abrir}>
      {selector}
    </LoginLayout>
  );
}

function MockLoginPage() {
  const flow = useLoginFlow();
  return (
    <LoginLayout
      flow={flow}
      onLogin={() => void flow.startLogin(() => Promise.resolve({ idToken: "mock-google-id-token" }))}
    />
  );
}

function GoogleLoginInner() {
  const flow = useLoginFlow();
  // La credencial (ID token JWT) la emite el botón oficial de GIS, montado
  // invisible sobre nuestro botón. El back la verifica con verifyIdToken.
  const overlay = (
    <GisOfficialOverlay
      onCredential={(credential) => void flow.startLogin(() => Promise.resolve({ idToken: credential }))}
      onError={() => flow.cancelLogin()}
    />
  );
  return <LoginLayout flow={flow} onLogin={() => undefined} overlay={overlay} />;
}

// Contra el back real puede haber usuarios que no están en la semilla: además del selector, deja escribir el email.
function LoginDesarrolloPage() {
  const flow = useLoginFlow();
  const [escribiendoEmail, setEscribiendoEmail] = useState(false);
  const { abrir, selector } = useSelectorDeCuentas(flow, () => setEscribiendoEmail(true));
  return (
    <LoginDesarrolloPanel
      errorCode={flow.errorCode}
      isLoading={flow.isLoading}
      escribiendoEmail={escribiendoEmail}
      onElegirCuenta={abrir}
      onEscribirEmail={() => setEscribiendoEmail(true)}
      onSubmitEmail={(email) => void flow.startLogin(() => Promise.resolve({ email }))}
    >
      {selector}
    </LoginDesarrolloPanel>
  );
}

// Sin client ID de Google y sin login de desarrollo no hay forma de entrar contra el back:
// mejor decirlo que mostrar un botón que siempre falla.
function LoginSinConfigurar() {
  return (
    <>
      <VolverAlInicio />
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
    </>
  );
}

export function LoginPage() {
  if (USE_MOCKS && LOGIN_DESARROLLO) return <MockUserPickerPage />;
  if (USE_MOCKS) return <MockLoginPage />;
  if (LOGIN_DESARROLLO) return <LoginDesarrolloPage />;
  if (!GOOGLE_CLIENT_ID) return <LoginSinConfigurar />;
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleLoginInner />
    </GoogleOAuthProvider>
  );
}
