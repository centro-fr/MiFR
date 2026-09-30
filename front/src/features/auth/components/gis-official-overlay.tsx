import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

interface GisOfficialOverlayProps {
  onCredential: (credential: string) => void;
  onError: () => void;
}

// Botón oficial de Google invisible sobre nuestro botón custom (Stitch).
// Así el clic abre el popup real de GIS y recibimos la credencial (ID token JWT)
// que el back verifica con verifyIdToken. El overlay mide el ancho del botón
// para que toda la superficie central sea clickeable.
export function GisOfficialOverlay({ onCredential, onError }: GisOfficialOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-0"
    >
      {width > 0 && (
        <GoogleLogin
          onSuccess={(response) => {
            if (response.credential) onCredential(response.credential);
            else onError();
          }}
          onError={onError}
          theme="outline"
          size="large"
          text="signin_with"
          width={String(Math.min(width, 400))}
        />
      )}
    </div>
  );
}
