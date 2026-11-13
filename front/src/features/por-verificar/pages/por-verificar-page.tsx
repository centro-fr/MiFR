import { OwnerLayout } from "@/components/layout/owner-layout";
import { BandejaPorVerificar } from "@/features/por-verificar/components/bandeja-por-verificar";
import { useBandejaPorVerificar } from "@/features/por-verificar/hooks/use-bandeja-por-verificar";

// Issue #49: una sola bandeja para las transferencias por verificar (US-17) y las altas nuevas que
// esperan su primer pago (US-07). Reemplaza a "Transferencias por verificar" y "Altas por confirmar".
export function PorVerificarPage() {
  const bandeja = useBandejaPorVerificar();

  return (
    <OwnerLayout>
      <div className="min-w-0 space-y-5">
        <header className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 xl:text-3xl dark:text-white">Por verificar</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Transferencias informadas y altas nuevas que esperan su pago, la más reciente primero.
          </p>
        </header>
        <section
          aria-label="Pagos por verificar"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <BandejaPorVerificar bandeja={bandeja} variante="tabla" />
        </section>
      </div>
    </OwnerLayout>
  );
}
