import { ShieldAlert, HeartPulse, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { esMenorDeEdad } from "../../utils/edad";
import type { AlumnoFormData } from "../../schemas/alumno.schema";

interface Paso1DatosPersonalesProps {
  datos: AlumnoFormData;
  onChange: (nuevosDatos: AlumnoFormData) => void;
  errores: Record<string, string>;
  edadCalculada: number | null;
  menorDeEdad: boolean;
}

export function Paso1DatosPersonales({
  datos,
  onChange,
  errores,
  edadCalculada,
  menorDeEdad,
}: Paso1DatosPersonalesProps) {
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
    <div className="space-y-6">
      {/* 1. Datos básicos del Alumno */}
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
              className={errores.nombre ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errores.nombre && <p className="text-xs text-destructive">{errores.nombre}</p>}
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
              className={errores.apellido ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errores.apellido && <p className="text-xs text-destructive">{errores.apellido}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alumno-fecha-nac" className="text-xs font-medium">
              Fecha de Nacimiento <span className="text-destructive">*</span>
            </Label>
            <Input
              id="alumno-fecha-nac"
              type="date"
              value={datos.fecha_nacimiento}
              onChange={(e) => {
                const nuevaFecha = e.target.value;
                const esMenor = esMenorDeEdad(nuevaFecha);
                onChange({
                  ...datos,
                  fecha_nacimiento: nuevaFecha,
                  email: esMenor ? "" : datos.email,
                });
              }}
              className={errores.fecha_nacimiento ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errores.fecha_nacimiento && <p className="text-xs text-destructive">{errores.fecha_nacimiento}</p>}
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
              className={
                errores.email
                  ? "border-destructive focus-visible:ring-destructive"
                  : menorDeEdad
                    ? "bg-muted/50 cursor-not-allowed opacity-75 text-muted-foreground"
                    : ""
              }
            />
            {errores.email && <p className="text-xs text-destructive">{errores.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alumno-telefono" className="text-xs font-medium">
              Teléfono de Contacto {!menorDeEdad ? <span className="text-destructive">*</span> : <span className="text-muted-foreground font-normal text-[11px]">(Opcional para menores)</span>}
            </Label>
            <Input
              id="alumno-telefono"
              placeholder={menorDeEdad ? "Opcional" : "Ej: 3514123456"}
              value={datos.telefono || ""}
              onChange={(e) => actualizarCampo("telefono", e.target.value)}
              className={errores.telefono ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errores.telefono && <p className="text-xs text-destructive">{errores.telefono}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alumno-dni" className="text-xs font-medium">
              DNI
            </Label>
            <Input
              id="alumno-dni"
              placeholder="..."
              value={datos.dni || ""}
              onChange={(e) => actualizarCampo("dni", e.target.value)}
              className={errores.dni ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errores.dni && <p className="text-xs text-destructive">{errores.dni}</p>}
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
              className={errores.direccion ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errores.direccion && <p className="text-xs text-destructive">{errores.direccion}</p>}
          </div>
        </div>
      </div>

      {/* 2. Sección Tutor Legal si es menor de edad */}
      {menorDeEdad && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Datos del Tutor / Responsable ({edadCalculada} {edadCalculada === 1 ? "año" : "años"})
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Requerido para alumnos menores de edad.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="tutor-nombre" className="text-xs font-medium text-amber-950 dark:text-amber-100">
                Nombre del Tutor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tutor-nombre"
                placeholder="Nombre"
                value={datos.tutor?.nombre || ""}
                onChange={(e) => actualizarTutor("nombre", e.target.value)}
                className={errores["tutor.nombre"] ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errores["tutor.nombre"] && <p className="text-xs text-destructive">{errores["tutor.nombre"]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tutor-apellido" className="text-xs font-medium text-amber-950 dark:text-amber-100">
                Apellido del Tutor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tutor-apellido"
                placeholder="Apellido"
                value={datos.tutor?.apellido || ""}
                onChange={(e) => actualizarTutor("apellido", e.target.value)}
                className={errores["tutor.apellido"] ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errores["tutor.apellido"] && <p className="text-xs text-destructive">{errores["tutor.apellido"]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tutor-email" className="text-xs font-medium text-amber-950 dark:text-amber-100">
                Email del Tutor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tutor-email"
                type="email"
                placeholder="tutor@ejemplo.com"
                value={datos.tutor?.email || ""}
                onChange={(e) => actualizarTutor("email", e.target.value)}
                className={errores["tutor.email"] ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errores["tutor.email"] && <p className="text-xs text-destructive">{errores["tutor.email"]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tutor-telefono" className="text-xs font-medium text-amber-950 dark:text-amber-100">
                Teléfono del Tutor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tutor-telefono"
                placeholder="Ej: 3515556677"
                value={datos.tutor?.telefono || ""}
                onChange={(e) => actualizarTutor("telefono", e.target.value)}
                className={errores["tutor.telefono"] ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errores["tutor.telefono"] && <p className="text-xs text-destructive">{errores["tutor.telefono"]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tutor-fecha-nac" className="text-xs font-medium text-amber-950 dark:text-amber-100">
                Fecha Nac. Tutor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tutor-fecha-nac"
                type="date"
                value={datos.tutor?.fecha_nacimiento || ""}
                onChange={(e) => actualizarTutor("fecha_nacimiento", e.target.value)}
                className={errores["tutor.fecha_nacimiento"] ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errores["tutor.fecha_nacimiento"] && (
                <p className="text-xs text-destructive">{errores["tutor.fecha_nacimiento"]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tutor-dni" className="text-xs font-medium text-amber-950 dark:text-amber-100">
                DNI del Tutor
              </Label>
              <Input
                id="tutor-dni"
                placeholder="Opcional"
                value={datos.tutor?.dni || ""}
                onChange={(e) => actualizarTutor("dni", e.target.value)}
                className={errores["tutor.dni"] ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errores["tutor.dni"] && <p className="text-xs text-destructive">{errores["tutor.dni"]}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 3. Apto Médico y Observaciones */}
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
                Fecha de Emisión del Apto
              </Label>
              <Input
                id="fecha-apto"
                type="date"
                value={datos.fecha_apto_medico || ""}
                onChange={(e) => actualizarCampo("fecha_apto_medico", e.target.value)}
              />
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
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cont-emerg-telefono" className="text-xs font-medium">
              Teléfono de Emergencia
            </Label>
            <Input
              id="cont-emerg-telefono"
              placeholder="Ej: 3514789012"
              value={datos.cont_emerg_telefono || ""}
              onChange={(e) => actualizarCampo("cont_emerg_telefono", e.target.value)}
              className={errores.cont_emerg_telefono ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errores.cont_emerg_telefono && (
              <p className="text-xs text-destructive">{errores.cont_emerg_telefono}</p>
            )}
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
            value={datos.observaciones || ""}
            onChange={(e) => actualizarCampo("observaciones", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
