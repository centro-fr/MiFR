import { useState } from "react";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { CONTROL_FILTRO, ETIQUETA_FILTRO } from "@/features/reportes/components/piezas-reporte";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";

const FECHA_COMPLETA = /^\d{4}-\d{2}-\d{2}$/;

interface Props {
  prefijo: string;
  desde: string;
  hasta: string;
  /** Se llama recién con las dos fechas completas y en orden. */
  onCambiar: (periodo: { desde: string; hasta: string }) => void;
}

/** Desde y hasta, que se aplican solos cuando el período es válido. */
export function FiltroPeriodo({ prefijo, desde, hasta, onCambiar }: Props) {
  const hoy = fechaActualArgentina();
  const [borrador, setBorrador] = useState({ desde, hasta });
  const [error, setError] = useState<string | null>(null);
  const idError = `${prefijo}-periodo-error`;

  function cambiar(cambio: Partial<typeof borrador>) {
    const siguiente = { ...borrador, ...cambio };
    setBorrador(siguiente);
    if (!FECHA_COMPLETA.test(siguiente.desde) || !FECHA_COMPLETA.test(siguiente.hasta)) return;
    if (siguiente.hasta < siguiente.desde) {
      setError("La fecha de fin no puede ser anterior a la de inicio.");
      return;
    }
    setError(null);
    onCambiar(siguiente);
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefijo}-desde`} className={ETIQUETA_FILTRO}>
          Desde
        </label>
        <CampoFecha
          id={`${prefijo}-desde`}
          etiquetaCalendario="Abrir calendario para el inicio del período"
          max={hoy}
          value={borrador.desde}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? idError : undefined}
          onChange={(valor) => cambiar({ desde: valor })}
          className={cn(CONTROL_FILTRO, "pr-11 md:text-sm")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefijo}-hasta`} className={ETIQUETA_FILTRO}>
          Hasta
        </label>
        <CampoFecha
          id={`${prefijo}-hasta`}
          etiquetaCalendario="Abrir calendario para el fin del período"
          value={borrador.hasta}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? idError : undefined}
          onChange={(valor) => cambiar({ hasta: valor })}
          className={cn(CONTROL_FILTRO, "pr-11 md:text-sm")}
        />
        {error && (
          <p id={idError} role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
