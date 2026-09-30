import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import { ContactModal } from "@/components/modals/contact-modal";
import { LegalModal } from "@/components/modals/legal-modal";
import { DesktopAuthPanel } from "@/features/auth/components/desktop-auth-panel";
import { LoginHero } from "@/features/auth/components/login-hero";
import { MobileAuthView } from "@/features/auth/components/mobile-auth-view";
import { mapLoginError, useLogin } from "@/features/auth/hooks/use-login";
import type { LegalModalType } from "@/features/auth/schemas/contact";
import { homePathForRoles, type AuthErrorCode } from "@/types/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

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

  return {
    errorCode,
    isLoading: loginMutation.isPending,
    isContactOpen,
    setIsContactOpen,
    legalType,
    setLegalType,
    startLogin,
    cancelLogin,
  };
}

type Flow = ReturnType<typeof useLoginFlow>;

function LoginLayout({ flow, onLogin }: { flow: Flow; onLogin: () => void }) {
  return (
    <main className="min-h-dvh bg-canvas">
      <div className="lg:hidden">
        <MobileAuthView
          errorCode={flow.errorCode}
          isLoading={flow.isLoading}
          onLogin={onLogin}
          onRetry={onLogin}
          onContact={() => flow.setIsContactOpen(true)}
          onOpenLegal={(type) => flow.setLegalType(type)}
        />
      </div>

      <div className="mx-auto hidden max-w-[1440px] lg:block lg:px-6 lg:py-8">
        <div className="flex min-h-[760px] overflow-hidden rounded-3xl border border-white/10 bg-dark shadow-2xl">
          <LoginHero />
          <DesktopAuthPanel
            errorCode={flow.errorCode}
            isLoading={flow.isLoading}
            onLogin={onLogin}
            onRetry={onLogin}
            onContact={() => flow.setIsContactOpen(true)}
            onOpenLegal={(type) => flow.setLegalType(type)}
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
  const googleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: (response) => void flow.startLogin(() => Promise.resolve(response.access_token)),
    onError: () => flow.cancelLogin(),
  });
  return <LoginLayout flow={flow} onLogin={() => googleLogin()} />;
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
