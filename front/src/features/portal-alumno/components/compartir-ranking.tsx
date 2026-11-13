import { useRef, useState, type Ref } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Download, Share, X } from "lucide-react";
import { toast } from "sonner";
import { InsigniaMedalla } from "@/components/insignias/insignia-medalla";
import { unaPorTipo, type InsigniaObtenida } from "@/components/insignias/insignias";
import { compartirImagen, descargarArchivo, svgAPng } from "../utils/imagen-para-compartir";

// US-30/US-31: imagen del puesto en el ranking para compartir en historias (9:16). Se arma como SVG para
// poder convertirla a PNG sin librerías.

export interface DatosParaCompartir {
  nombre: string;
  posicion: number;
  porcentaje: number;
  asistidas: number;
  previstas: number;
  racha: number;
  /** "Octubre 2026". */
  periodo: string;
  insignias: InsigniaObtenida[];
}

const ANCHO = 300;
const ALTO = 533;
const FUENTE = "'Plus Jakarta Sans', system-ui, 'Segoe UI', sans-serif";
const LINEA = "rgba(255,255,255,0.14)";

function Estadistica({ x, etiqueta, valor }: { x: number; etiqueta: string; valor: string }) {
  return (
    <g textAnchor="middle" fontFamily={FUENTE}>
      <text x={x} y={318} fontSize={11} fill="#a3abbb">
        {etiqueta}
      </text>
      <text x={x} y={344} fontSize={20} fontWeight={800} fill="#ffffff">
        {valor}
      </text>
    </g>
  );
}

function TarjetaRanking({ datos, refSvg }: { datos: DatosParaCompartir; refSvg: Ref<SVGSVGElement> }) {
  const insignias = unaPorTipo(datos.insignias);
  const inicioInsignias = ANCHO / 2 - (insignias.length * 50 - 10) / 2;
  return (
    <svg
      ref={refSvg}
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      role="img"
      aria-label={`${datos.nombre}, ${datos.posicion}.º puesto en asistencia de ${datos.periodo}, ${datos.porcentaje}%`}
      className="block h-auto max-h-[60dvh] w-full max-w-[300px] rounded-2xl"
    >
      <rect width={ANCHO} height={ALTO} rx={16} fill="#181c26" />
      <g fontFamily={FUENTE}>
        <rect x={20} y={22} width={26} height={26} rx={6} fill="#e91e82" />
        <text x={33} y={40} textAnchor="middle" fontSize={12} fontWeight={800} fill="#ffffff">
          FR
        </text>
        <text x={54} y={40} fontSize={14} fontWeight={800} fill="#ffffff">
          MiFR
        </text>
        <text x={280} y={40} textAnchor="end" fontSize={12} fontWeight={600} fill="#d6dae3">
          {datos.periodo}
        </text>
        <text x={150} y={150} textAnchor="middle" fontSize={14} fontWeight={600} fill="#d6dae3">
          Ranking de asistencia
        </text>
        <text x={150} y={236} textAnchor="middle" fontSize={80} fontWeight={800} letterSpacing={-2} fill="#e91e82">
          {datos.posicion}.º
        </text>
        <text x={150} y={276} textAnchor="middle" fontSize={22} fontWeight={800} fill="#ffffff">
          {datos.nombre}
        </text>
      </g>
      <line x1={20} y1={296} x2={280} y2={296} stroke={LINEA} />
      <line x1={107} y1={300} x2={107} y2={352} stroke={LINEA} />
      <line x1={193} y1={300} x2={193} y2={352} stroke={LINEA} />
      <line x1={20} y1={356} x2={280} y2={356} stroke={LINEA} />
      <Estadistica x={63} etiqueta="Asistencia" valor={`${datos.porcentaje}%`} />
      <Estadistica x={150} etiqueta="Clases" valor={`${datos.asistidas} de ${datos.previstas}`} />
      <Estadistica x={237} etiqueta="Racha" valor={String(datos.racha)} />
      {insignias.map((insignia, indice) => (
        <g key={insignia.codigo} transform={`translate(${inicioInsignias + indice * 50} 376)`}>
          <InsigniaMedalla tipo={insignia.tipo} umbral={insignia.valor_umbral} tamano={40} />
        </g>
      ))}
      <text x={150} y={510} textAnchor="middle" fontFamily={FUENTE} fontSize={12} fill="#a3abbb">
        Centro de Entrenamiento FR
      </text>
    </svg>
  );
}

const NOMBRE_ARCHIVO = "mi-ranking-mifr.png";

export function DialogoCompartirRanking({ datos, abierto, onCerrar }: { datos: DatosParaCompartir; abierto: boolean; onCerrar: () => void }) {
  const refSvg = useRef<SVGSVGElement>(null);
  const [generando, setGenerando] = useState(false);

  async function conImagen(accion: (imagen: Blob) => Promise<unknown> | void) {
    if (!refSvg.current) return;
    setGenerando(true);
    try {
      await accion(await svgAPng(refSvg.current));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar la imagen.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <DialogPrimitive.Root open={abierto} onOpenChange={(abrir) => !abrir && onCerrar()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col items-center gap-3.5 overflow-y-auto bg-bg-light px-4 pt-4 pb-5 text-foreground dark:bg-canvas"
        >
          <div className="flex w-full max-w-md items-center justify-between">
            <DialogPrimitive.Title className="font-bold">Compartir en historia</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="-mr-2.5 flex size-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <X aria-hidden="true" className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <TarjetaRanking datos={datos} refSvg={refSvg} />
          <div className="grid w-full max-w-md grid-cols-[minmax(0,1fr)_auto] gap-2">
            <button
              type="button"
              disabled={generando}
              onClick={() => void conImagen((imagen) => compartirImagen(imagen, NOMBRE_ARCHIVO, "Mi ranking en MiFR"))}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              <Share aria-hidden="true" className="size-4.5" />
              Compartir
            </button>
            <button
              type="button"
              aria-label="Descargar imagen"
              disabled={generando}
              onClick={() => void conImagen((imagen) => descargarArchivo(imagen, NOMBRE_ARCHIVO))}
              className="flex size-11 items-center justify-center rounded-xl border border-slate-400 bg-card hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-white/5"
            >
              <Download aria-hidden="true" className="size-4.5" />
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
