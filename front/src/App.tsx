import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { GoogleLoginButton } from "./features/usuario/components/google-login-button";
import { AppLayout } from "./layouts/AppLayout";

function MainContent() {
  const { sesion, cargando } = useAuth();

  if (cargando) {
    return (
      <div
        className="loading-state"
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <span className="spinner" />
        <span style={{ marginLeft: "12px", fontWeight: 600 }}>Cargando MiFR...</span>
      </div>
    );
  }

  return sesion ? <AppLayout /> : <GoogleLoginButton />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
