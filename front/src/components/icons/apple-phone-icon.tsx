/**
 * Icono oficial de Apple Teléfono en iOS (squircle verde #34C759 con auricular blanco a 45°).
 */
export function ApplePhoneIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5.4" fill="#34C759" />
      <path
        d="M16.4 14.3c-.5-.1-1.2-.4-1.6-.2-.3.1-.5.4-.7.6-.3.4-.7.8-1.2.6-.8-.3-1.6-.8-2.2-1.4-.6-.6-1.1-1.4-1.4-2.2-.2-.5.2-.9.6-1.2.2-.2.5-.4.6-.7.2-.4-.1-1.1-.2-1.6-.2-.6-.4-1.2-.6-1.8-.2-.3-.5-.4-.8-.4-.9 0-1.7.4-2.2 1.1-.7.9-.7 2.1-.4 3.2.7 2.3 2.1 4.4 3.9 6 1.8 1.6 4 2.7 6.4 3.1.9.1 1.8 0 2.6-.6.7-.6 1.1-1.4 1.1-2.4 0-.3-.1-.6-.4-.8-.6-.3-1.2-.5-1.9-.7z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
