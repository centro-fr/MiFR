import { useMemo, useState } from "react";
import { CheckCircle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";
import { normalizarParaBuscar } from "@/utils/texto";
import {
  useEfectivoPendiente,
  useHistorialRendiciones,
  useRendirCobro,
  useRendirLote,
} from "../hooks/use-rendiciones";
import { AcordeonProfesoraRendicion } from "./acordeon-profesora-rendicion";
import {
  ModalConfirmarRendicion,
  type DestinoRendicion,
} from "./modal-confirmar-rendicion";
import { TablaHistorialRendiciones } from "./tabla-historial-rendiciones";

type VistaRendicion = "PENDIENTES" | "HISTORIAL";

export function PanelEfectivoARendir() {
  const [vista, setVista] = useState<VistaRendicion>("PENDIENTES");
  const [busqueda, setBusqueda] = useState("");
  const [destinoRendicion, setDestinoRendicion] = useState<DestinoRendicion | null>(null);

  // Queries
  const { data: efectivoData, isLoading: cargandoPendientes } = useEfectivoPendiente();
  const { data: historialData, isLoading: cargandoHistorial } = useHistorialRendiciones();

  // Mutations
  const rendirCobro = useRendirCobro();
  const rendirLote = useRendirLote();

  const procesando = rendirCobro.isPending || rendirLote.isPending;

  // Filtrado de profesoras y cobros
  const profesorasFiltradas = useMemo(() => {
    if (!efectivoData?.profesoras) return [];
    if (!busqueda.trim()) return efectivoData.profesoras;

    const query = normalizarParaBuscar(busqueda);
    return efectivoData.profesoras.filter((prof) => {
      const nombreProf = normalizarParaBuscar(`${prof.nombre} ${prof.apellido}`);
      if (nombreProf.includes(query)) return true;
      // También buscar si algún cobro de esa profesora coincide con el alumno buscado
      const cobrosDeProf = efectivoData.cobros.filter(
        (c) => c.profesora.id_profesora === prof.id_profesora
      );
      return cobrosDeProf.some((c) =>
        normalizarParaBuscar(`${c.alumno.nombre} ${c.alumno.apellido}`).includes(query)
      );
    });
  }, [efectivoData, busqueda]);

  // Historial filtrado
  const historialFiltrado = useMemo(() => {
    if (!historialData?.datos) return [];
    if (!busqueda.trim()) return historialData.datos;

    const query = normalizarParaBuscar(busqueda);
    return historialData.datos.filter((r) => {
      const nombreProf = normalizarParaBuscar(`${r.profesora.nombre} ${r.profesora.apellido}`);
      const nombreAl = normalizarParaBuscar(`${r.alumno.nombre} ${r.alumno.apellido}`);
      return nombreProf.includes(query) || nombreAl.includes(query);
    });
  }, [historialData, busqueda]);

  const handleConfirmarRendicion = async (observaciones?: string) => {
    if (!destinoRendicion) return;

    if (destinoRendicion.tipo === "INDIVIDUAL") {
      await rendirCobro.mutateAsync(
        {
          idPago: destinoRendicion.cobro.id_pago,
          observaciones,
        },
        {
          onSuccess: (res) => {
            toast.success("Cobro rendido exitosamente", {
              description: `Se rindieron ${formatearPrecio(res.total)} en caja.`,
            });
            setDestinoRendicion(null);
          },
          onError: () => {
            toast.error("No se pudo registrar la rendición");
          },
        }
      );
    } else {
      await rendirLote.mutateAsync(
        {
          id_profesora: destinoRendicion.profesora.id_profesora,
          observaciones,
        },
        {
          onSuccess: (res) => {
            toast.success("Rendición registrada", {
              description: `Se rindió el efectivo de ${destinoRendicion.profesora.nombre} (${formatearPrecio(
                res.total
              )}).`,
            });
            setDestinoRendicion(null);
          },
          onError: () => {
            toast.error("No se pudo registrar la rendición del lote");
          },
        }
      );
    }
  };

  const cantidadPendiente = efectivoData?.cantidad ?? 0;

  return (
    <div className="space-y-4">
      {/* Barra de filtros y selector de vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Buscador */}
        <div className="relative flex-1 min-w-0 sm:min-w-[240px]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            id="buscar-rendicion"
            aria-label="Buscar por profesor/a o alumno"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por profesor/a o alumno..."
            className="h-10 w-full rounded-xl border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
          />
        </div>

        {/* Píldoras de sub-vista */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVista("PENDIENTES")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-2xs",
              vista === "PENDIENTES"
                ? "bg-primary text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            )}
          >
            <span>Pendientes</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px] font-black",
                vista === "PENDIENTES" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800"
              )}
            >
              {cantidadPendiente}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVista("HISTORIAL")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-2xs",
              vista === "HISTORIAL"
                ? "bg-primary text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            )}
          >
            <span>Historial rendido</span>
          </button>
        </div>
      </div>

      {/* Contenido según vista */}
      {vista === "PENDIENTES" ? (
        cargandoPendientes ? (
          <div className="flex min-h-52 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2 className="size-5 animate-spin text-primary" />
            Cargando efectivo pendiente…
          </div>
        ) : profesorasFiltradas.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-800">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle className="size-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {busqueda
                ? "No se encontraron coincidencias"
                : "Todo el efectivo está rendido"}
            </h3>
            <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
              {busqueda
                ? "Probá ajustando el término de búsqueda."
                : "No hay cobros en efectivo en mano de las profesoras pendientes de entrega."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {profesorasFiltradas.map((prof) => {
              const cobrosDeProf =
                efectivoData?.cobros.filter(
                  (c) => c.profesora.id_profesora === prof.id_profesora
                ) ?? [];

              return (
                <AcordeonProfesoraRendicion
                  key={prof.id_profesora}
                  profesora={prof}
                  cobros={cobrosDeProf}
                  onRendirLote={(p) => setDestinoRendicion({ tipo: "LOTE", profesora: p })}
                  onRendirIndividual={(c) =>
                    setDestinoRendicion({ tipo: "INDIVIDUAL", cobro: c })
                  }
                />
              );
            })}
          </div>
        )
      ) : (
        <TablaHistorialRendiciones
          rendiciones={historialFiltrado}
          cargando={cargandoHistorial}
        />
      )}

      {/* Modal flotante de confirmación */}
      {destinoRendicion && (
        <ModalConfirmarRendicion
          open={destinoRendicion !== null}
          onClose={() => setDestinoRendicion(null)}
          destino={destinoRendicion}
          onConfirmar={handleConfirmarRendicion}
          procesando={procesando}
        />
      )}
    </div>
  );
}
