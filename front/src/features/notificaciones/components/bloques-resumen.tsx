import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeftRight, ArrowRight, Banknote, CalendarX, CircleCheck, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import type {
  CuotasVencidasDelResumen,
  EfectivoDelResumen,
  TransferenciasDelResumen,
} from "@/features/notificaciones/schemas/resumen-diario";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";

// Los tres bloques del resumen diario (US-26). Cada uno muestra hasta 3 casos: el detalle completo
// está en su pantalla ("Muchos movimientos → mostrar solo los más relevantes").
const CASOS_VISIBLES = 3;

// AGENTS.md, estados de rendición de efectivo: atención a los 15 días y urgente a los 30.
const DIAS_ATENCION_RENDICION = 15;
const DIAS_URGENTE_RENDICION = 30;

function nombreDe({ nombre, apellido }: { nombre: string; apellido: string }): string {
  return `${nombre} ${apellido}`.trim();
}

function haceHoras(horas: number): string {
  if (horas < 1) return "hace menos de 1 h";
  if (horas < 48) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} días`;
}

function haceDias(dias: number): string {
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

interface PropsTarjeta {
  titulo: string;
  icono: LucideIcon;
  /** null: el back no pudo armar el bloque (llega en bloques_con_error). */
  cantidad: number | null;
  detalleCantidad: string;
  enlace?: { to: string; etiqueta: string };
  children?: ReactNode;
}

function TarjetaBloque({ titulo, icono: Icono, cantidad, detalleCantidad, enlace, children }: PropsTarjeta) {
  return (
    <Card className="flex flex-col gap-3 rounded-2xl border-border bg-white p-5 shadow-sm dark:bg-surface-low">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-dark dark:bg-primary/20 dark:text-pink-300">
          <Icono className="size-5" />
        </span>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{titulo}</h3>
      </div>

      {cantidad === null && (
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          No se pudo armar este bloque.
        </p>
      )}
      {cantidad === 0 && (
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
          Nada pendiente
        </p>
      )}
      {cantidad !== null && cantidad > 0 && (
        <>
          <div>
            <p className="text-3xl font-black tracking-tight text-dark tabular-nums dark:text-white">{cantidad}</p>
            <p className="text-sm text-muted-foreground">{detalleCantidad}</p>
          </div>
          {children}
          {enlace && (
            <Link
              to={enlace.to}
              className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-primary-dark transition-colors hover:text-primary dark:text-pink-300"
            >
              {enlace.etiqueta}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </>
      )}
    </Card>
  );
}

function Aviso({ tono, children }: { tono: "atencion" | "urgente"; children: ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-lg px-2.5 py-1.5 text-sm font-semibold",
        tono === "urgente"
          ? "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200"
          : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
      )}
    >
      {children}
    </p>
  );
}

function ListaCasos({ casos }: { casos: { id: number; principal: string; secundario: string; monto?: string }[] }) {
  return (
    <ul className="divide-y divide-border border-t border-border">
      {casos.slice(0, CASOS_VISIBLES).map((caso) => (
        <li key={caso.id} className="flex items-start justify-between gap-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="block break-words font-semibold text-slate-800 dark:text-slate-100">{caso.principal}</span>
            <span className="block text-muted-foreground">{caso.secundario}</span>
          </span>
          {caso.monto && <span className="shrink-0 font-semibold text-slate-800 tabular-nums dark:text-slate-100">{caso.monto}</span>}
        </li>
      ))}
    </ul>
  );
}

export function BloqueTransferencias({ datos }: { datos: TransferenciasDelResumen | null }) {
  return (
    <TarjetaBloque
      titulo="Transferencias pendientes de verificación"
      icono={ArrowLeftRight}
      cantidad={datos?.cantidad ?? null}
      detalleCantidad={`${datos?.cantidad === 1 ? "transferencia" : "transferencias"} · ${formatearPrecio(datos?.total ?? 0)}`}
      enlace={{ to: "/app/pagos/transferencias", etiqueta: "Verificar transferencias" }}
    >
      {datos && datos.supera_24_horas > 0 && (
        <Aviso tono="urgente">{plural(datos.supera_24_horas, "lleva", "llevan")} más de 24 h sin verificar</Aviso>
      )}
      {datos && datos.por_superar_24_horas > 0 && (
        <Aviso tono="atencion">{plural(datos.por_superar_24_horas, "está por superar", "están por superar")} las 24 h</Aviso>
      )}
      {datos && (
        <ListaCasos
          casos={datos.mas_antiguas.map((transferencia) => ({
            id: transferencia.id_pago,
            principal: nombreDe(transferencia.alumno),
            secundario: `Informada ${haceHoras(transferencia.horas_desde_la_carga)}`,
            monto: formatearPrecio(transferencia.monto),
          }))}
        />
      )}
    </TarjetaBloque>
  );
}

function avisoDeRendicion(dias: number) {
  if (dias > DIAS_URGENTE_RENDICION) return { tono: "urgente" as const, texto: `El más antiguo lleva ${dias} días sin rendir` };
  if (dias > DIAS_ATENCION_RENDICION) return { tono: "atencion" as const, texto: `El más antiguo lleva ${dias} días sin rendir` };
  return null;
}

// Sin enlace: la pantalla de rendición (US-19) todavía no está en el front.
export function BloqueEfectivo({ datos }: { datos: EfectivoDelResumen | null }) {
  const aviso = datos?.mas_antiguo ? avisoDeRendicion(datos.mas_antiguo.dias_sin_rendir) : null;
  return (
    <TarjetaBloque
      titulo="Efectivo pendiente de rendición"
      icono={Banknote}
      cantidad={datos?.cantidad ?? null}
      detalleCantidad={`${datos?.cantidad === 1 ? "cobro" : "cobros"} en efectivo · ${formatearPrecio(datos?.total ?? 0)}`}
    >
      {aviso && <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>}
      {datos && (
        <ListaCasos
          casos={datos.profesoras.map((profesora) => ({
            id: profesora.id_profesora,
            principal: nombreDe(profesora),
            secundario: plural(profesora.cantidad, "cobro sin rendir", "cobros sin rendir"),
            monto: formatearPrecio(profesora.total),
          }))}
        />
      )}
      {datos?.mas_antiguo && (
        <p className="text-sm text-muted-foreground">
          El más antiguo: {nombreDe(datos.mas_antiguo.alumno)}, cobrado por {nombreDe(datos.mas_antiguo.profesora)}{" "}
          {haceDias(datos.mas_antiguo.dias_sin_rendir)}.
        </p>
      )}
    </TarjetaBloque>
  );
}

export function BloqueCuotasVencidas({ datos }: { datos: CuotasVencidasDelResumen | null }) {
  return (
    <TarjetaBloque
      titulo="Cuotas vencidas"
      icono={CalendarX}
      cantidad={datos?.cantidad_alumnos ?? null}
      detalleCantidad={`${datos?.cantidad_alumnos === 1 ? "alumno" : "alumnos"} · ${formatearPrecio(datos?.monto_estimado ?? 0)} estimado`}
      enlace={{ to: "/app/pagos/cuotas", etiqueta: "Ver estado de cuotas" }}
    >
      {datos && datos.sin_precio > 0 && (
        <Aviso tono="atencion">
          {plural(datos.sin_precio, "cuota no suma", "cuotas no suman")} al monto: su plan no tiene precio hoy
        </Aviso>
      )}
      {datos && (
        <ListaCasos
          casos={datos.mas_atrasadas.map((cuota) => ({
            id: cuota.id_inscripcion,
            principal: nombreDe(cuota.alumno),
            secundario: `${cuota.plan.nombre} · vencida ${haceDias(cuota.dias_vencida)}`,
          }))}
        />
      )}
    </TarjetaBloque>
  );
}
