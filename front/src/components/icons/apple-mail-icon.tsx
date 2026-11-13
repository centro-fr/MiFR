/**
 * Icono oficial de Apple Mail en iOS (squircle azul #007AFF con sobre blanco y pliegues visibles).
 */
export function AppleMailIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5.4" fill="#007AFF" />
      <rect x="4.5" y="7" width="15" height="10" rx="1.5" fill="#FFFFFF" />
      <path
        d="M4.8 7.6L12 12.8L19.2 7.6"
        stroke="#007AFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16.5L9.6 12.2"
        stroke="#007AFF"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
      <path
        d="M19 16.5L14.4 12.2"
        stroke="#007AFF"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
    </svg>
  );
}
