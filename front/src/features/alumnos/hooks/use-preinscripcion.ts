import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { calcularEdad, esMenorDeEdad } from "../utils/edad";
import { MEDIDAS_VACIAS, medidasCorporalesSchema, type MedidasCorporalesForm } from "../schemas/medidas-corporales";
import { clasesRequeridasDelPlan, horariosDelPlan, profesorasDelPlan } from "../utils/plan-y-profesora";
import { alumnoFormSchema, type AlumnoFormData } from "../schemas/alumno.schema";
import { crearAlumno, darDeBajaAlumno } from "../api/alumnos-api";
import { crearInscripcion } from "../api/inscripciones-api";
import {
  registrarPrimerPagoEnEfectivo,
  registrarTransferenciaRecibida,
  informarTransferenciaPrimerPago,
} from "../api/alta-definitiva-api";
import { useInvalidarAlumnos } from "./use-alumnos";
import type { PlanApiRespuesta } from "@/types/plan";
import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { DatosCobroPreinscripcion } from "../components/preinscripcion/Paso3Confirmar";
import { usePromociones } from "@/features/promociones/hooks/use-promociones";
import { calcularCotizacionCobro } from "@/features/cobros/api/cobros-api";
import { SIN_PROMOCION, idDePromocion, promocionesAplicables } from "@/features/cobros/utils/promociones-cobro";

const COBRO_INICIAL: DatosCobroPreinscripcion = {
  yaAbono: false,
  formaPago: "EFECTIVO",
  idPromocion: SIN_PROMOCION,
  titularCuenta: "",
};

export type PasoPreinscripcion = 1 | 2 | 3;

function erroresDelPaso1(datos: AlumnoFormData): Record<string, string> {
  const resultado = alumnoFormSchema.safeParse(datos);
  if (resultado.success) return {};
  const errores: Record<string, string> = {};
  for (const issue of resultado.error.issues) errores[issue.path.join(".")] ??= issue.message;
  return errores;
}

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
  idAlumno?: number;
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
  const onExitoRef = useRef(onExito);
  useEffect(() => {
    onExitoRef.current = onExito;
  }, [onExito]);

  // Paso actual (1: Alumno, 2: Plan y horarios, 3: Confirmar)
  const [paso, setPaso] = useState<PasoPreinscripcion>(1);
  const [exito, setExito] = useState(false);
  const [idInscripcionCreada, setIdInscripcionCreada] = useState<number | null>(null);
  const [idAlumnoCreado, setIdAlumnoCreado] = useState<number | null>(null);

  // Formulario Paso 1
  const [datosAlumno, setDatosAlumno] = useState<AlumnoFormData>(VALOR_INICIAL_ALUMNO);
  const [erroresPaso1, setErroresPaso1] = useState<Record<string, string>>({});

  // Profesora y permisos
  const esSoloProfesora = Boolean(user?.roles.includes("PROFESORA") && !user?.roles.includes("PROPIETARIA"));
  const esPropietaria = Boolean(user?.roles.includes("PROPIETARIA"));

  const idProfesoraInicial = useMemo(() => {
    if (!esSoloProfesora || !user) return null;
    const coincidencia = profesoras.find(
      (p) => p.nombre.toLowerCase() === user.nombre.toLowerCase() && p.apellido.toLowerCase() === user.apellido.toLowerCase(),
    );
    return coincidencia ? Number(coincidencia.id) : null;
  }, [esSoloProfesora, user, profesoras]);

  // Formulario Paso 2
  const [idPlan, setIdPlan] = useState<number | null>(null);
  const [idProfesoraElegida, setIdProfesora] = useState<number | null>(null);
  const idProfesora = esSoloProfesora ? idProfesoraInicial : idProfesoraElegida;
  const [idsHorarios, setIdsHorarios] = useState<number[]>([]);
  const [medidas, setMedidas] = useState<MedidasCorporalesForm>(MEDIDAS_VACIAS);
  const [erroresMedidas, setErroresMedidas] = useState<Partial<Record<keyof MedidasCorporalesForm, string>>>({});
  const [observacionesInscripcion, setObservacionesInscripcion] = useState<string>("");

  // Formulario Paso 3 (Cobro)
  const [datosCobro, setDatosCobro] = useState<DatosCobroPreinscripcion>(COBRO_INICIAL);
  const { data: promociones = [] } = usePromociones();

  // Estado de envío
  const [enviando, setEnviando] = useState(false);

  // Derivados de Paso 1
  const edadCalculada = useMemo(() => calcularEdad(datosAlumno.fecha_nacimiento), [datosAlumno.fecha_nacimiento]);
  const menorDeEdad = useMemo(() => esMenorDeEdad(datosAlumno.fecha_nacimiento), [datosAlumno.fecha_nacimiento]);

  // Plan y Profesora seleccionados
  const planSeleccionado = useMemo(() => planes.find((p) => p.id_plan === idPlan) ?? null, [planes, idPlan]);

  // Total a cobrar de la primera cuota: el precio del plan con la promoción elegida. Igual que en "Cobrar".
  const cotizarCobro = useCallback(
    (idPromocionElegida: string) =>
      calcularCotizacionCobro(
        {
          id: 0,
          precioLista: planSeleccionado?.precio_vigente?.precio ?? 0,
          idPromocion: idDePromocion(idPromocionElegida) ?? null,
          idPlan: idPlan ?? 0,
        },
        promociones,
      ),
    [planSeleccionado, idPlan, promociones],
  );
  const cotizacionCobro = useMemo(() => cotizarCobro(datosCobro.idPromocion), [cotizarCobro, datosCobro.idPromocion]);
  const promocionesDelPlan = useMemo(
    () => promocionesAplicables(promociones, idPlan ?? undefined, datosCobro.idPromocion),
    [promociones, idPlan, datosCobro.idPromocion],
  );

  const seleccionarPromocion = useCallback((idPromocionElegida: string) => {
    setDatosCobro((prev) => ({ ...prev, idPromocion: idPromocionElegida }));
  }, []);
  const clasesRequeridas = clasesRequeridasDelPlan(planSeleccionado);

  const profesorasCompatibles = useMemo(
    () => profesorasDelPlan(profesoras, horarios, planSeleccionado),
    [profesoras, horarios, planSeleccionado],
  );

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

  // Manejo de horarios seleccionados
  const toggleHorario = useCallback(
    (idHorario: number) => {
      const horarioClickeado = horarios.find((h) => h.id_horario === idHorario);
      if (!horarioClickeado) return;

      setIdsHorarios((actuales) => {
        if (actuales.includes(idHorario)) {
          return actuales.filter((id) => id !== idHorario);
        }
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

  const limpiarHorarios = useCallback(() => {
    setIdsHorarios([]);
  }, []);

  // Validaciones
  const validarPaso1 = useCallback((): boolean => {
    const mapaErrores = erroresDelPaso1(datosAlumno);
    setErroresPaso1(mapaErrores);
    if (Object.keys(mapaErrores).length > 0) {
      toast.error("Por favor revisá los campos con errores.");
      return false;
    }
    return true;
  }, [datosAlumno]);

  const actualizarDatosAlumno = useCallback((nuevosDatos: AlumnoFormData) => {
    setDatosAlumno(nuevosDatos);
    setErroresPaso1((previos) => {
      if (Object.keys(previos).length === 0) return previos;
      const actuales = erroresDelPaso1(nuevosDatos);
      return Object.fromEntries(Object.keys(previos).flatMap((campo) => (actuales[campo] ? [[campo, actuales[campo]]] : [])));
    });
  }, []);

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
      const nuevoPlan = planes.find((p) => p.id_plan === id) ?? null;
      // Otro plan, otro precio: la promoción elegida puede no aplicarle.
      setDatosCobro((prev) => ({
        ...prev,
        idPromocion: SIN_PROMOCION,
      }));
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
  }, [idPlan, idProfesora, idsHorarios, clasesRequeridas, horarios, actividadQuePideMedidas, medidas]);

  const avanzarPaso = useCallback(() => {
    if (paso === 1) {
      if (validarPaso1()) setPaso(2);
    } else if (paso === 2) {
      if (validarPaso2()) setPaso(3);
    }
  }, [paso, validarPaso1, validarPaso2]);

  const retrocederPaso = useCallback(() => {
    setPaso((p) => (p > 1 ? ((p - 1) as PasoPreinscripcion) : p));
  }, []);

  const reiniciar = useCallback(() => {
    // Si se había creado el alumno pero nunca se completó la inscripción, se da de baja
    // para no dejar datos huérfanos sin plan en la lista de alumnos.
    if (idAlumnoCreado && !idInscripcionCreada) {
      darDeBajaAlumno(idAlumnoCreado, "OTRO", "Pre-inscripción cancelada").catch(() => { });
      invalidarAlumnos();
    }
    setPaso(1);
    setExito(false);
    setIdInscripcionCreada(null);
    setIdAlumnoCreado(null);
    setDatosAlumno(VALOR_INICIAL_ALUMNO);
    setErroresPaso1({});
    setIdPlan(null);
    setIdProfesora(null);
    setIdsHorarios([]);
    setObservacionesInscripcion("");
    setMedidas(MEDIDAS_VACIAS);
    setErroresMedidas({});
    setDatosCobro(COBRO_INICIAL);
  }, [idAlumnoCreado, idInscripcionCreada, invalidarAlumnos]);

  // Confirmar y guardar la pre-inscripción (con o sin cobro)
  const confirmarPreinscripcion = useCallback(async () => {
    if (!idPlan || !idProfesora || idsHorarios.length !== clasesRequeridas) {
      toast.error("Faltan datos requeridos para completar la pre-inscripción.");
      return;
    }

    const esTransferencia = datosCobro.formaPago === "TRANSFERENCIA";
    // En efectivo o transferencia, la primera cuota se cobra siempre por el total: no se carga a mano.
    const montoCobrado = cotizacionCobro.monto;
    const idPromocionCobro = idDePromocion(datosCobro.idPromocion);
    if (datosCobro.yaAbono && (!montoCobrado || montoCobrado <= 0)) {
      toast.error("El monto cobrado debe ser mayor a cero.");
      return;
    }

    setEnviando(true);
    try {
      // 1. Crear el Alumno (y tutor si es menor)
      const payloadAlumno = {
        nombre: datosAlumno.nombre.trim(),
        apellido: datosAlumno.apellido.trim(),
        dni: datosAlumno.dni.trim(),
        email: menorDeEdad ? undefined : (datosAlumno.email?.trim() || undefined),
        fecha_nacimiento: datosAlumno.fecha_nacimiento,
        telefono: datosAlumno.telefono?.trim() || null,
        direccion: datosAlumno.direccion?.trim() || null,
        cont_emerg_nombre: datosAlumno.cont_emerg_nombre.trim(),
        cont_emerg_telefono: datosAlumno.cont_emerg_telefono.trim(),
        apto_medico: datosAlumno.apto_medico,
        fecha_apto_medico: (datosAlumno.apto_medico && datosAlumno.fecha_apto_medico?.trim()) || null,
        observaciones: datosAlumno.observaciones?.trim() || null,
        tutor:
          menorDeEdad &&
            datosAlumno.tutor?.nombre &&
            datosAlumno.tutor?.telefono &&
            datosAlumno.tutor?.email &&
            datosAlumno.tutor?.fecha_nacimiento
            ? {
              nombre: datosAlumno.tutor.nombre.trim(),
              apellido: (datosAlumno.tutor.apellido?.trim() || datosAlumno.tutor.nombre.trim()),
              dni: datosAlumno.tutor.dni?.trim() || undefined,
              telefono: datosAlumno.tutor.telefono.trim(),
              email: datosAlumno.tutor.email.trim(),
              fecha_nacimiento: datosAlumno.tutor.fecha_nacimiento,
            }
            : undefined,
      };

      // 1. Crear el Alumno (y tutor si es menor) o reutilizar si ya fue creado en un intento previo
      let idAlumno = idAlumnoCreado;
      if (!idAlumno) {
        const alumnoCreado = await crearAlumno(payloadAlumno);
        idAlumno = alumnoCreado.id_alumno;
        setIdAlumnoCreado(idAlumno);
      }

      // 2. Crear la Inscripción
      const inscripcion = await crearInscripcion({
        id_alumno: idAlumno,
        id_plan: idPlan,
        id_profesora: idProfesora,
        ids_horarios: idsHorarios,
        sin_cargo: false,
        // Sin fecha_inicio: el back la pone en el día en que la recibe, con su propio reloj.
        observaciones: observacionesInscripcion.trim() || null,
        medidas: actividadQuePideMedidas ? medidasCorporalesSchema.parse(medidas) : undefined,
      });

      // 3. Si ya abonó, registrar el cobro en el acto
      if (datosCobro.yaAbono) {
        if (datosCobro.formaPago === "EFECTIVO") {
          await registrarPrimerPagoEnEfectivo({
            id_inscripcion: inscripcion.id_inscripcion,
            id_promocion: idPromocionCobro,
            monto: montoCobrado,
            confirmar_monto_distinto: false,
          });
        } else if (esTransferencia) {
          // Sin fecha y hora: el back registra el momento en que la recibe, con su propio reloj.
          if (esPropietaria) {
            await registrarTransferenciaRecibida({
              id_inscripcion: inscripcion.id_inscripcion,
              id_promocion: idPromocionCobro,
              monto: montoCobrado,
              confirmar_monto_distinto: false,
              titular_cuenta_origen: datosCobro.titularCuenta?.trim() || undefined,
            });
          } else {
            await informarTransferenciaPrimerPago({
              id_inscripcion: inscripcion.id_inscripcion,
              id_promocion: idPromocionCobro,
              monto: montoCobrado,
              titular_cuenta_origen: datosCobro.titularCuenta?.trim() || undefined,
              observaciones: observacionesInscripcion.trim() || undefined,
            });
          }
        }
      }

      await invalidarAlumnos();

      setIdInscripcionCreada(inscripcion.id_inscripcion);
      setIdAlumnoCreado(idAlumno);
      setExito(true);
      onExitoRef.current?.({
        idInscripcion: inscripcion.id_inscripcion,
        idAlumno,
        cobrarAhora: false,
      });

      toast.success(
        datosCobro.yaAbono
          ? (datosCobro.formaPago === "TRANSFERENCIA" && !esPropietaria
              ? "Pre-inscripción guardada. Transferencia informada pendiente de confirmación."
              : "¡Alta confirmada con éxito!")
          : "¡Pre-inscripción guardada con éxito!",
      );
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
    datosCobro,
    cotizacionCobro.monto,
    datosAlumno,
    menorDeEdad,
    actividadQuePideMedidas,
    medidas,
    observacionesInscripcion,
    esPropietaria,
    invalidarAlumnos,
    idAlumnoCreado,
  ]);

  return {
    paso,
    setPaso,
    exito,
    idInscripcionCreada,
    idAlumnoCreado,
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
    limpiarHorarios,
    clasesRequeridas,
    horariosDisponibles,
    observacionesInscripcion,
    setObservacionesInscripcion,
    datosCobro,
    setDatosCobro,
    cotizacionCobro,
    promocionesDelPlan,
    seleccionarPromocion,
    esPropietaria,
    enviando,
    avanzarPaso,
    retrocederPaso,
    reiniciar,
    confirmarPreinscripcion,
  };
}
