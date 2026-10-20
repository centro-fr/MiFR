import { create } from "zustand";
import type { Panel } from "@/components/layout/owner-navigation";

interface PanelState {
  /** Último panel que eligió (con el switch) o al que entró quien es propietaria y profesora. */
  panelElegido: Panel | null;
  elegirPanel: (panel: Panel) => void;
}

// Cada página monta su propio OwnerLayout: si el panel viviera en su estado, se perdería al navegar.
export const usePanelStore = create<PanelState>((set) => ({
  panelElegido: null,
  elegirPanel: (panel) => set({ panelElegido: panel }),
}));
