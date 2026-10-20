import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { usePanelStore } from "@/stores/panel-store";
import type { RoleCode } from "@/types/auth";
import { panelExclusivoDeLaRuta, rolPrincipal } from "./owner-navigation";

/**
 * El panel del menú en uso. Quien es propietaria y profesora alterna entre los dos con el switch;
 * el resto tiene un solo panel, el de su rol de más alcance.
 */
export function usePanelActivo() {
  const { pathname } = useLocation();
  const { hasRole } = usePermissions();
  const panelElegido = usePanelStore((estado) => estado.panelElegido);
  const elegirPanel = usePanelStore((estado) => estado.elegirPanel);
  const tieneLosDosPaneles = hasRole("PROPIETARIA") && hasRole("PROFESORA");
  const panelDeLaRuta = tieneLosDosPaneles ? panelExclusivoDeLaRuta(pathname) : null;

  // Entrar a una pantalla de un solo panel (por su menú o con "atrás") la deja elegida: así una
  // pantalla compartida, como Alumnos, se abre en el panel desde el que se llegó.
  useEffect(() => {
    if (panelDeLaRuta) elegirPanel(panelDeLaRuta);
  }, [panelDeLaRuta, elegirPanel]);

  const panelActivo: RoleCode | undefined = tieneLosDosPaneles
    ? (panelDeLaRuta ?? panelElegido ?? "PROPIETARIA")
    : rolPrincipal(hasRole);
  return { panelActivo, tieneLosDosPaneles, elegirPanel };
}
