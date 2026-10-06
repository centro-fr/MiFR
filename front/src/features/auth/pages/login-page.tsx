import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { toast } from "react-toastify";
import { ContactModal } from "@/components/modals/contact-modal";
import { LegalModal } from "@/components/modals/legal-modal";
import { DesktopAuthPanel } from "@/features/auth/components/desktop-auth-panel";
import { GisOfficialOverlay } from "@/features/auth/components/gis-official-overlay";
import { LoginHero } from "@/features/auth/components/login-hero";
import { MobileAuthView } from "@/features/auth/components/mobile-auth-view";
import { mapLoginError, useLogin } from "@/features/auth/hooks/use-login";
import type { LegalModalType } from "@/features/auth/schemas/contact";
import { homePathForRoles, type AuthErrorCode } from "@/types/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

function useLoginFlow() {
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [legalType, setLegalType] = useState<LegalModalType>(null);
  const loginMutation = useLogin();
  const navigate = useNavigate();

  async function startLogin(getToken: () => Promise<string>) {
    setErrorCode(null);
    let idToken: string;
    try {
      idToken = await getToken();
    } catch {
      setErrorCode("POPUP_BLOQUEADO");
      return;
    }
    try {
      const user = await loginMutation.mutateAsync({ idToken });
      toast.success(`Bienvenido, ${user.nombre}`);
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
    isContactOpen,
    setIsContactOpen,
    legalType,
    setLegalType,
    startLogin,
    cancelLogin,
    clearError,
  };
}

type Flow = ReturnType<typeof useLoginFlow>;

function LoginLayout({ flow, onLogin, overlay }: { flow: Flow; onLogin: () => void; overlay?: ReactNode }) {
  return (
    <main className="h-dvh w-full overflow-x-clip bg-canvas">
      <div className="lg:hidden">
        <MobileAuthView
          errorCode={flow.errorCode}
          isLoading={flow.isLoading}
          onLogin={onLogin}
          onRetry={onLogin}
          onClear={flow.clearError}
          onContact={() => flow.setIsContactOpen(true)}
          onOpenLegal={(type) => flow.setLegalType(type)}
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
            onContact={() => flow.setIsContactOpen(true)}
            onOpenLegal={(type) => flow.setLegalType(type)}
            overlay={overlay}
          />
        </div>
      </div>

      <ContactModal isOpen={flow.isContactOpen} onClose={() => flow.setIsContactOpen(false)} />
      <LegalModal type={flow.legalType} onClose={() => flow.setLegalType(null)} />
    </main>
  );
}

function MockLoginPage() {
  const flow = useLoginFlow();
  return <LoginLayout flow={flow} onLogin={() => void flow.startLogin(() => Promise.resolve("mock-google-id-token"))} />;
}

function GoogleLoginInner() {
  const flow = useLoginFlow();
  // La credencial (ID token JWT) la emite el botón oficial de GIS, montado
  // invisible sobre nuestro botón Stitch. El back la verifica con verifyIdToken.
  const overlay = (
    <GisOfficialOverlay
      onCredential={(credential) => void flow.startLogin(() => Promise.resolve(credential))}
      onError={() => flow.cancelLogin()}
    />
  );
  return <LoginLayout flow={flow} onLogin={() => undefined} overlay={overlay} />;
}

export function LoginPage() {
  if (USE_MOCKS || !GOOGLE_CLIENT_ID) {
    return <MockLoginPage />;
  }
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleLoginInner />
    </GoogleOAuthProvider>
  );
}
