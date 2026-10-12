import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { calcularEdad, esMenorDeEdad } from "../utils/edad";
import { alumnoFormSchema, type AlumnoFormData } from "../schemas/alumno.schema";
import { crearAlumno } from "../api/alumnos-api";
import { crearInscripcion } from "../api/inscripciones-api";
import { useInvalidarAlumnos } from "./use-alumnos";
import type { PlanApiRespuesta } from "@/types/plan";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";

export type PasoPreinscripcion = 1 | 2 | 3 | 4;

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

interface UsePreinscripcionProps {
  planes: PlanApiRespuesta[];
  profesoras: ProfesoraDatos[];
  horarios: HorarioApi[];
  onExito?: () => void;
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
  const [sinCargo, setSinCargo] = useState<boolean>(false);
  const [fechaInicio, setFechaInicio] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [observacionesInscripcion, setObservacionesInscripcion] = useState<string>("");

  // Estado de envío
  const [enviando, setEnviando] = useState(false);

  // Derivados de Paso 1
  const edadCalculada = useMemo(() => calcularEdad(datosAlumno.fecha_nacimiento), [datosAlumno.fecha_nacimiento]);
  const menorDeEdad = useMemo(() => esMenorDeEdad(datosAlumno.fecha_nacimiento), [datosAlumno.fecha_nacimiento]);

  // Plan y Profesora seleccionados
  const planSeleccionado = useMemo(() => planes.find((p) => p.id_plan === idPlan) ?? null, [planes, idPlan]);

  const clasesRequeridas = useMemo(() => {
    if (!planSeleccionado) return 0;
    if (planSeleccionado.tipo === "CLASE_SUELTA") return 1;
    return planSeleccionado.clases_por_semana ?? 1;
  }, [planSeleccionado]);

  // Horarios filtrados para la profesora y modalidad elegidas
  const horariosDisponibles = useMemo(() => {
    if (!idProfesora) return [];
    return horarios.filter((h) => {
      if (h.id_profesora !== idProfesora) return false;
      // Si el plan tiene actividad exclusiva, filtrar por esa actividad
      if (planSeleccionado?.id_actividad_exclusiva) {
        return h.id_actividad === planSeleccionado.id_actividad_exclusiva;
      }
      return true;
    });
  }, [horarios, idProfesora, planSeleccionado]);

  // Manejo de horarios seleccionados (toggle)
  const toggleHorario = useCallback(
    (idHorario: number) => {
      setIdsHorarios((actuales) => {
        if (actuales.includes(idHorario)) {
          return actuales.filter((id) => id !== idHorario);
        }
        if (actuales.length >= clasesRequeridas) {
          toast.warning(`Este plan incluye ${clasesRequeridas} clase(s) por semana.`);
          return actuales;
        }
        return [...actuales, idHorario];
      });
    },
    [clasesRequeridas],
  );

  // Validaciones para navegación
  const validarPaso1 = useCallback((): boolean => {
    const resultado = alumnoFormSchema.safeParse(datosAlumno);
    if (!resultado.success) {
      const mapaErrores: Record<string, string> = {};
      resultado.error.issues.forEach((issue) => {
        const campo = issue.path.join(".");
        mapaErrores[campo] = issue.message;
      });
      setErroresPaso1(mapaErrores);
      toast.error("Por favor revisá los campos con errores.");
      return false;
    }
    setErroresPaso1({});
    return true;
  }, [datosAlumno]);

  const validarPaso2 = useCallback((): boolean => {
    if (!idPlan) {
      toast.error("Debes seleccionar un plan de entrenamiento.");
      return false;
    }
    if (!idProfesora) {
      toast.error("Debes seleccionar una profesora.");
      return false;
    }
    return true;
  }, [idPlan, idProfesora]);

  const validarPaso3 = useCallback((): boolean => {
    if (idsHorarios.length !== clasesRequeridas) {
      toast.error(`Debes seleccionar exactamente ${clasesRequeridas} horario(s) para este plan.`);
      return false;
    }
    return true;
  }, [idsHorarios.length, clasesRequeridas]);

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
    setSinCargo(false);
    setObservacionesInscripcion("");
  }, []);

  // Confirmar y guardar la pre-inscripción
  const confirmarPreinscripcion = useCallback(async () => {
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
        fecha_apto_medico: datosAlumno.fecha_apto_medico?.trim() || null,
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
      await crearInscripcion({
        id_alumno: alumnoCreado.id_alumno,
        id_plan: idPlan,
        id_profesora: idProfesora,
        ids_horarios: idsHorarios,
        sin_cargo: sinCargo,
        fecha_inicio: fechaInicio,
        observaciones: observacionesInscripcion.trim() || null,
      });

      await invalidarAlumnos();
      toast.success("¡Pre-inscripción registrada con éxito! El alumno queda en estado PENDIENTE.");
      reiniciar();
      onExito?.();
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
    sinCargo,
    fechaInicio,
    observacionesInscripcion,
    invalidarAlumnos,
    reiniciar,
    onExito,
  ]);

  return {
    paso,
    setPaso,
    datosAlumno,
    setDatosAlumno,
    erroresPaso1,
    edadCalculada,
    menorDeEdad,
    esSoloProfesora,
    idPlan,
    setIdPlan,
    planSeleccionado,
    idProfesora,
    setIdProfesora,
    idsHorarios,
    toggleHorario,
    clasesRequeridas,
    horariosDisponibles,
    sinCargo,
    setSinCargo,
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
