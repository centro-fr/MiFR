import { useMemo, useState } from "react";
import { Ruler } from "lucide-react";
import { ConfirmarBajaMedicion } from "@/features/rutinas/components/confirmaciones-medicion";
import { DialogoMedicion } from "@/features/rutinas/components/dialogo-medicion";
import { Evolucion, type AccionesDeMedicion } from "@/features/rutinas/components/detalle-evolucion";
import { BotonDeCarga, CargandoTarjeta, ErrorDeCarga, SinDatos, Tarjeta } from "@/features/rutinas/components/tarjeta";
import { useMedicionesDeAlumno, useNombresDeProfesoras } from "@/features/rutinas/hooks/use-rutinas";
import type { Medicion } from "@/types/rutinas";

interface PropsTarjetaEvolucion {
  idAlumno: number;
  nombreAlumno: string;
  /** También habilita corregir y dar de baja: el back pide el mismo permiso y el alumno a cargo. */
  puedeCargar: boolean;
}

export function TarjetaEvolucion({ idAlumno, nombreAlumno, puedeCargar }: PropsTarjetaEvolucion) {
  const consulta = useMedicionesDeAlumno(idAlumno, true);
  const nombres = useNombresDeProfesoras();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  // No se limpia al cerrar: así el título del diálogo no cambia mientras se va.
  const [medicionACorregir, setMedicionACorregir] = useState<Medicion | null>(null);
  const [medicionADarDeBaja, setMedicionADarDeBaja] = useState<Medicion | null>(null);

  const mediciones = useMemo(() => consulta.data ?? [], [consulta.data]);

  function abrirFormulario(medicion: Medicion | null) {
    setMedicionACorregir(medicion);
    setDialogoAbierto(true);
  }
  const abrir = () => abrirFormulario(null);
  const acciones: AccionesDeMedicion | undefined = puedeCargar
    ? { onCorregir: abrirFormulario, onDarDeBaja: setMedicionADarDeBaja }
    : undefined;

  function contenido() {
    if (consulta.isPending) return <CargandoTarjeta etiqueta="Cargando las mediciones" />;
    if (consulta.isError) {
      return (
        <ErrorDeCarga
          error={consulta.error}
          mensaje="No se pudieron cargar las mediciones."
          reintentando={consulta.isFetching}
          onReintentar={() => void consulta.refetch()}
        />
      );
    }
    if (mediciones.length === 0) {
      return (
        <SinDatos
          texto="Todavía no tiene mediciones. Con la primera arranca su historial de evolución."
          accion={puedeCargar && <BotonDeCarga principal texto="Registrar medición" onClick={abrir} />}
        />
      );
    }
    return <Evolucion mediciones={mediciones} nombresDeProfesoras={nombres} acciones={acciones} />;
  }

  return (
    <Tarjeta
      id="titulo-evolucion"
      titulo="Evolución y mediciones"
      icono={Ruler}
      accion={puedeCargar && mediciones.length > 0 && <BotonDeCarga texto="Registrar medición" onClick={abrir} />}
    >
      {contenido()}
      <DialogoMedicion
        abierto={dialogoAbierto}
        idAlumno={idAlumno}
        nombreAlumno={nombreAlumno}
        medicion={medicionACorregir}
        mediciones={mediciones}
        onClose={() => setDialogoAbierto(false)}
      />
      <ConfirmarBajaMedicion idAlumno={idAlumno} medicion={medicionADarDeBaja} onClose={() => setMedicionADarDeBaja(null)} />
    </Tarjeta>
  );
}
