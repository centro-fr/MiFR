import { useMemo, useState } from "react";
import { Ruler } from "lucide-react";
import { DialogoMedicion } from "@/features/rutinas/components/dialogo-medicion";
import { Evolucion } from "@/features/rutinas/components/detalle-evolucion";
import { BotonDeCarga, CargandoTarjeta, ErrorDeCarga, SinDatos, Tarjeta } from "@/features/rutinas/components/tarjeta";
import { useMedicionesDeAlumno, useNombresDeProfesoras } from "@/features/rutinas/hooks/use-rutinas";

interface PropsTarjetaEvolucion {
  idAlumno: number;
  nombreAlumno: string;
  puedeCargar: boolean;
}

export function TarjetaEvolucion({ idAlumno, nombreAlumno, puedeCargar }: PropsTarjetaEvolucion) {
  const consulta = useMedicionesDeAlumno(idAlumno, true);
  const nombres = useNombresDeProfesoras();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  const mediciones = useMemo(() => consulta.data ?? [], [consulta.data]);
  const fechasConMedicion = useMemo(() => new Set(mediciones.map((medicion) => medicion.fecha)), [mediciones]);
  const abrir = () => setDialogoAbierto(true);

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
    return <Evolucion mediciones={mediciones} nombresDeProfesoras={nombres} />;
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
        fechasConMedicion={fechasConMedicion}
        onClose={() => setDialogoAbierto(false)}
      />
    </Tarjeta>
  );
}
