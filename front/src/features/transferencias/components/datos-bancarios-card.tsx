import { useState } from "react";
import { Building2, Check, Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DatosBancarios } from "../schemas/transferencia";

interface Props {
  datos: DatosBancarios;
}

export function DatosBancariosCard({ datos }: Props) {
  const [copiadoCbu, setCopiadoCbu] = useState(false);
  const [copiadoAlias, setCopiadoAlias] = useState(false);
  const [copiadoCuit, setCopiadoCuit] = useState(false);

  async function copiarTexto(texto: string, setCopiado: (val: boolean) => void) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback si no tiene permisos de portapapeles
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Cabecera */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-pink-100 text-pink-700 shadow-2xs dark:bg-pink-950/60 dark:text-pink-300">
            <Building2 className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              Datos bancarios del centro
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Transferí desde tu app bancaria o billetera virtual usando estos datos.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="space-y-3">
          {/* ALIAS */}
          <div className="group flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-pink-50/70 via-rose-50/30 to-transparent p-3.5 dark:from-pink-950/30 dark:via-pink-950/10 dark:to-transparent">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-700 dark:text-pink-300">
                Alias
              </span>
              <p className="mt-1 select-all font-mono text-base font-black tracking-wide text-pink-600 dark:text-pink-400 sm:text-lg">
                {datos.alias}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => copiarTexto(datos.alias, setCopiadoAlias)}
              className={
                copiadoAlias
                  ? "min-h-[38px] shrink-0 gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 shadow-2xs dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                  : "min-h-[38px] shrink-0 gap-1.5 rounded-lg border border-pink-200 bg-white px-3 text-xs font-bold text-pink-700 shadow-2xs hover:bg-pink-50 active:scale-95 dark:border-pink-900/60 dark:bg-slate-800 dark:text-pink-300 dark:hover:bg-slate-750"
              }
            >
              {copiadoAlias ? (
                <>
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-pink-600 dark:text-pink-400" />
                  <span>Copiar Alias</span>
                </>
              )}
            </Button>
          </div>

          {/* CBU */}
          <div className="group flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-pink-50/70 via-rose-50/30 to-transparent p-3.5 dark:from-pink-950/30 dark:via-pink-950/10 dark:to-transparent">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-700 dark:text-pink-300">
                CBU
              </span>
              <p className="mt-1 select-all font-mono text-xs font-bold tracking-tight text-slate-900 sm:text-sm sm:tracking-wider dark:text-slate-100">
                {datos.cbu}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => copiarTexto(datos.cbu, setCopiadoCbu)}
              className={
                copiadoCbu
                  ? "min-h-[38px] shrink-0 gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 shadow-2xs dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                  : "min-h-[38px] shrink-0 gap-1.5 rounded-lg border border-pink-200 bg-white px-3 text-xs font-bold text-pink-700 shadow-2xs hover:bg-pink-50 active:scale-95 dark:border-pink-900/60 dark:bg-slate-800 dark:text-pink-300 dark:hover:bg-slate-750"
              }
            >
              {copiadoCbu ? (
                <>
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-pink-600 dark:text-pink-400" />
                  <span>Copiar CBU</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info extra: Banco, Titular, CUIT */}
        <div className="mt-4 grid gap-3 rounded-xl bg-slate-50/70 p-3.5 text-xs text-slate-600 sm:grid-cols-3 dark:bg-slate-800/40 dark:text-slate-300">
          <div className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Banco
            </span>
            <span className="mt-0.5 block font-bold text-slate-800 dark:text-slate-200">{datos.banco}</span>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Titular
            </span>
            <span className="mt-0.5 block font-bold text-slate-800 dark:text-slate-200">{datos.titular}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                CUIT
              </span>
              <button
                type="button"
                onClick={() => copiarTexto(datos.cuit, setCopiadoCuit)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:underline dark:text-pink-400"
              >
                {copiadoCuit ? (
                  <>
                    <Check className="size-3 text-emerald-500" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-slate-400" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <span className="mt-0.5 block font-mono font-bold text-slate-800 dark:text-slate-200">{datos.cuit}</span>
          </div>
        </div>

        {/* Decisión de la dueña: el alumno no informa la transferencia; la registran la propietaria o su profesora. */}
        <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Info className="mt-0.5 size-4 shrink-0 text-primary dark:text-pink-300" aria-hidden="true" />
          <span>
            Después de transferir, <strong className="font-bold text-slate-800 dark:text-slate-100">avisale a la administración o a tu profesor/a</strong>:
            para registrar tu comprobante.
          </span>
        </div>
      </div>
    </Card>
  );
}
