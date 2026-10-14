import { User, ShieldCheck, Dumbbell, Info, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AlumnoFormData } from "../../schemas/alumno.schema";
import type { PlanApiRespuesta } from "@/types/plan";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { MedidasCorporalesForm } from "../../schemas/medidas-corporales";

interface Paso4ResumenConfirmacionProps {
  datosAlumno: AlumnoFormData;
  menorDeEdad: boolean;
  edadCalculada: number | null;
  plan: PlanApiRespuesta | null;
  profesora: ProfesoraDatos | null;
  horariosSeleccionados: HorarioApi[];
  sinCargo: boolean;
  fechaInicio: string;
  /** Solo si alguna actividad elegida las pide. */
  medidas: MedidasCorporalesForm | null;
  observacionesInscripcion: string;
  onChangeObservacionesInscripcion: (val: string) => void;
}

const DIAS_NOMBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatoHora(horaIso: string): string {
  if (horaIso.includes("T")) {
    const parte = horaIso.split("T")[1];
    return parte.slice(0, 5);
  }
  return horaIso.slice(0, 5);
}

export function Paso4ResumenConfirmacion({
  datosAlumno,
  menorDeEdad,
  edadCalculada,
  plan,
  profesora,
  horariosSeleccionados,
  sinCargo,
  fechaInicio,
  medidas,
  observacionesInscripcion,
  onChangeObservacionesInscripcion,
}: Paso4ResumenConfirmacionProps) {
  const actividades = [...new Set(horariosSeleccionados.map((h) => h.actividad.nombre))];

  return (
    <div className="space-y-6">
      {/* Aviso de Pre-inscripción PENDIENTE */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-950 dark:text-blue-100">
        <Info className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-sm">Estado inicial: Pendiente</p>
          <p className="text-muted-foreground dark:text-blue-200/80">
            Al confirmar, el alumno queda registrado con sus horarios reservados. Pasará a estado <strong>ACTIVO</strong> al registrarse su primer pago.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ficha Alumno */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <User className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Datos del Alumno
            </h4>
            <Badge variant="outline" className="ml-auto text-[11px]">
              {edadCalculada} años
            </Badge>
          </div>

          <div className="text-xs space-y-1.5 text-foreground">
            <p className="font-semibold text-sm">
              {datosAlumno.nombre} {datosAlumno.apellido}
            </p>
            <p className="text-muted-foreground">
              <strong>DNI:</strong> {datosAlumno.dni || "No especificado"}
            </p>
            <p className="text-muted-foreground">
              <strong>Email:</strong> {menorDeEdad ? "No aplica a menores" : (datosAlumno.email || "No especificado")}
            </p>
            <p className="text-muted-foreground">
              <strong>Teléfono:</strong> {datosAlumno.telefono || "No especificado"}
            </p>
            {datosAlumno.direccion && (
              <p className="text-muted-foreground">
                <strong>Dirección:</strong> {datosAlumno.direccion}
              </p>
            )}
            <p className="text-muted-foreground">
              <strong>Apto Médico:</strong> {datosAlumno.apto_medico ? "Sí (presentado)" : "Pendiente"}
            </p>
          </div>
        </div>

        {/* Ficha Tutor Legal si corresponde */}
        {menorDeEdad && datosAlumno.tutor && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-amber-500/20">
              <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Tutor / Responsable
              </h4>
            </div>

            <div className="text-xs space-y-1.5 text-foreground">
              <p className="font-semibold text-sm text-amber-950 dark:text-amber-100">
                {datosAlumno.tutor.nombre} {datosAlumno.tutor.apellido}
              </p>
              <p className="text-muted-foreground">
                <strong>Email:</strong> {datosAlumno.tutor.email}
              </p>
              <p className="text-muted-foreground">
                <strong>Teléfono:</strong> {datosAlumno.tutor.telefono}
              </p>
              <p className="text-muted-foreground">
                <strong>DNI:</strong> {datosAlumno.tutor.dni || "No especificado"}
              </p>
            </div>
          </div>
        )}

        {/* Ficha Plan y Profesora */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Dumbbell className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Plan y Docente
            </h4>
          </div>

          <div className="text-xs space-y-1.5 text-foreground">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{plan?.nombre}</p>
              <span className="font-bold text-sm text-primary">
                {sinCargo ? "Sin cargo" : `$${plan?.precio_vigente?.precio?.toLocaleString("es-AR") || "—"}`}
              </span>
            </div>
            <p className="text-muted-foreground">
              <strong>Profesora:</strong> {profesora ? `${profesora.nombre} ${profesora.apellido}` : "—"}
            </p>
            {/* Un plan Multi-actividad puede combinar varias: salen de los horarios elegidos. */}
            {actividades.length > 0 && (
              <p className="text-muted-foreground">
                <strong>{actividades.length === 1 ? "Actividad" : "Actividades"}:</strong> {actividades.join(", ")}
              </p>
            )}
            <p className="text-muted-foreground">
              <strong>Fecha inicio:</strong> {fechaInicio}
            </p>
            {medidas && (
              <p className="text-muted-foreground">
                <strong>Peso y talla:</strong> {medidas.peso_kg} kg · {medidas.talla_cm} cm
              </p>
            )}
            <p className="text-muted-foreground">
              <strong>Modalidad:</strong> {plan?.tipo === "CLASE_SUELTA" ? "Pase individual" : `${plan?.clases_por_semana} clases semanales`}
            </p>
          </div>
        </div>

        {/* Ficha Horarios Elegidos */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Clock className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Horarios Reservados ({horariosSeleccionados.length})
            </h4>
          </div>

          <div className="space-y-2">
            {horariosSeleccionados.map((h) => {
              const dia = DIAS_NOMBRES[h.dia_semana - 1];
              return (
                <div
                  key={h.id_horario}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs"
                >
                  <span className="font-semibold">{dia}</span>
                  <span className="text-muted-foreground">
                    {formatoHora(h.hora_inicio)} - {formatoHora(h.hora_fin)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {h.actividad.nombre}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Observaciones finales */}
      <div className="space-y-1.5">
        <Label htmlFor="obs-preinscripcion" className="text-xs font-medium">
          Observaciones de la Inscripción (Opcional)
        </Label>
        <Textarea
          id="obs-preinscripcion"
          rows={2}
          placeholder="Notas internas sobre promociones, días de gracia o condiciones pactadas..."
          value={observacionesInscripcion}
          onChange={(e) => onChangeObservacionesInscripcion(e.target.value)}
        />
      </div>
    </div>
  );
};
