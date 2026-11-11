import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { FilaDeDetalle, ListaDeDetalle } from "@/components/detalle/lista-de-detalle";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import {
  BotonModalPrincipal,
  BotonModalSecundario,
  ModalCabecera,
  ModalContenido,
  ModalCuerpo,
  ModalPie,
} from "@/components/ui/estructura-modal";
import type { Horario } from "@/types/horarios";

interface Props {
  horario: Horario | null;
  abierto: boolean;
  onClose: () => void;
}

const NOMBRES_DIAS: Record<string, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

export function ModalDetalleClaseProfesor({ horario, abierto, onClose }: Props) {
  if (!horario) return null;

  const esPersonalizada = horario.actividadTipo === "PERSONALIZADA";

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <ModalContenido ancho="md">
        <ModalCabecera titulo={horario.actividadNombre} descripcion="Detalle de la clase semanal" />
        <ModalCuerpo>
          <ListaDeDetalle>
            <FilaDeDetalle etiqueta="Tipo">
              <Badge
                variant="outline"
                className={
                  esPersonalizada
                    ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                    : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                }
              >
                {esPersonalizada ? "Personalizada" : "Grupal"}
              </Badge>
            </FilaDeDetalle>
            <FilaDeDetalle etiqueta="Día">{NOMBRES_DIAS[horario.diaSemana] || horario.diaSemana}</FilaDeDetalle>
            <FilaDeDetalle etiqueta="Horario">
              {horario.horaInicio} a {horario.horaFin} hs
            </FilaDeDetalle>
            <FilaDeDetalle etiqueta="Capacidad máxima">
              {horario.cupoMaximo ? `${horario.cupoMaximo} personas` : "Sin cupo límite configurado"}
              {horario.cupoPropio && (
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  Cupo específico del horario: {horario.cupoPropio}
                </span>
              )}
            </FilaDeDetalle>
            <FilaDeDetalle etiqueta="Profesor/a a cargo">{horario.profesoraNombre}</FilaDeDetalle>
          </ListaDeDetalle>
        </ModalCuerpo>
        <ModalPie>
          <BotonModalSecundario onClick={onClose}>Cerrar</BotonModalSecundario>
          <BotonModalPrincipal asChild>
            <Link to="/app/hoy">
              Ir a clases de hoy
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </BotonModalPrincipal>
        </ModalPie>
      </ModalContenido>
    </Dialog>
  );
}
