import { useMemo, useState } from "react";
import { Gift, Search } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import {
  ListaPromociones,
  ListaPromocionesCargando,
} from "@/features/promociones/components/lista-promociones";
import { PromocionDialog } from "@/features/promociones/components/promocion-dialog";
import {
  useActualizarPromocion,
  useCrearPromocion,
  useDesactivarPromocion,
  useReactivarPromocion,
  usePromociones,
} from "@/features/promociones/hooks/use-promociones";
import type { PromocionFormValues } from "@/features/promociones/schemas/promocion";
import type { Plan } from "@/types/plan";
import type { Promocion } from "@/types/promocion";
import { cn } from "@/utils/cn";
import { normalizarParaBuscar } from "@/utils/texto";

type PestanaEstadoPromocion = "VIGENTES" | "BAJAS";

export function PromocionesPanel({ planes }: { planes: Plan[] }) {
  const consulta = usePromociones();
  const crear = useCrearPromocion();
  const actualizar = useActualizarPromocion();
  const desactivar = useDesactivarPromocion();
  const reactivar = useReactivarPromocion();
  const [busqueda, setBusqueda] = useState("");
  const [pestana, setPestana] = useState<PestanaEstadoPromocion>("VIGENTES");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [promocionEditando, setPromocionEditando] = useState<Promocion | null>(null);
  const [promocionADesactivar, setPromocionADesactivar] = useState<Promocion | null>(null);

  const handleReactivar = (promocion: Promocion) => {
    reactivar.mutate(promocion.id, {
      onSuccess: () => {
        toast.success(`Promoción "${promocion.nombre}" reincorporada a vigente.`);
      },
      onError: (err) => {
        toast.error(mensajeDeErrorApi(err, "No se pudo reincorporar la promoción."));
      },
    });
  };

  const promocionesOrdenadas = useMemo(
    () => [...(consulta.data ?? [])].sort((a, b) => b.fechaDesde.localeCompare(a.fechaDesde)),
    [consulta.data],
  );

  const promocionesVigentes = useMemo(
    () => promocionesOrdenadas.filter((p) => p.estado === "ACTIVA" || p.estado === "PROGRAMADA"),
    [promocionesOrdenadas],
  );

  const promocionesBajas = useMemo(
    () => promocionesOrdenadas.filter((p) => p.estado === "DESACTIVADA" || !p.activo),
    [promocionesOrdenadas],
  );

  const promocionesFiltradas = useMemo(() => {
    const base = pestana === "VIGENTES" ? promocionesVigentes : promocionesBajas;
    const q = normalizarParaBuscar(busqueda);
    if (!q) return base;
    return base.filter((p) =>
      [p.nombre, p.codigo, ...p.planes.map((pl) => pl.nombre)].some((v) =>
        normalizarParaBuscar(v).includes(q),
      ),
    );
  }, [promocionesVigentes, promocionesBajas, pestana, busqueda]);

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

  const cabeceraPestanasDesktop = (
    <div className="hidden lg:flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setPestana("VIGENTES")}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
          pestana === "VIGENTES"
            ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
        )}
      >
        <span>Vigentes</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-extrabold",
            pestana === "VIGENTES"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
          )}
        >
          {promocionesVigentes.length}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setPestana("BAJAS")}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
          pestana === "BAJAS"
            ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
        )}
      >
        <span>Dados de baja</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-extrabold",
            pestana === "BAJAS"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
          )}
        >
          {promocionesBajas.length}
        </span>
      </button>
    </div>
  );

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
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setBusqueda("");
              }}
              className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-dark"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </section>

      {/* Pestañas de estado para mobile */}
      <div className="flex lg:hidden items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setPestana("VIGENTES")}
          className={cn(
            "flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all",
            pestana === "VIGENTES"
              ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
          )}
        >
          Vigentes{" "}
          <span className={cn(pestana === "VIGENTES" ? "text-primary font-black" : "text-slate-500")}>
            {promocionesVigentes.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPestana("BAJAS")}
          className={cn(
            "flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all",
            pestana === "BAJAS"
              ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
          )}
        >
          Dados de baja{" "}
          <span className={cn(pestana === "BAJAS" ? "text-primary font-black" : "text-slate-500")}>
            {promocionesBajas.length}
          </span>
        </button>
      </div>

      {consulta.isPending ? (
        <ListaPromocionesCargando />
      ) : consulta.isError ? (
        <EstadoErrorCarga
          mensaje={mensajeDeErrorApi(consulta.error, "No se pudieron cargar las promociones.")}
          onReintentar={() => void consulta.refetch()}
        />
      ) : promocionesFiltradas.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
          {cabeceraPestanasDesktop}
          <Card className="flex flex-col items-center gap-3 border-0 shadow-none px-5 py-14 text-center rounded-lg">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {hayFiltros
                ? "Sin resultados para tu búsqueda"
                : pestana === "BAJAS"
                  ? "No hay promociones dadas de baja"
                  : "Todavía no hay promociones"}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {hayFiltros
                ? "Probá ajustando el término de búsqueda para encontrar promociones."
                : pestana === "BAJAS"
                  ? "Las promociones que desactives aparecerán acá por si necesitás reincorporarlas."
                  : "Creá una promoción temporal para aplicar descuentos a nuevas inscripciones."}
            </p>
            {!hayFiltros && pestana === "VIGENTES" && (
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
          cabecera={cabeceraPestanasDesktop}
          onEditar={abrirEdicion}
          onDesactivar={setPromocionADesactivar}
          onReactivar={handleReactivar}
          reactivandoId={reactivar.isPending ? (reactivar.variables as string) : null}
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

      <Dialog open={promocionADesactivar !== null} onOpenChange={(open) => !open && setPromocionADesactivar(null)}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader><DialogTitle className="font-black">¿Desactivar promoción?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">La promoción dejará de aplicarse inmediatamente. ¿Confirmás?</p>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPromocionADesactivar(null)} className="rounded-xl font-bold">Cancelar</Button>
            <Button
              type="button"
              disabled={desactivar.isPending}
              onClick={() => {
                if (!promocionADesactivar) return;
                desactivar.mutate(promocionADesactivar.id, {
                  onSuccess: () => {
                    setPromocionADesactivar(null);
                    toast.success("Promoción desactivada");
                  },
                });
              }}
              className="rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700"
            >
              {desactivar.isPending ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
