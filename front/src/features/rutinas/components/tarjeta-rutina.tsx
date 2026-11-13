import { useState } from "react";
import { ChevronDown, Dumbbell } from "lucide-react";
import { ContenidoDeLaRutina, RutinaVigente } from "@/features/rutinas/components/detalle-rutina";
import { DialogoRutina } from "@/features/rutinas/components/dialogo-rutina";
import { BotonDeCarga, CargandoTarjeta, ErrorDeCarga, SinDatos, Tarjeta } from "@/features/rutinas/components/tarjeta";
import { useNombresDeProfesoras, useRutinasDeAlumno } from "@/features/rutinas/hooks/use-rutinas";
import { lineaDeLaRutina } from "@/features/rutinas/utils/formato-rutinas";
import type { Rutina } from "@/types/rutinas";

function RutinasAnteriores({ rutinas, nombres }: { rutinas: Rutina[]; nombres: Map<number, string> }) {
  return (
    <details className="group rounded-xl border border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-200">
        Rutinas anteriores ({rutinas.length})
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <ul className="divide-y divide-slate-100 px-3 pb-2 dark:divide-slate-800">
        {rutinas.map((rutina) => (
          <li key={rutina.id}>
            <details>
              <summary className="flex min-h-11 cursor-pointer list-none flex-col justify-center py-2 focus-visible:outline-2 focus-visible:outline-primary">
                <span className="font-semibold text-slate-900 dark:text-white">{rutina.nombre}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{lineaDeLaRutina(rutina, nombres)}</span>
              </summary>
              <div className="pb-3">
                <ContenidoDeLaRutina dias={rutina.dias} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </details>
  );
}

interface PropsTarjetaRutina {
  idAlumno: number;
  nombreAlumno: string;
  puedeCargar: boolean;
}

export function TarjetaRutina({ idAlumno, nombreAlumno, puedeCargar }: PropsTarjetaRutina) {
  const consulta = useRutinasDeAlumno(idAlumno, true);
  const nombres = useNombresDeProfesoras();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  const rutinas = consulta.data ?? [];
  const vigente = rutinas.find((rutina) => rutina.vigente) ?? null;
  const anteriores = rutinas.filter((rutina) => !rutina.vigente);
  const abrir = () => setDialogoAbierto(true);

  function contenido() {
    if (consulta.isPending) return <CargandoTarjeta etiqueta="Cargando la rutina" />;
    if (consulta.isError) {
      return (
        <ErrorDeCarga
          error={consulta.error}
          mensaje="No se pudo cargar la rutina."
          reintentando={consulta.isFetching}
          onReintentar={() => void consulta.refetch()}
        />
      );
    }
    return (
      <>
        {vigente ? (
          <RutinaVigente rutina={vigente} nombresDeProfesoras={nombres} />
        ) : (
          <SinDatos
            texto="Todavía no tiene una rutina cargada."
            accion={puedeCargar && <BotonDeCarga principal texto="Cargar rutina" onClick={abrir} />}
          />
        )}
        {anteriores.length > 0 && <RutinasAnteriores rutinas={anteriores} nombres={nombres} />}
      </>
    );
  }

  return (
    <Tarjeta
      id="titulo-rutina"
      titulo="Rutina"
      icono={Dumbbell}
      accion={puedeCargar && vigente && <BotonDeCarga texto="Cambiar rutina" onClick={abrir} />}
    >
      {contenido()}
      <DialogoRutina
        abierto={dialogoAbierto}
        idAlumno={idAlumno}
        nombreAlumno={nombreAlumno}
        vigente={vigente}
        onClose={() => setDialogoAbierto(false)}
      />
    </Tarjeta>
  );
}
