import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { calcularEdad, esMenorDeEdad } from "../utils/edad";
import { fechaActualArgentina } from "@/utils/fecha";
import { MEDIDAS_VACIAS, medidasCorporalesSchema, type MedidasCorporalesForm } from "../schemas/medidas-corporales";
import { clasesRequeridasDelPlan, horariosDelPlan, profesorasDelPlan } from "../utils/plan-y-profesora";
import { alumnoFormSchema, type AlumnoFormData } from "../schemas/alumno.schema";
import { crearAlumno } from "../api/alumnos-api";
import { crearInscripcion } from "../api/inscripciones-api";
import { useInvalidarAlumnos } from "./use-alumnos";
import type { PlanApiRespuesta } from "@/types/plan";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";

export type PasoPreinscripcion = 1 | 2 | 3 | 4;

function erroresDelPaso1(datos: AlumnoFormData): Record<string, string> {
  const resultado = alumnoFormSchema.safeParse(datos);
  if (resultado.success) return {};
  const errores: Record<string, string> = {};
  // El primer error de cada campo es el más básico ("obligatorio" antes que "formato inválido").
  for (const issue of resultado.error.issues) errores[issue.path.join(".")] ??= issue.message;
  return errores;
}

// Campo con notación de puntos ("tutor.email"), igual que las claves de los errores.
function valorDelCampo(datos: AlumnoFormData, campo: string): string {
  const valor = campo.split(".").reduce<unknown>((actual, clave) => (actual as Record<string, unknown> | undefined)?.[clave], datos);
  return typeof valor === "string" ? valor.trim() : "";
}

export const VALOR_INICIAL_ALUMNO: AlumnoFormData = {
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  fecha_nacimiento: "",
  telefono: "",
  direccion: "",
  cont_emerg_nombre: "",
  cont_emerg_telefono: "",
  apto_medico: false,
  fecha_apto_medico: "",
  observaciones: "",
  tutor: {
    nombre: "",
    apellido: "",
    dni: "",
    telefono: "",
    email: "",
    fecha_nacimiento: "",
  },
};

export interface ResultadoPreinscripcion {
  idInscripcion: number;
  /** Se confirmó con "cobrar ahora": sigue el registro del primer cobro (US-07). */
  cobrarAhora: boolean;
}

interface UsePreinscripcionProps {
  planes: PlanApiRespuesta[];
  profesoras: ProfesoraDatos[];
  horarios: HorarioApi[];
  onExito?: (resultado: ResultadoPreinscripcion) => void;
}

export function usePreinscripcion({
  planes,
  profesoras,
  horarios,
  onExito,
}: UsePreinscripcionProps) {
  const { user } = useAuth();
  const invalidarAlumnos = useInvalidarAlumnos();

  // Paso actual
  const [paso, setPaso] = useState<PasoPreinscripcion>(1);

  // Formulario Paso 1
  const [datosAlumno, setDatosAlumno] = useState<AlumnoFormData>(VALOR_INICIAL_ALUMNO);
  const [erroresPaso1, setErroresPaso1] = useState<Record<string, string>>({});

  // Si el usuario logueado es Profesora pura (no Propietaria), auto-asignar su ID si existe
  const esSoloProfesora = Boolean(user?.roles.includes("PROFESORA") && !user?.roles.includes("PROPIETARIA"));

  // Buscar si la profesora corresponde al usuario actual
  const idProfesoraInicial = useMemo(() => {
    if (!esSoloProfesora || !user) return null;
    const coincidencia = profesoras.find(
      (p) => p.nombre.toLowerCase() === user.nombre.toLowerCase() && p.apellido.toLowerCase() === user.apellido.toLowerCase(),
    );
    return coincidencia ? Number(coincidencia.id) : null;
  }, [esSoloProfesora, user, profesoras]);

  // Formulario Paso 2 y 3
  const [idPlan, setIdPlan] = useState<number | null>(null);
  // Una profesora solo pre-inscribe a su nombre (el back responde 403 si no): para ella no se elige.
  const [idProfesoraElegida, setIdProfesora] = useState<number | null>(null);
  const idProfesora = esSoloProfesora ? idProfesoraInicial : idProfesoraElegida;
  const [idsHorarios, setIdsHorarios] = useState<number[]>([]);
  const [fechaInicio, setFechaInicio] = useState<string>(fechaActualArgentina);
  const [medidas, setMedidas] = useState<MedidasCorporalesForm>(MEDIDAS_VACIAS);
  const [erroresMedidas, setErroresMedidas] = useState<Partial<Record<keyof MedidasCorporalesForm, string>>>({});
  const [observacionesInscripcion, setObservacionesInscripcion] = useState<string>("");

  // Estado de envío
  const [enviando, setEnviando] = useState(false);

  // Derivados de Paso 1
  const edadCalculada = useMemo(() => calcularEdad(datosAlumno.fecha_nacimiento), [datosAlumno.fecha_nacimiento]);
  const menorDeEdad = useMemo(() => esMenorDeEdad(datosAlumno.fecha_nacimiento), [datosAlumno.fecha_nacimiento]);

  // Plan y Profesora seleccionados
  const planSeleccionado = useMemo(() => planes.find((p) => p.id_plan === idPlan) ?? null, [planes, idPlan]);

  const clasesRequeridas = clasesRequeridasDelPlan(planSeleccionado);

  // Solo las profesoras que pueden dar el plan elegido en una misma actividad: las demás dejarían trabado el paso 3.
  const profesorasCompatibles = useMemo(
    () => profesorasDelPlan(profesoras, horarios, planSeleccionado),
    [profesoras, horarios, planSeleccionado],
  );

  // US-05: si alguna actividad de los horarios elegidos pide peso y talla, se piden antes de confirmar.
  const actividadQuePideMedidas = useMemo(
    () => horarios.find((h) => idsHorarios.includes(h.id_horario) && h.actividad.requiere_medidas)?.actividad.nombre ?? null,
    [horarios, idsHorarios],
  );

  const actualizarMedidas = useCallback((nuevas: MedidasCorporalesForm) => {
    setMedidas(nuevas);
    setErroresMedidas({});
  }, []);

  const horariosDisponibles = useMemo(
    () => horariosDelPlan(horarios, planSeleccionado, idProfesora),
    [horarios, planSeleccionado, idProfesora],
  );

  // Manejo de horarios seleccionados (toggle) restringido a una única actividad
  const toggleHorario = useCallback(
    (idHorario: number) => {
      const horarioClickeado = horarios.find((h) => h.id_horario === idHorario);
      if (!horarioClickeado) return;

      setIdsHorarios((actuales) => {
        if (actuales.includes(idHorario)) {
          return actuales.filter((id) => id !== idHorario);
        }
        // Validar que no se mezclen actividades
        const primerHorario = horarios.find((h) => actuales.includes(h.id_horario));
        if (primerHorario && primerHorario.id_actividad !== horarioClickeado.id_actividad) {
          toast.warning(`Todas las clases deben ser de la misma actividad (${primerHorario.actividad.nombre}).`);
          return actuales;
        }
        if (actuales.length >= clasesRequeridas) {
          toast.warning(`Este plan incluye ${clasesRequeridas} clase(s) por semana.`);
          return actuales;
        }
        return [...actuales, idHorario];
      });
    },
    [horarios, clasesRequeridas],
  );

  // Validaciones para navegación
  const validarPaso1 = useCallback((): boolean => {
    const mapaErrores = erroresDelPaso1(datosAlumno);
    setErroresPaso1(mapaErrores);
    if (Object.keys(mapaErrores).length > 0) {
      toast.error("Por favor revisá los campos con errores.");
      return false;
    }
    return true;
  }, [datosAlumno]);

  // Un error marcado se actualiza mientras se escribe: desaparece apenas el campo queda bien. Los
  // campos sin error no se tocan, para no marcar en rojo lo que todavía no terminaron de completar.
  const actualizarDatosAlumno = useCallback((nuevosDatos: AlumnoFormData) => {
    setDatosAlumno(nuevosDatos);
    setErroresPaso1((previos) => {
      if (Object.keys(previos).length === 0) return previos;
      const actuales = erroresDelPaso1(nuevosDatos);
      return Object.fromEntries(Object.keys(previos).flatMap((campo) => (actuales[campo] ? [[campo, actuales[campo]]] : [])));
    });
  }, []);

  // Al salir de un campo completado se avisa si está mal. Los vacíos obligatorios se avisan al
  // tocar "Continuar": recorrer el formulario con Tab no lo llena de rojo.
  const revisarCampo = useCallback(
    (campo: string) => {
      if (!valorDelCampo(datosAlumno, campo)) return;
      const error = erroresDelPaso1(datosAlumno)[campo];
      setErroresPaso1((previos) => (error ? { ...previos, [campo]: error } : previos));
    },
    [datosAlumno],
  );

  const seleccionarPlan = useCallback(
    (id: number) => {
      setIdPlan(id);
      setIdsHorarios([]);
      // Si la profesora elegida no puede dar el plan nuevo, se la deselecciona en lugar de dejar
      // una combinación que el back rechazaría.
      const nuevoPlan = planes.find((p) => p.id_plan === id) ?? null;
      setIdProfesora((actual) =>
        actual !== null && profesorasDelPlan(profesoras, horarios, nuevoPlan).some((p) => Number(p.id) === actual) ? actual : null,
      );
    },
    [planes, profesoras, horarios],
  );

  const seleccionarProfesora = useCallback((id: number) => {
    setIdProfesora(id);
    setIdsHorarios([]);
  }, []);

  const validarPaso2 = useCallback((): boolean => {
    if (!idPlan) {
      toast.error("Debes seleccionar un plan de entrenamiento.");
      return false;
    }
    if (!idProfesora) {
      toast.error("Debes seleccionar una profesora.");
      return false;
    }
    // La profesora logueada no se elige: puede que no tenga horarios para este plan.
    if (!profesorasCompatibles.some((p) => Number(p.id) === idProfesora)) {
      toast.error("La profesora no tiene horarios suficientes para este plan.");
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
      toast.error("Ingresá una fecha de inicio válida (dd/mm/aaaa).");
      return false;
    }
    if (fechaInicio < fechaActualArgentina()) {
      toast.error("La fecha de inicio no puede ser anterior a hoy.");
      return false;
    }
    return true;
  }, [idPlan, idProfesora, profesorasCompatibles, fechaInicio]);

  const validarPaso3 = useCallback((): boolean => {
    if (idsHorarios.length !== clasesRequeridas) {
      toast.error(`Debes seleccionar exactamente ${clasesRequeridas} horario(s) para este plan.`);
      return false;
    }
    const horariosElegidos = horarios.filter((h) => idsHorarios.includes(h.id_horario));
    if (new Set(horariosElegidos.map((h) => h.id_actividad)).size > 1) {
      toast.error("Todos los horarios deben pertenecer a la misma actividad.");
      return false;
    }
    if (actividadQuePideMedidas) {
      const resultado = medidasCorporalesSchema.safeParse(medidas);
      if (!resultado.success) {
        const { fieldErrors } = resultado.error.flatten();
        setErroresMedidas({ peso_kg: fieldErrors.peso_kg?.[0], talla_cm: fieldErrors.talla_cm?.[0] });
        toast.error(`${actividadQuePideMedidas} pide el peso y la talla del alumno.`);
        return false;
      }
    }
    return true;
  }, [idsHorarios, clasesRequeridas, horarios, actividadQuePideMedidas, medidas]);

  const avanzarPaso = useCallback(() => {
    if (paso === 1) {
      if (validarPaso1()) setPaso(2);
    } else if (paso === 2) {
      if (validarPaso2()) setPaso(3);
    } else if (paso === 3) {
      if (validarPaso3()) setPaso(4);
    }
  }, [paso, validarPaso1, validarPaso2, validarPaso3]);

  const retrocederPaso = useCallback(() => {
    setPaso((p) => (p > 1 ? ((p - 1) as PasoPreinscripcion) : p));
  }, []);

  const reiniciar = useCallback(() => {
    setPaso(1);
    setDatosAlumno(VALOR_INICIAL_ALUMNO);
    setErroresPaso1({});
    setIdPlan(null);
    setIdProfesora(null);
    setIdsHorarios([]);
    setObservacionesInscripcion("");
    setFechaInicio(fechaActualArgentina());
    setMedidas(MEDIDAS_VACIAS);
    setErroresMedidas({});
  }, []);

  // Confirmar y guardar la pre-inscripción
  const confirmarPreinscripcion = useCallback(async ({ cobrarAhora = false }: { cobrarAhora?: boolean } = {}) => {
    if (!idPlan || !idProfesora || idsHorarios.length !== clasesRequeridas) {
      toast.error("Faltan datos requeridos para completar la pre-inscripción.");
      return;
    }

    setEnviando(true);
    try {
      // 1. Crear el Alumno (y tutor si corresponde)
      // Nota técnica: los menores de edad no llevan email de usuario ni de contacto (accede su tutor legal).
      const payloadAlumno = {
        nombre: datosAlumno.nombre.trim(),
        apellido: datosAlumno.apellido.trim(),
        dni: datosAlumno.dni?.trim() || undefined,
        email: menorDeEdad ? undefined : (datosAlumno.email?.trim() || undefined),
        fecha_nacimiento: datosAlumno.fecha_nacimiento,
        telefono: datosAlumno.telefono?.trim() || null,
        direccion: datosAlumno.direccion?.trim() || null,
        cont_emerg_nombre: datosAlumno.cont_emerg_nombre?.trim() || null,
        cont_emerg_telefono: datosAlumno.cont_emerg_telefono?.trim() || null,
        apto_medico: datosAlumno.apto_medico,
        // Si desmarcaron el apto, la fecha que habían cargado queda oculta y no se envía.
        fecha_apto_medico: (datosAlumno.apto_medico && datosAlumno.fecha_apto_medico?.trim()) || null,
        observaciones: datosAlumno.observaciones?.trim() || null,
        tutor:
          menorDeEdad &&
          datosAlumno.tutor?.nombre &&
          datosAlumno.tutor?.apellido &&
          datosAlumno.tutor?.telefono &&
          datosAlumno.tutor?.email &&
          datosAlumno.tutor?.fecha_nacimiento
            ? {
                nombre: datosAlumno.tutor.nombre.trim(),
                apellido: datosAlumno.tutor.apellido.trim(),
                dni: datosAlumno.tutor.dni?.trim() || undefined,
                telefono: datosAlumno.tutor.telefono.trim(),
                email: datosAlumno.tutor.email.trim(),
                fecha_nacimiento: datosAlumno.tutor.fecha_nacimiento,
              }
            : undefined,
      };

      const alumnoCreado = await crearAlumno(payloadAlumno);

      // 2. Crear la Pre-inscripción
      const inscripcion = await crearInscripcion({
        id_alumno: alumnoCreado.id_alumno,
        id_plan: idPlan,
        id_profesora: idProfesora,
        ids_horarios: idsHorarios,
        sin_cargo: false,
        fecha_inicio: fechaInicio,
        observaciones: observacionesInscripcion.trim() || null,
        // Ya validadas en el paso 3. Solo viajan si alguna actividad las pide.
        medidas: actividadQuePideMedidas ? medidasCorporalesSchema.parse(medidas) : undefined,
      });

      await invalidarAlumnos();
      toast.success(
        cobrarAhora
          ? "Pre-inscripción registrada. Ahora registrá el cobro de la primera cuota."
          : "¡Pre-inscripción registrada con éxito! El alumno queda en estado PENDIENTE.",
      );
      reiniciar();
      onExito?.({ idInscripcion: inscripcion.id_inscripcion, cobrarAhora });
    } catch (err) {
      toast.error(mensajeDeErrorApi(err, "No se pudo registrar la pre-inscripción"));
    } finally {
      setEnviando(false);
    }
  }, [
    idPlan,
    idProfesora,
    idsHorarios,
    clasesRequeridas,
    datosAlumno,
    menorDeEdad,
    fechaInicio,
    actividadQuePideMedidas,
    medidas,
    observacionesInscripcion,
    invalidarAlumnos,
    reiniciar,
    onExito,
  ]);

  return {
    paso,
    setPaso,
    datosAlumno,
    setDatosAlumno: actualizarDatosAlumno,
    revisarCampo,
    erroresPaso1,
    edadCalculada,
    menorDeEdad,
    esSoloProfesora,
    idPlan,
    setIdPlan: seleccionarPlan,
    planSeleccionado,
    idProfesora,
    setIdProfesora: seleccionarProfesora,
    profesorasCompatibles,
    actividadQuePideMedidas,
    medidas,
    setMedidas: actualizarMedidas,
    erroresMedidas,
    idsHorarios,
    toggleHorario,
    clasesRequeridas,
    horariosDisponibles,
    fechaInicio,
    setFechaInicio,
    observacionesInscripcion,
    setObservacionesInscripcion,
    enviando,
    avanzarPaso,
    retrocederPaso,
    reiniciar,
    confirmarPreinscripcion,
  };
}
