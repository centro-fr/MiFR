import { useState } from "react";
import { Lock } from "lucide-react";
import { NivelPill } from "@/features/seguridad/components/nivel-pill";
import { descripcionModulo, etiquetaModulo } from "@/features/seguridad/utils/etiquetas";
import type { NivelAcceso } from "@/features/seguridad/utils/niveles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import type { RoleCode } from "@/types/auth";

interface ModuloCardsProps {
  roles: { codigo: RoleCode; nombre: string }[];
  modulos: string[];
  nivelDe: (rol: RoleCode, modulo: string) => NivelAcceso;
  bloqueoDe: (rol: RoleCode, modulo: string) => string | null;
  onCiclar: (rol: RoleCode, modulo: string) => void;
  rolInicial?: RoleCode;
}

// Mobile (Stitch: matriz simplificada): pestañas por rol + filas por módulo.
export function ModuloCards({ roles, modulos, nivelDe, bloqueoDe, onCiclar, rolInicial }: ModuloCardsProps) {
  const [rolActivo, setRolActivo] = useState<RoleCode>(rolInicial ?? roles[0]?.codigo ?? "PROPIETARIA");

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Rol a configurar" className="flex gap-2 overflow-x-auto pb-1">
        {roles.map((rol) => {
          const bloqueado = rol.codigo === "PROPIETARIA";
          return (
            <Button
              key={rol.codigo}
              type="button"
              role="tab"
              aria-selected={rolActivo === rol.codigo}
              title={bloqueado ? "Acceso total · No editable" : undefined}
              onClick={() => setRolActivo(rol.codigo)}
              variant="outline"
              className={cn(
                "inline-flex h-auto min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&_svg]:size-3.5",
                rolActivo === rol.codigo
                  ? "border-primary bg-primary text-white hover:bg-primary hover:text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:hover:bg-white/10 dark:border-white/15 dark:bg-transparent dark:text-slate-300",
                bloqueado && rolActivo !== rol.codigo && "border-dashed opacity-80",
              )}
            >
              {bloqueado && <Lock aria-hidden="true" className="h-3.5 w-3.5" />}
              {rol.nombre}
            </Button>
          );
        })}
      </div>

      {rolActivo === "PROPIETARIA" && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Lock aria-hidden="true" className="h-3.5 w-3.5" />
          Acceso total · Columna bloqueada, no editable
        </p>
      )}

      <Card className="overflow-hidden rounded-2xl border-border bg-white dark:bg-surface-low">
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {modulos.map((modulo) => (
            <li key={modulo} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{etiquetaModulo(modulo)}</p>
                <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">{descripcionModulo(modulo)}</p>
              </div>
              <NivelPill
                corto
                nivel={nivelDe(rolActivo, modulo)}
                bloqueado={bloqueoDe(rolActivo, modulo)}
                etiqueta={`${etiquetaModulo(modulo)} para ${rolActivo}`}
                onCiclar={() => onCiclar(rolActivo, modulo)}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
