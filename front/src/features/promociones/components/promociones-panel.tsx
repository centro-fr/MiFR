import { useMemo, useState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListaPromociones } from "@/features/promociones/components/lista-promociones";
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

export function PromocionesPanel({ planes }: { planes: Plan[] }) {
  const consulta = usePromociones();
  const crear = useCrearPromocion();
  const actualizar = useActualizarPromocion();
  const desactivar = useDesactivarPromocion();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [promocionEditando, setPromocionEditando] = useState<Promocion | null>(null);
  const [promocionADesactivar, setPromocionADesactivar] = useState<Promocion | null>(null);

  const promocionesOrdenadas = useMemo(
    () => [...(consulta.data ?? [])].sort((a, b) => b.fechaDesde.localeCompare(a.fechaDesde)),
    [consulta.data],
  );

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
      fecha_hasta: datos.fechaHasta,
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

  if (consulta.isPending) {
    return <div role="status" className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold"><Loader2 className="size-5 animate-spin text-primary" />Cargando promociones...</div>;
  }

  if (consulta.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-200 px-5 py-12 text-center dark:border-slate-800">
        <AlertCircle className="size-8 text-rose-600" />
        <p role="alert" className="text-sm font-semibold">{mensajeDeErrorApi(consulta.error, "No se pudieron cargar las promociones.")}</p>
        <Button type="button" onClick={() => void consulta.refetch()} className="min-h-11 rounded-xl font-bold">Reintentar</Button>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={abrirNueva} className="min-h-11 rounded-xl bg-primary font-bold text-white hover:bg-primary-dark">
          + Nueva promoción
        </Button>
      </div>
      {promocionesOrdenadas.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-200 px-5 py-14 text-center dark:border-slate-800">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70"><Sparkles className="size-7" /></span>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Todavía no hay promociones</h2>
          <p className="max-w-md text-sm text-muted-foreground">Creá una promoción temporal para aplicar descuentos a nuevas inscripciones.</p>
        </Card>
      ) : (
        <ListaPromociones promociones={promocionesOrdenadas} onEditar={abrirEdicion} onDesactivar={setPromocionADesactivar} />
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
