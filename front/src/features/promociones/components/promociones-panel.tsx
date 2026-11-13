import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import { BotonLimpiarFiltros } from "@/components/ui/boton-limpiar-filtros";
import { cn } from "@/utils/cn";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { Input } from "@/components/ui/input";
import {
  ListaPromociones,
  ListaPromocionesCargando,
} from "@/features/promociones/components/lista-promociones";
import { PromocionDialog } from "@/features/promociones/components/promocion-dialog";
import {
  useActualizarPromocion,
  useCrearPromocion,
  useDesactivarPromocion,
  usePromociones,
} from "@/features/promociones/hooks/use-promociones";
import type { PromocionFormValues } from "@/features/promociones/schemas/promocion";
import type { Plan } from "@/types/plan";
import type { Promocion } from "@/types/promocion";
import { normalizarParaBuscar } from "@/utils/texto";
import { BOTON_MODAL, CABECERA_MODAL, CONTENIDO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

export function PromocionesPanel({ planes }: { planes: Plan[] }) {
  const consulta = usePromociones();
  const crear = useCrearPromocion();
  const actualizar = useActualizarPromocion();
  const desactivar = useDesactivarPromocion();
  const [busqueda, setBusqueda] = useState("");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [promocionEditando, setPromocionEditando] = useState<Promocion | null>(null);
  const [promocionAEliminar, setPromocionAEliminar] = useState<Promocion | null>(null);

  // Las promociones no tienen historial: si la propietaria las borra o se acaba su vigencia, simplemente no aparecen.
  const promocionesActivas = useMemo(
    () =>
      [...(consulta.data ?? [])]
        .filter((p) => p.activo && p.estado !== "DESACTIVADA" && p.estado !== "VENCIDA")
        .sort((a, b) => b.fechaDesde.localeCompare(a.fechaDesde)),
    [consulta.data]
  );

  const promocionesFiltradas = useMemo(() => {
    const q = normalizarParaBuscar(busqueda);
    if (!q) return promocionesActivas;
    return promocionesActivas.filter((p) => {
      const esTodos = planes.length > 0 && p.planes.length >= planes.length;
      return [
        p.nombre,
        p.codigo,
        ...(esTodos ? ["todos"] : []),
        ...p.planes.map((pl) => pl.nombre),
      ].some((v) => normalizarParaBuscar(v).includes(q));
    });
  }, [promocionesActivas, busqueda, planes.length]);

  const hayFiltros = busqueda.trim().length > 0;

  const abrirNueva = () => {
    crear.reset();
    setPromocionEditando(null);
    setDialogoAbierto(true);
  };

  const abrirEdicion = (promocion: Promocion) => {
    actualizar.reset();
    setPromocionEditando(promocion);
    setDialogoAbierto(true);
  };

  const guardar = (datos: PromocionFormValues) => {
    const cuerpo = {
      codigo: datos.codigo.trim().toUpperCase(),
      nombre: datos.nombre.trim(),
      tipo_descuento: datos.tipoDescuento,
      valor: Number(datos.valor.replace(",", ".")),
      fecha_desde: datos.fechaDesde,
      fecha_hasta: datos.permanente ? "2099-12-31" : datos.fechaHasta,
      ids_planes: datos.idsPlanes.map(Number),
    };
    const opciones = {
      onSuccess: () => {
        setDialogoAbierto(false);
        toast.success(promocionEditando ? "Promoción actualizada" : "Promoción creada");
      },
    };
    if (promocionEditando) {
      actualizar.mutate({ id: promocionEditando.id, cambios: cuerpo }, opciones);
    } else {
      crear.mutate(cuerpo, opciones);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Promociones
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
            Descuentos y beneficios vigentes para aplicar en las inscripciones.
          </p>
        </div>
        <Button
          type="button"
          onClick={abrirNueva}
          className="min-h-[44px] rounded-xl bg-primary px-4 md:px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
        >
          + Nueva promoción
        </Button>
      </div>

      {/* Barra de búsqueda como en Alumnos - Listado */}
      <section aria-label="Filtros de promociones" className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[280px] max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400"
            />
            <Input
              type="search"
              aria-label="Buscar por nombre, código o plan"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, código o plan..."
              className="h-10 w-full rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
            />
          </div>
          {hayFiltros && (
            <BotonLimpiarFiltros
              onLimpiar={() => {
                setBusqueda("");
              }}
            />
          )}
        </div>
      </section>

      {consulta.isPending ? (
        <ListaPromocionesCargando />
      ) : consulta.isError ? (
        <EstadoErrorCarga
          mensaje={mensajeDeErrorApi(consulta.error, "No se pudieron cargar las promociones.")}
          onReintentar={() => void consulta.refetch()}
        />
      ) : promocionesFiltradas.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
          <Card className="flex flex-col items-center gap-3 border-0 shadow-none px-5 py-14 text-center rounded-lg">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {hayFiltros
                ? "Sin resultados para tu búsqueda"
                : "Todavía no hay promociones"}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {hayFiltros
                ? "Probá ajustando el término de búsqueda para encontrar promociones."
                : "Creá una promoción para aplicar descuentos a nuevas inscripciones."}
            </p>
            {!hayFiltros && (
              <Button
                type="button"
                onClick={abrirNueva}
                className="mt-2 min-h-[44px] rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95"
              >
                + Nueva promoción
              </Button>
            )}
          </Card>
        </div>
      ) : (
        <ListaPromociones
          promociones={promocionesFiltradas}
          totalPlanes={planes.length}
          onEditar={abrirEdicion}
          onDesactivar={setPromocionAEliminar}
        />
      )}

      <PromocionDialog
        key={promocionEditando?.id ?? "nueva-promocion"}
        abierto={dialogoAbierto}
        promocion={promocionEditando}
        planes={planes}
        guardando={crear.isPending || actualizar.isPending}
        error={
          crear.isError
            ? mensajeDeErrorApi(crear.error, "No se pudo crear la promoción.")
            : actualizar.isError
              ? mensajeDeErrorApi(actualizar.error, "No se pudo actualizar la promoción.")
              : null
        }
        onClose={() => setDialogoAbierto(false)}
        onSubmit={guardar}
      />

      <Dialog open={promocionAEliminar !== null} onOpenChange={(open) => !open && setPromocionAEliminar(null)}>
        <DialogContent className={cn(CONTENIDO_MODAL, "max-w-md")}>
          <DialogHeader className={CABECERA_MODAL}>
            <DialogTitle className={TITULO_MODAL}>¿Eliminar promoción?</DialogTitle>
            <DialogDescription className={DESCRIPCION_MODAL}>
              La promoción <strong>{promocionAEliminar?.nombre}</strong> se eliminará y no se aplicará a nuevas inscripciones.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={PIE_MODAL}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPromocionAEliminar(null)}
              className={BOTON_MODAL}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={desactivar.isPending}
              onClick={() => {
                if (!promocionAEliminar) return;
                desactivar.mutate(promocionAEliminar.id, {
                  onSuccess: () => {
                    setPromocionAEliminar(null);
                    toast.success("Promoción eliminada");
                  },
                });
              }}
              className={cn(BOTON_MODAL, "bg-rose-600 text-white hover:bg-rose-700")}
            >
              {desactivar.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
