import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CircleUserRound, X } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { LogoFr } from "@/components/marca/logo-fr";
import { Dialog, DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { USUARIOS_SEMILLA, type UsuarioSemilla } from "@/mocks/data/semilla";
import type { RoleCode } from "@/types/auth";
import { cn } from "@/utils/cn";

interface Props {
  onCerrar: () => void;
  onElegir: (email: string) => void;
  /** Contra el back real puede haber usuarios fuera de la semilla: si se pasa, ofrece escribir otro email. */
  onUsarOtraCuenta?: () => void;
}

const CLASES_FILA =
  "flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-[#f1f3f4] " +
  "focus-visible:bg-[#f1f3f4] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1a73e8]";

const ORDEN_ROL: RoleCode[] = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"];

const NOMBRE_ROL: Record<RoleCode, string> = {
  PROPIETARIA: "Propietaria",
  PROFESORA: "Profesora",
  ALUMNO: "Alumno",
  TUTOR: "Tutor",
};

// Colores de avatar con contraste suficiente para la inicial en blanco.
const COLORES_DE_AVATAR = ["#e91e82", "#1e8e3e", "#1a73e8", "#c26401", "#9334e6", "#12868c", "#c5221f"];

function etiquetaDePerfil({ roles, etiquetaDePrueba }: UsuarioSemilla): string {
  return etiquetaDePrueba ?? roles.map((rol) => NOMBRE_ROL[rol]).join(" + ");
}

function rangoDePerfil({ roles }: UsuarioSemilla): number {
  return Math.min(...roles.map((rol) => ORDEN_ROL.indexOf(rol)));
}

// Un usuario representante por combinación de roles: lo que cambia el menú y los permisos es
// el perfil, no la persona. Los que tienen una etiqueta de prueba (un caso puntual, como el tutor con
// varios menores) se ofrecen aparte aunque compartan los roles.
function perfilesDeLaSemilla(): UsuarioSemilla[] {
  const porRoles = new Map<string, UsuarioSemilla>();
  for (const usuario of USUARIOS_SEMILLA) {
    const clave = usuario.etiquetaDePrueba ?? [...usuario.roles].sort().join("+");
    if (!porRoles.has(clave)) porRoles.set(clave, usuario);
  }
  return [...porRoles.values()].sort((a, b) => rangoDePerfil(a) - rangoDePerfil(b));
}

const PERFILES = perfilesDeLaSemilla();

function CuentaDePrueba({ perfil, color, onElegir }: { perfil: UsuarioSemilla; color: string; onElegir: () => void }) {
  return (
    <li className="border-t border-[#dadce0]">
      <button
        type="button"
        onClick={onElegir}
        className={CLASES_FILA}
      >
        <span
          aria-hidden="true"
          style={{ backgroundColor: color }}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
        >
          {perfil.nombre[0]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-5 font-medium">
            {perfil.nombre} {perfil.apellido}
          </span>
          <span className="block truncate text-sm leading-5 text-[#5f6368]">{perfil.email}</span>
          <span className="mt-0.5 block text-sm leading-5 text-[#bc1266]">{etiquetaDePerfil(perfil)}</span>
        </span>
      </button>
    </li>
  );
}

// Solo en mocks y en el login de desarrollo: imita el selector de cuentas de Google con un usuario por
// perfil de la semilla (la misma que siembra el back), así se prueba el mismo recorrido que en producción.
// Se carga diferido para que no viaje en el build real.
export default function SelectorCuentasDePrueba({ onCerrar, onElegir, onUsarOtraCuenta }: Props) {
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(15,19,29,0.55)] backdrop-blur-none" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 overflow-y-auto bg-white font-[Roboto,Arial,sans-serif] text-[#202124] focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[calc(100dvh-4rem)] md:w-[450px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border md:border-[#dadce0] md:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2.5 border-b border-[#dadce0] py-1.5 pr-1.5 pl-4 text-sm text-[#5f6368]">
            <GoogleIcon className="size-[18px] shrink-0" />
            <span className="flex-1">Acceder con Google</span>
            <DialogClose
              aria-label="Cerrar"
              className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-[#f1f3f4] focus-visible:outline-2 focus-visible:outline-[#1a73e8]"
            >
              <X aria-hidden="true" className="size-[18px]" />
            </DialogClose>
          </div>

          <div className="pt-8 pb-2 text-center">
            <LogoFr className="mx-auto size-9" />
            <DialogTitle className="mt-3 text-2xl leading-8 font-normal">Elegí una cuenta</DialogTitle>
            <p className="mt-1.5 text-base">
              para ir a <span className="font-medium text-[#1a73e8]">MiFR</span>
            </p>
          </div>

          <ul className="mt-4 border-b border-[#dadce0]">
            {PERFILES.map((perfil, indice) => (
              <CuentaDePrueba
                key={perfil.id_usuario}
                perfil={perfil}
                color={COLORES_DE_AVATAR[indice % COLORES_DE_AVATAR.length]}
                onElegir={() => onElegir(perfil.email)}
              />
            ))}
            {onUsarOtraCuenta && (
              <li className="border-t border-[#dadce0]">
                <button type="button" onClick={onUsarOtraCuenta} className={cn(CLASES_FILA, "text-sm font-medium text-[#3c4043]")}>
                  <CircleUserRound aria-hidden="true" strokeWidth={1.8} className="size-8 shrink-0 text-[#5f6368]" />
                  Usar otra cuenta
                </button>
              </li>
            )}
          </ul>

          <DialogDescription className="px-6 pt-5 pb-6 text-sm leading-5 text-[#5f6368]">
            Cuentas de prueba de la semilla de datos. Elegí una para entrar con ese perfil.
          </DialogDescription>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
