import { CampoFecha } from "@/components/formulario/campo-fecha";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { esMenorDeEdad, obtenerLimitesFechaNacimiento } from "../../utils/edad";
import { cn } from "@/utils/cn";
import type { AlumnoFormData } from "../../schemas/alumno.schema";
import { CAMPO_MODAL, FILA_DE_CAMPOS_MODAL } from "@/components/ui/estilos-modal";
import { soloDigitosDeTelefono } from "@/utils/entrada-numerica";

const CLASE_CON_ERROR = "border-destructive focus-visible:ring-destructive";
const MAXIMO_DIGITOS_DNI = 8;

const idDelError = (campo: string) => `error-${campo.replace(".", "-")}`;
const soloDigitosDeDni = (valor: string) => valor.replace(/\D/g, "").slice(0, MAXIMO_DIGITOS_DNI);

function MensajeError({ campo, errores }: { campo: string; errores: Record<string, string> }) {
  if (!errores[campo]) return null;
  return (
    <p id={idDelError(campo)} className="text-xs text-destructive font-medium mt-1">
      {errores[campo]}
    </p>
  );
}

interface Paso1DatosPersonalesProps {
  datos: AlumnoFormData;
  onChange: (nuevosDatos: AlumnoFormData) => void;
  errores: Record<string, string>;
  onRevisarCampo: (campo: string) => void;
  edadCalculada: number | null;
  menorDeEdad: boolean;
}

export function Paso1DatosPersonales({
  datos,
  onChange,
  errores,
  onRevisarCampo,
  menorDeEdad,
}: Paso1DatosPersonalesProps) {
  const limitesFecha = obtenerLimitesFechaNacimiento();

  const propsDeCampo = (campo: string, className?: string) => ({
    onBlur: () => onRevisarCampo(campo),
    "aria-invalid": errores[campo] ? true : undefined,
    "aria-describedby": errores[campo] ? idDelError(campo) : undefined,
    className: cn(
      "h-10 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-primary/20",
      className,
      errores[campo] && CLASE_CON_ERROR,
    ),
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

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Nombre y Apellido */}
      <div className={FILA_DE_CAMPOS_MODAL}>
        <div className={CAMPO_MODAL}>
          <Label htmlFor="alumno-nombre" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="alumno-nombre"
            placeholder="Mateo"
            value={datos.nombre}
            onChange={(e) => actualizarCampo("nombre", e.target.value)}
            {...propsDeCampo("nombre")}
          />
          <MensajeError campo="nombre" errores={errores} />
        </div>

        <div className={CAMPO_MODAL}>
          <Label htmlFor="alumno-apellido" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            Apellido <span className="text-destructive">*</span>
          </Label>
          <Input
            id="alumno-apellido"
            placeholder="Romero"
            value={datos.apellido}
            onChange={(e) => actualizarCampo("apellido", e.target.value)}
            {...propsDeCampo("apellido")}
          />
          <MensajeError campo="apellido" errores={errores} />
        </div>
      </div>

      {/* 2. DNI y Fecha de nacimiento */}
      <div className={FILA_DE_CAMPOS_MODAL}>
        <div className={CAMPO_MODAL}>
          <Label htmlFor="alumno-dni" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            DNI <span className="text-destructive">*</span>
          </Label>
          <Input
            id="alumno-dni"
            inputMode="numeric"
            placeholder="52111222"
            value={datos.dni || ""}
            onChange={(e) => actualizarCampo("dni", soloDigitosDeDni(e.target.value))}
            {...propsDeCampo("dni")}
          />
          <MensajeError campo="dni" errores={errores} />
        </div>

        <div className={CAMPO_MODAL}>
          <Label htmlFor="alumno-fecha-nac" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            Fecha de nacimiento <span className="text-destructive">*</span>
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
      </div>

      {/* 3. Teléfono y (si es mayor) Email */}
      <div className={cn("grid gap-3 sm:gap-4", !menorDeEdad ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
        <div className={CAMPO_MODAL}>
          <Label htmlFor="alumno-telefono" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="alumno-telefono"
            type="tel"
            inputMode="numeric"
            placeholder="Ej: 3514112233"
            value={datos.telefono || ""}
            onChange={(e) => actualizarCampo("telefono", soloDigitosDeTelefono(e.target.value))}
            {...propsDeCampo("telefono")}
          />
          <MensajeError campo="telefono" errores={errores} />
        </div>

        {!menorDeEdad && (
          <div className={CAMPO_MODAL}>
            <Label htmlFor="alumno-email" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="alumno-email"
              type="email"
              placeholder="Ej: alumno@gmail.com"
              value={datos.email || ""}
              onChange={(e) => actualizarCampo("email", e.target.value)}
              {...propsDeCampo("email")}
            />
            <MensajeError campo="email" errores={errores} />
          </div>
        )}
      </div>

      {/* 4. Contacto y teléfono de emergencia */}
      <div className={FILA_DE_CAMPOS_MODAL}>
        <div className={CAMPO_MODAL}>
          <Label htmlFor="cont-emerg-nombre" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            Contacto de emergencia <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cont-emerg-nombre"
            placeholder="Paula Romero (mamá)"
            value={datos.cont_emerg_nombre || ""}
            onChange={(e) => actualizarCampo("cont_emerg_nombre", e.target.value)}
            {...propsDeCampo("cont_emerg_nombre")}
          />
          <MensajeError campo="cont_emerg_nombre" errores={errores} />
        </div>

        <div className={CAMPO_MODAL}>
          <Label htmlFor="cont-emerg-telefono" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            Teléfono de emergencia <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cont-emerg-telefono"
            type="tel"
            inputMode="numeric"
            placeholder="Ej: 3515556677"
            value={datos.cont_emerg_telefono || ""}
            onChange={(e) => actualizarCampo("cont_emerg_telefono", soloDigitosDeTelefono(e.target.value))}
            {...propsDeCampo("cont_emerg_telefono")}
          />
          <MensajeError campo="cont_emerg_telefono" errores={errores} />
        </div>
      </div>

      {/* 5. TUTOR (ES MENOR) - Solo aparece si es menor el alumno */}
      {menorDeEdad && (
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tutor (Es menor)
            </span>
          </div>

          <div className={FILA_DE_CAMPOS_MODAL}>
            <div className={CAMPO_MODAL}>
              <Label htmlFor="tutor-nombre" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tutor-nombre"
                placeholder="Ej: Paula"
                value={datos.tutor?.nombre || ""}
                onChange={(e) => actualizarTutor("nombre", e.target.value)}
                {...propsDeCampo("tutor.nombre")}
              />
              <MensajeError campo="tutor.nombre" errores={errores} />
            </div>

            <div className={CAMPO_MODAL}>
              <Label htmlFor="tutor-apellido" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Apellido <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tutor-apellido"
                placeholder="Ej: Romero"
                value={datos.tutor?.apellido || ""}
                onChange={(e) => actualizarTutor("apellido", e.target.value)}
                {...propsDeCampo("tutor.apellido")}
              />
              <MensajeError campo="tutor.apellido" errores={errores} />
            </div>

            <div className={CAMPO_MODAL}>
              <Label htmlFor="tutor-fecha-nac" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Fecha de nacimiento <span className="text-destructive">*</span>
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

            <div className={CAMPO_MODAL}>
              <Label htmlFor="tutor-telefono" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Teléfono <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tutor-telefono"
                type="tel"
                inputMode="numeric"
                placeholder="Ej: 3515556677"
                value={datos.tutor?.telefono || ""}
                onChange={(e) => actualizarTutor("telefono", soloDigitosDeTelefono(e.target.value))}
                {...propsDeCampo("tutor.telefono")}
              />
              <MensajeError campo="tutor.telefono" errores={errores} />
            </div>

            <div className={CAMPO_MODAL}>
              <Label htmlFor="tutor-email" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tutor-email"
                type="email"
                placeholder="Ej: paula@gmail.com"
                value={datos.tutor?.email || ""}
                onChange={(e) => actualizarTutor("email", e.target.value)}
                {...propsDeCampo("tutor.email")}
              />
              <MensajeError campo="tutor.email" errores={errores} />
            </div>
          </div>
        </div>
      )}

      {/* 6. Dirección */}
      <div className={CAMPO_MODAL}>
        <Label htmlFor="alumno-direccion" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
          Dirección <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          id="alumno-direccion"
          placeholder="Calle, número, barrio o departamento"
          value={datos.direccion || ""}
          onChange={(e) => actualizarCampo("direccion", e.target.value)}
          {...propsDeCampo("direccion")}
        />
        <MensajeError campo="direccion" errores={errores} />
      </div>

      {/* 7. Apto médico: la fecha se pide solo si lo presentó */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
          <Label htmlFor="apto-medico-toggle" className="text-xs sm:text-sm font-semibold cursor-pointer text-slate-800 dark:text-slate-200">
            Apto médico <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Switch
            id="apto-medico-toggle"
            checked={datos.apto_medico}
            onCheckedChange={(checked) => actualizarCampo("apto_medico", checked)}
          />
        </div>

        {datos.apto_medico && (
          <div className={CAMPO_MODAL}>
            <Label htmlFor="fecha-apto" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              Fecha de emisión del apto <span className="text-destructive">*</span>
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
        )}

        <div className={CAMPO_MODAL}>
          <Label htmlFor="observaciones" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            Observaciones o antecedentes médicos <span className="text-muted-foreground font-normal">(opcional)</span>
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
}
