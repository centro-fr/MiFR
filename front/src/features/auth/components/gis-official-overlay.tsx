import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

interface GisOfficialOverlayProps {
  onCredential: (credential: string) => void;
  onError: () => void;
}

// Botón oficial de Google sobre nuestro botón visual (Stitch).
// Accesible: el contenedor NO usa aria-hidden porque contiene el botón real
// que recibe foco. El botón visual queda aria-hidden para evitar doble tab.
export function GisOfficialOverlay({ onCredential, onError }: GisOfficialOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let raf = 0;
    let last = 0;
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0);
      // Evita remounts del iframe de Google ante cambios de 1-2px.
      if (Math.abs(next - last) < 8 || next <= 0) return;
      last = next;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(next));
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-0 focus-within:opacity-100 focus-within:outline-2 focus-within:outline-primary"
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
