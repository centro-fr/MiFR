import { ShieldAlert, HeartPulse, User } from "lucide-react";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { esMenorDeEdad, obtenerLimitesFechaNacimiento } from "../../utils/edad";
import { cn } from "@/utils/cn";
import type { AlumnoFormData } from "../../schemas/alumno.schema";

const CLASE_CON_ERROR = "border-destructive focus-visible:ring-destructive";
const MAXIMO_DIGITOS_DNI = 8;

// Los "." de "tutor.email" no sirven en un id.
const idDelError = (campo: string) => `error-${campo.replace(".", "-")}`;

// Se escribe o se pega "38.123.456": se guardan solo los dígitos, que es lo que pide el back.
const soloDigitosDeDni = (valor: string) => valor.replace(/\D/g, "").slice(0, MAXIMO_DIGITOS_DNI);

function MensajeError({ campo, errores }: { campo: string; errores: Record<string, string> }) {
  if (!errores[campo]) return null;
  return (
    <p id={idDelError(campo)} className="text-xs text-destructive">
      {errores[campo]}
    </p>
  );
}

interface Paso1DatosPersonalesProps {
  datos: AlumnoFormData;
  onChange: (nuevosDatos: AlumnoFormData) => void;
  errores: Record<string, string>;
  /** Al salir de un campo: avisa si quedó mal completado. */
  onRevisarCampo: (campo: string) => void;
  edadCalculada: number | null;
  menorDeEdad: boolean;
}

export function Paso1DatosPersonales({
  datos,
  onChange,
  errores,
  onRevisarCampo,
  edadCalculada,
  menorDeEdad,
}: Paso1DatosPersonalesProps) {
  const limitesFecha = obtenerLimitesFechaNacimiento();

  // Lo que comparte cada campo validado: marca en rojo, error anunciado por el lector de pantalla
  // y revisión al salir.
  const propsDeCampo = (campo: string, className?: string) => ({
    onBlur: () => onRevisarCampo(campo),
    "aria-invalid": errores[campo] ? true : undefined,
    "aria-describedby": errores[campo] ? idDelError(campo) : undefined,
    className: cn(className, errores[campo] && CLASE_CON_ERROR),
  });

  const actualizarCampo = <K extends keyof AlumnoFormData>(campo: K, valor: AlumnoFormData[K]) => {
    onChange({
      ...datos,
      [campo]: valor,
    });
  };

  const actualizarTutor = (campo: string, valor: string) => {
    onChange({
      ...datos,
      tutor: {
        ...(datos.tutor || {
          nombre: "",
          apellido: "",
          dni: "",
          telefono: "",
          email: "",
          fecha_nacimiento: "",
        }),
        [campo]: valor,
      },
    });
  };

  const seccionTutor = menorDeEdad && (
    <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="size-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Datos del Tutor / Responsable ({edadCalculada} {edadCalculada === 1 ? "año" : "años"})
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Requerido para alumnos menores de edad.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div className="space-y-1.5">
          <Label htmlFor="tutor-nombre" className="text-xs font-medium">
            Nombre del Tutor <span className="text-destructive">*</span>
          </Label>
          <Input
            id="tutor-nombre"
            placeholder="Nombre"
            value={datos.tutor?.nombre || ""}
            onChange={(e) => actualizarTutor("nombre", e.target.value)}
            {...propsDeCampo("tutor.nombre")}
          />
          <MensajeError campo="tutor.nombre" errores={errores} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tutor-apellido" className="text-xs font-medium">
            Apellido del Tutor <span className="text-destructive">*</span>
          </Label>
          <Input
            id="tutor-apellido"
            placeholder="Apellido"
            value={datos.tutor?.apellido || ""}
            onChange={(e) => actualizarTutor("apellido", e.target.value)}
            {...propsDeCampo("tutor.apellido")}
          />
          <MensajeError campo="tutor.apellido" errores={errores} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tutor-email" className="text-xs font-medium">
            Email del Tutor <span className="text-destructive">*</span>
          </Label>
          <Input
            id="tutor-email"
            type="email"
            placeholder="tutor@ejemplo.com"
            value={datos.tutor?.email || ""}
            onChange={(e) => actualizarTutor("email", e.target.value)}
            {...propsDeCampo("tutor.email")}
          />
          <MensajeError campo="tutor.email" errores={errores} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tutor-telefono" className="text-xs font-medium">
            Teléfono del Tutor <span className="text-destructive">*</span>
          </Label>
          <Input
            id="tutor-telefono"
            type="tel"
            placeholder="Ej: 3515556677"
            value={datos.tutor?.telefono || ""}
            onChange={(e) => actualizarTutor("telefono", e.target.value)}
            {...propsDeCampo("tutor.telefono")}
          />
          <MensajeError campo="tutor.telefono" errores={errores} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tutor-fecha-nac" className="text-xs font-medium">
            Fecha Nac. Tutor <span className="text-destructive">*</span>
          </Label>
          <CampoFecha
            id="tutor-fecha-nac"
            etiquetaCalendario="Abrir calendario para la fecha de nacimiento del tutor"
            min={limitesFecha.min}
            max={limitesFecha.max}
            value={datos.tutor?.fecha_nacimiento || ""}
            onChange={(valor) => actualizarTutor("fecha_nacimiento", valor)}
            {...propsDeCampo("tutor.fecha_nacimiento")}
          />
          <MensajeError campo="tutor.fecha_nacimiento" errores={errores} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tutor-dni" className="text-xs font-medium">
            DNI del Tutor
          </Label>
          <Input
            id="tutor-dni"
            inputMode="numeric"
            placeholder="Opcional, sin puntos"
            value={datos.tutor?.dni || ""}
            onChange={(e) => actualizarTutor("dni", soloDigitosDeDni(e.target.value))}
            {...propsDeCampo("tutor.dni")}
          />
          <MensajeError campo="tutor.dni" errores={errores} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Datos básicos del Alumno */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <User className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Datos del Alumno/a
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="alumno-nombre" className="text-xs font-medium">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="alumno-nombre"
              placeholder="Ej: Lucía"
              value={datos.nombre}
              onChange={(e) => actualizarCampo("nombre", e.target.value)}
              {...propsDeCampo("nombre")}
            />
            <MensajeError campo="nombre" errores={errores} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alumno-apellido" className="text-xs font-medium">
              Apellido <span className="text-destructive">*</span>
            </Label>
            <Input
              id="alumno-apellido"
              placeholder="Ej: Gómez"
              value={datos.apellido}
              onChange={(e) => actualizarCampo("apellido", e.target.value)}
              {...propsDeCampo("apellido")}
            />
            <MensajeError campo="apellido" errores={errores} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alumno-fecha-nac" className="text-xs font-medium">
              Fecha de Nacimiento <span className="text-destructive">*</span>
            </Label>
            <CampoFecha
              id="alumno-fecha-nac"
              etiquetaCalendario="Abrir calendario para la fecha de nacimiento"
              min={limitesFecha.min}
              max={limitesFecha.max}
              value={datos.fecha_nacimiento}
              onChange={(nuevaFecha) => {
                const esMenor = esMenorDeEdad(nuevaFecha);
                onChange({
                  ...datos,
                  fecha_nacimiento: nuevaFecha,
                  email: esMenor ? "" : datos.email,
                });
              }}
              {...propsDeCampo("fecha_nacimiento")}
            />
            <MensajeError campo="fecha_nacimiento" errores={errores} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alumno-email" className="text-xs font-medium">
              Correo Electrónico {!menorDeEdad ? <span className="text-destructive">*</span> : <span className="text-muted-foreground font-normal text-[11px]">(No aplica a menores)</span>}
            </Label>
            <Input
              id="alumno-email"
              type="email"
              disabled={menorDeEdad}
              placeholder={menorDeEdad ? "Bloqueado" : "lucia@example.com"}
              value={menorDeEdad ? "" : (datos.email || "")}
              onChange={(e) => actualizarCampo("email", e.target.value)}
              autoComplete="off"
              {...propsDeCampo("email", menorDeEdad ? "bg-muted/50 cursor-not-allowed opacity-75 text-muted-foreground" : undefined)}
            />
            <MensajeError campo="email" errores={errores} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alumno-telefono" className="text-xs font-medium">
              Teléfono de Contacto {!menorDeEdad ? <span className="text-destructive">*</span> : <span className="text-muted-foreground font-normal text-[11px]">(Opcional para menores)</span>}
            </Label>
            <Input
              id="alumno-telefono"
              type="tel"
              placeholder={menorDeEdad ? "Opcional" : "Ej: 3514123456"}
              value={datos.telefono || ""}
              onChange={(e) => actualizarCampo("telefono", e.target.value)}
              {...propsDeCampo("telefono")}
            />
            <MensajeError campo="telefono" errores={errores} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alumno-dni" className="text-xs font-medium">
              DNI
            </Label>
            <Input
              id="alumno-dni"
              inputMode="numeric"
              placeholder="Ej: 38123456 (sin puntos)"
              value={datos.dni || ""}
              onChange={(e) => actualizarCampo("dni", soloDigitosDeDni(e.target.value))}
              {...propsDeCampo("dni")}
            />
            <MensajeError campo="dni" errores={errores} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="alumno-direccion" className="text-xs font-medium">
              Dirección
            </Label>
            <Input
              id="alumno-direccion"
              placeholder="Calle, número, barrio o departamento (opcional)"
              value={datos.direccion || ""}
              onChange={(e) => actualizarCampo("direccion", e.target.value)}
              {...propsDeCampo("direccion")}
            />
            <MensajeError campo="direccion" errores={errores} />
          </div>
        </div>
      </div>

      {/* El tutor aparece recién al cargar una fecha de nacimiento de menor: debajo del alumno, que
          es lo que lo hace necesario, y no arriba empujando el formulario que se está completando. */}
      {seccionTutor}

      {/* Apto Médico y Observaciones */}
      <div className="pt-2 border-t border-border/40 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <HeartPulse className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Ficha Médica y Contacto
          </h3>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
          <div className="space-y-0.5">
            <Label htmlFor="apto-medico-toggle" className="text-xs font-semibold cursor-pointer">
              ¿Posee certificado de Apto Médico?
            </Label>
            <p className="text-xs text-muted-foreground">
              Indica si presentó constancia médica para realizar actividad física.
            </p>
          </div>
          <Switch
            id="apto-medico-toggle"
            checked={datos.apto_medico}
            onCheckedChange={(checked) => actualizarCampo("apto_medico", checked)}
          />
        </div>

        {datos.apto_medico && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fecha-apto" className="text-xs font-medium">
                Fecha de Emisión del Apto <span className="text-destructive">*</span>
              </Label>
              <CampoFecha
                id="fecha-apto"
                etiquetaCalendario="Abrir calendario para la fecha de emisión del apto médico"
                min={datos.fecha_nacimiento || undefined}
                max={limitesFecha.max}
                value={datos.fecha_apto_medico || ""}
                onChange={(valor) => actualizarCampo("fecha_apto_medico", valor)}
                {...propsDeCampo("fecha_apto_medico")}
              />
              <MensajeError campo="fecha_apto_medico" errores={errores} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cont-emerg-nombre" className="text-xs font-medium">
              Contacto de Emergencia (Nombre)
            </Label>
            <Input
              id="cont-emerg-nombre"
              placeholder="Ej: Carlos Gómez (Hermano)"
              value={datos.cont_emerg_nombre || ""}
              onChange={(e) => actualizarCampo("cont_emerg_nombre", e.target.value)}
              {...propsDeCampo("cont_emerg_nombre")}
            />
            <MensajeError campo="cont_emerg_nombre" errores={errores} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cont-emerg-telefono" className="text-xs font-medium">
              Teléfono de Emergencia
            </Label>
            <Input
              id="cont-emerg-telefono"
              type="tel"
              placeholder="Ej: 3514789012"
              value={datos.cont_emerg_telefono || ""}
              onChange={(e) => actualizarCampo("cont_emerg_telefono", e.target.value)}
              {...propsDeCampo("cont_emerg_telefono")}
            />
            <MensajeError campo="cont_emerg_telefono" errores={errores} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="observaciones" className="text-xs font-medium">
            Observaciones o antecedentes físicos
          </Label>
          <Textarea
            id="observaciones"
            rows={2}
            placeholder="Lesiones previas, patologías, recomendaciones de entrenamiento..."
            maxLength={500}
            value={datos.observaciones || ""}
            onChange={(e) => actualizarCampo("observaciones", e.target.value)}
            {...propsDeCampo("observaciones")}
          />
          <MensajeError campo="observaciones" errores={errores} />
        </div>
      </div>
    </div>
  );
};
