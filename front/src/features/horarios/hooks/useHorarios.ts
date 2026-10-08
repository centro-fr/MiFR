import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mensajeDeErrorApi } from "@/api/errores";
import { useActividades } from "@/features/actividades/hooks/use-actividades";
import {
  actualizarHorario,
  crearHorario as crearHorarioApi,
  darDeBajaHorario,
  listarHorarios,
  listarProfesoras,
} from "@/features/horarios/api/horarios-api";
import { horarioFormSchema, type GuardarHorarioBody, type HorarioApi } from "@/features/horarios/schemas/horario";
import {
  diaDesdeNumero,
  horaDesdeApi,
  intercambiarHorariosEnLista,
  moverHorarioEnLista,
  numeroDeDia,
  validarSolapamientoProfesoraEnLista,
} from "@/features/horarios/utils/cronograma";
import { temaDeModalidad } from "@/features/horarios/utils/tema-horario";
import type { Actividad } from "@/types/actividad";
import type { DiaSemana, Horario, HorarioFormData } from "@/types/horarios";

export const HORARIOS_QUERY_KEY = ["horarios"] as const;
const PROFESORAS_QUERY_KEY = ["profesoras"] as const;
const PREFIJO_BORRADOR = "nuevo-";

type Resultado = { ok: true } | { ok: false; error: string };

function nombreCompleto({ nombre, apellido }: { nombre: string; apellido: string }): string {
  return `${nombre} ${apellido}`;
}

function aHorario(api: HorarioApi): Horario {
  return {
    id: String(api.id_horario),
    actividadId: String(api.id_actividad),
    actividadNombre: api.actividad.nombre,
    actividadTipo: api.actividad.modalidad,
    profesoraId: String(api.id_profesora),
    profesoraNombre: nombreCompleto(api.profesora.usuario),
    tema: temaDeModalidad(api.actividad.modalidad),
    diaSemana: diaDesdeNumero(api.dia_semana),
    horaInicio: horaDesdeApi(api.hora_inicio),
    horaFin: horaDesdeApi(api.hora_fin),
    cupoPropio: api.cupo_maximo,
    cupoMaximo: api.cupo_maximo_efectivo,
  };
}

function aCuerpo(horario: Horario): GuardarHorarioBody {
  return {
    id_actividad: Number(horario.actividadId),
    id_profesora: Number(horario.profesoraId),
    dia_semana: numeroDeDia(horario.diaSemana),
    hora_inicio: horario.horaInicio,
    hora_fin: horario.horaFin,
    cupo_maximo: horario.cupoPropio,
  };
}

function difiere(a: Horario, b: Horario): boolean {
  return JSON.stringify(aCuerpo(a)) !== JSON.stringify(aCuerpo(b));
}

// Lo que hay que mandar al back para que el cronograma oficial quede igual al borrador.
// Las bajas no aparecen: se aplican en el momento, sin pasar por el borrador.
function operacionesPendientes(borrador: Horario[], oficiales: Horario[]) {
  const oficialPorId = new Map(oficiales.map((horario) => [horario.id, horario]));
  return {
    crear: borrador.filter((horario) => horario.id.startsWith(PREFIJO_BORRADOR)),
    actualizar: borrador.filter((horario) => {
      const oficial = oficialPorId.get(horario.id);
      return oficial !== undefined && difiere(oficial, horario);
    }),
  };
}

export const useHorarios = () => {
  const queryClient = useQueryClient();
  const consultaProfesoras = useQuery({
    queryKey: PROFESORAS_QUERY_KEY,
    queryFn: listarProfesoras,
    staleTime: 5 * 60_000,
  });
  const consultaActividades = useActividades();
  const consultaHorarios = useQuery({ queryKey: HORARIOS_QUERY_KEY, queryFn: listarHorarios });

  const actividades: Actividad[] = useMemo(() => consultaActividades.data ?? [], [consultaActividades.data]);
  const profesoras = useMemo(() => consultaProfesoras.data ?? [], [consultaProfesoras.data]);
  const [borrador, setBorrador] = useState<Horario[] | null>(null);
  const [filtroActividad, setFiltroActividad] = useState<string>("TODAS");
  const [filtroProfesora, setFiltroProfesora] = useState<string>("TODAS");
  const [filtroDia, setFiltroDia] = useState<string>("TODOS");
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const profesoraPorId = useMemo(() => new Map(profesoras.map((p) => [p.id, p])), [profesoras]);
  const oficiales = useMemo(() => (consultaHorarios.data ?? []).map(aHorario), [consultaHorarios.data]);

  const horariosEditables = borrador ?? oficiales;

  const pendientes = useMemo(
    () => (borrador ? operacionesPendientes(borrador, oficiales) : { crear: [], actualizar: [] }),
    [borrador, oficiales],
  );
  const hayCambiosPendientes = pendientes.crear.length + pendientes.actualizar.length > 0;
  const cantidadCambiosPendientes = pendientes.crear.length + pendientes.actualizar.length;

  const horariosFiltrados = useMemo(
    () =>
      horariosEditables.filter(
        (h) =>
          (filtroActividad === "TODAS" || h.actividadId === filtroActividad) &&
          (filtroProfesora === "TODAS" || h.profesoraId === filtroProfesora) &&
          (filtroDia === "TODOS" || h.diaSemana === filtroDia),
      ),
    [horariosEditables, filtroActividad, filtroProfesora, filtroDia],
  );

  const invalidarHorarios = useCallback(
    () => queryClient.invalidateQueries({ queryKey: HORARIOS_QUERY_KEY }),
    [queryClient],
  );

  const validarSuperposicion = useCallback(
    (data: HorarioFormData, ignorarHorarioId?: string): Resultado => {
      const basicos = horarioFormSchema.safeParse(data);
      if (!basicos.success) return { ok: false, error: basicos.error.issues[0].message };
      const conflicto = validarSolapamientoProfesoraEnLista(
        horariosEditables,
        data.profesoraId,
        data.diaSemana,
        data.horaInicio,
        data.horaFin,
        ignorarHorarioId,
      );
      if (conflicto) {
        return {
          ok: false,
          error: `La profesora ${conflicto.profesoraNombre} ya dicta una clase el ${conflicto.diaSemana} de ${conflicto.horaInicio} a ${conflicto.horaFin} hs.`,
        };
      }
      return { ok: true };
    },
    [horariosEditables],
  );

  const armarHorario = (id: string, data: HorarioFormData): Horario | null => {
    const actividad = actividades.find((a) => a.id === data.actividadId);
    const profesora = profesoraPorId.get(data.profesoraId);
    if (!actividad || !profesora) return null;
    return {
      id,
      actividadId: actividad.id,
      actividadNombre: actividad.nombre,
      actividadTipo: actividad.modalidad,
      profesoraId: profesora.id,
      profesoraNombre: nombreCompleto(profesora),
      tema: temaDeModalidad(actividad.modalidad),
      diaSemana: data.diaSemana,
      horaInicio: data.horaInicio,
      horaFin: data.horaFin,
      cupoPropio: data.cupoPropio,
      cupoMaximo: data.cupoPropio ?? actividad.cupoMaximo,
    };
  };

  const aplicarEnBorrador = (data: HorarioFormData, id: string, ignorarHorarioId?: string): Resultado => {
    setErrorValidacion(null);
    const validacion = validarSuperposicion(data, ignorarHorarioId);
    if (!validacion.ok) {
      setErrorValidacion(validacion.error);
      return validacion;
    }
    const horario = armarHorario(id, data);
    if (!horario) return { ok: false, error: "Actividad o profesora no encontrada." };

    const existe = horariosEditables.some((h) => h.id === id);
    setBorrador(existe ? horariosEditables.map((h) => (h.id === id ? horario : h)) : [...horariosEditables, horario]);
    return { ok: true };
  };

  const crearHorario = (data: HorarioFormData) => aplicarEnBorrador(data, `${PREFIJO_BORRADOR}${crypto.randomUUID()}`);

  const editarHorario = (id: string, data: HorarioFormData) => aplicarEnBorrador(data, id, id);

  // La baja es inmediata (no pasa por el borrador): no se puede deshacer con "Descartar".
  const eliminarHorario = async (id: string): Promise<{ ok: true; advertencia?: string } | { ok: false; error: string }> => {
    if (id.startsWith(PREFIJO_BORRADOR)) {
      setBorrador(horariosEditables.filter((h) => h.id !== id));
      return { ok: true };
    }
    try {
      const advertencia = await darDeBajaHorario(id);
      if (borrador) setBorrador(borrador.filter((h) => h.id !== id));
      await invalidarHorarios();
      return { ok: true, advertencia };
    } catch (error) {
      return { ok: false, error: mensajeDeErrorApi(error, "No se pudo dar de baja el horario.") };
    }
  };

  const reubicar = (resultado: ReturnType<typeof moverHorarioEnLista>): Resultado => {
    if (!resultado.ok) {
      setErrorValidacion(resultado.error);
      return resultado;
    }
    setBorrador(resultado.horariosActualizados);
    setErrorValidacion(null);
    return { ok: true };
  };

  const moverHorario = (horarioId: string, nuevoDia: DiaSemana, nuevaHoraInicio: string, slotFin?: string) =>
    reubicar(moverHorarioEnLista(horariosEditables, horarioId, nuevoDia, nuevaHoraInicio, { slotFin }));

  const intercambiarHorarios = (idA: string, idB: string) =>
    reubicar(intercambiarHorariosEnLista(horariosEditables, idA, idB));

  // Manda al back cada alta y modificación del borrador. Si una falla, las que ya se
  // guardaron quedan oficiales y el resto sigue en el borrador para corregirlo y reintentar.
  const guardarCambios = async (): Promise<{ ok: true; guardados: number } | { ok: false; error: string }> => {
    if (!borrador) return { ok: true, guardados: 0 };
    setGuardando(true);
    let restante = borrador;
    let guardados = 0;
    try {
      for (const horario of pendientes.actualizar) {
        await actualizarHorario(horario.id, aCuerpo(horario));
        guardados++;
      }
      for (const horario of pendientes.crear) {
        const creado = await crearHorarioApi(aCuerpo(horario));
        restante = restante.map((h) => (h.id === horario.id ? { ...h, id: String(creado.id_horario) } : h));
        guardados++;
      }
      await invalidarHorarios();
      setBorrador(null);
      return { ok: true, guardados };
    } catch (error) {
      setBorrador(restante);
      await invalidarHorarios();
      return { ok: false, error: mensajeDeErrorApi(error, "No se pudieron guardar los cambios.") };
    } finally {
      setGuardando(false);
    }
  };

  const cancelarCambios = useCallback(() => {
    setBorrador(null);
    setErrorValidacion(null);
  }, []);

  const consultas = [consultaHorarios, consultaActividades, consultaProfesoras];

  return {
    cargando: consultas.some((consulta) => consulta.isPending),
    errorCarga: consultas.find((consulta) => consulta.isError)?.error ?? null,
    reintentarCarga: () => consultas.forEach((consulta) => void consulta.refetch()),
    horarios: horariosFiltrados,
    totalHorarios: horariosEditables.length,
    actividades,
    profesoras,
    filtroActividad,
    setFiltroActividad,
    filtroProfesora,
    setFiltroProfesora,
    filtroDia,
    setFiltroDia,
    errorValidacion,
    setErrorValidacion,
    crearHorario,
    editarHorario,
    eliminarHorario,
    moverHorario,
    intercambiarHorarios,
    validarSuperposicion,
    hayCambiosPendientes,
    cantidadCambiosPendientes,
    guardando,
    guardarCambios,
    cancelarCambios,
  };
};
