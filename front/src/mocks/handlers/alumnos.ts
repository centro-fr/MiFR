import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { bajaAlumnoBodySchema, type AlumnoApi } from "@/features/alumnos/schemas/alumno";
import { db, siguienteId, type HorarioMock } from "@/mocks/db";
import type { AlumnoMock, UsuarioPersonaMock } from "@/mocks/data/alumnos";
import type { InscripcionMock } from "@/mocks/data/inscripciones";
import { errorApi, idDeRuta, idInvalido, usuarioDeLaSesion, verificarAcceso } from "@/mocks/handlers/respuestas";
import { errorDeHorarios, guardarInscripcion, planYHorariosSchema, vigentesDe } from "@/mocks/handlers/reglas-inscripcion";
import { inscripcionConDatos } from "@/mocks/handlers/serializar";
import { situacionCuotaDe, tuvoPagoConfirmado } from "@/mocks/situacion-cuota";
import { hoyEnArgentina, precioVigenteDePlan } from "@/mocks/precios";
import { asistenciaHistorica } from "@/mocks/data/asistencia-historica";
import { diaSemana } from "@/features/alumnos/utils/fecha";
import { normalizarParaBuscar } from "@/utils/texto";

// Mock de /alumnos (alumno.routes.ts) y de POST /alumnos/:id/baja y /reactivar (inscripcion.routes.ts),
// con las reglas de alumno.service.ts. No replica que una profesora solo vea a los alumnos a su cargo.

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 100;
const ESTADOS = ["ACTIVO", "INACTIVO", "BAJA"];
const MAYORIA_DE_EDAD = 18;
// La profesora solo modifica contacto y observaciones (PATCH /alumnos/:id).
const CAMPOS_DE_LA_PROFESORA = ["telefono", "direccion", "cont_emerg_nombre", "cont_emerg_telefono", "observaciones"];

function datosPersonales(idUsuario: number) {
  return db.usuariosPersonas.find((u) => u.id_usuario === idUsuario)!;
}

// Alumno del back: con sus datos personales y los de su tutor.
function alumnoDe(alumno: AlumnoMock): AlumnoApi {
  return {
    ...alumno,
    usuario: datosPersonales(alumno.id_usuario),
    responsable: alumno.id_usuario_responsable === null ? null : datosPersonales(alumno.id_usuario_responsable),
  };
}

// AlumnoEnListado del back: el resumen de su inscripción vigente más reciente y su situación de
// cuota, o null.
function alumnoEnListado(alumno: AlumnoMock) {
  const [vigente] = vigentesDe(alumno.id_alumno);
  const resumen = vigente && inscripcionConDatos(vigente);
  return {
    ...alumnoDe(alumno),
    inscripcion: resumen
      ? {
          id_alumno: alumno.id_alumno,
          id_inscripcion: resumen.id_inscripcion,
          estado: resumen.estado,
          id_plan: resumen.id_plan,
          nombre_plan: resumen.plan.nombre,
          id_profesora: resumen.id_profesora,
          nombre_profesora: `${resumen.profesora.usuario.nombre} ${resumen.profesora.usuario.apellido}`,
          ids_horarios: resumen.horarios.map((h) => h.id_horario),
        }
      : null,
    situacion_cuota: vigente ? situacionCuotaDe(vigente) : null,
  };
}

function conSituacion(inscripcion: InscripcionMock) {
  return { ...inscripcionConDatos(inscripcion), situacion_cuota: situacionCuotaDe(inscripcion) };
}

// Las que cerró la última baja: el back da de baja al alumno y a sus inscripciones en el mismo momento.
function inscripcionesDeLaBaja(alumno: AlumnoMock): InscripcionMock[] {
  if (alumno.estado !== "BAJA") return [];
  return db.inscripciones.filter((i) => i.id_alumno === alumno.id_alumno && i.estado === "BAJA" && i.fecha_baja === alumno.fecha_baja);
}

// FichaAlumno del back: el alumno con sus inscripciones vigentes y las de su última baja.
function fichaDe(alumno: AlumnoMock) {
  return {
    ...alumnoDe(alumno),
    inscripciones: vigentesDe(alumno.id_alumno).map(conSituacion),
    inscripciones_de_la_baja: inscripcionesDeLaBaja(alumno).map(conSituacion),
  };
}

function buscarAlumno(id: number) {
  return db.alumnos.find((a) => a.id_alumno === id);
}

function numeroDeQuery(valor: string | null, porDefecto: number): number | null {
  if (valor === null) return porDefecto;
  return /^\d{1,3}$/.test(valor) ? Number(valor) : null;
}

// ---------- Listado ----------

// Sin estado, el back no lista a los dados de baja salvo que se pida incluirBajas=true.
function coincideEstado(alumno: AlumnoMock, estado: string | null, incluirBajas: boolean): boolean {
  if (estado) return alumno.estado === estado;
  return incluirBajas || alumno.estado !== "BAJA";
}

// Nombre y apellido del alumno o de su tutor, sin distinguir acentos ni mayúsculas.
function coincideBusqueda(alumno: AlumnoMock, busqueda: string | null): boolean {
  if (!busqueda) return true;
  const texto = normalizarParaBuscar(busqueda);
  const personas = [alumno.id_usuario, alumno.id_usuario_responsable].filter((id): id is number => id !== null);
  return personas.some((id) => {
    const { nombre, apellido } = datosPersonales(id);
    return normalizarParaBuscar(`${nombre} ${apellido}`).includes(texto);
  });
}

// id_plan, id_profesora e id_actividad filtran por la inscripción vigente.
function coincideInscripcion(alumno: AlumnoMock, query: URLSearchParams): boolean {
  const [idPlan, idProfesora, idActividad] = ["id_plan", "id_profesora", "id_actividad"].map((clave) => query.get(clave));
  if (!idPlan && !idProfesora && !idActividad) return true;
  return vigentesDe(alumno.id_alumno).some(
    (i) =>
      (!idPlan || i.id_plan === Number(idPlan)) &&
      (!idProfesora || i.id_profesora === Number(idProfesora)) &&
      (!idActividad || i.ids_horarios.some((id) => db.horarios.find((h) => h.id_horario === id)?.id_actividad === Number(idActividad))),
  );
}

function idProfesoraDeLaSesion(request: Request): number | null {
  const sesion = usuarioDeLaSesion(request);
  if (!sesion) return null;
  const prof = db.profesoras.find((p) => p.id_usuario === sesion.id_usuario);
  return prof?.id_profesora ?? null;
}

function esAlumnoDeLaProfesora(alumno: AlumnoMock, idProf: number | null): boolean {
  if (idProf === null) return false;
  return vigentesDe(alumno.id_alumno).some((i) => i.id_profesora === idProf);
}

function filtrarAlumnos(query: URLSearchParams, idProfACargo?: number | null): AlumnoMock[] {
  const dni = query.get("dni");
  return db.alumnos
    .filter((a) => coincideEstado(a, query.get("estado"), query.get("incluirBajas") === "true"))
    .filter((a) => coincideBusqueda(a, query.get("busqueda")))
    .filter((a) => !dni || datosPersonales(a.id_usuario).dni === dni)
    .filter((a) => (idProfACargo === undefined ? true : esAlumnoDeLaProfesora(a, idProfACargo)))
    .filter((a) => coincideInscripcion(a, query))
    .sort((a, b) => {
      const [pa, pb] = [datosPersonales(a.id_usuario), datosPersonales(b.id_usuario)];
      return pa.apellido.localeCompare(pb.apellido, "es") || pa.nombre.localeCompare(pb.nombre, "es");
    });
}

// ---------- Alta y edición (crearAlumnoSchema y actualizarAlumnoSchema del back, sin los formatos) ----------

const tutorSchema = z.union([
  z.object({ id_usuario: z.number().int().positive() }).strict(),
  z
    .object({
      nombre: z.string().trim().min(1),
      apellido: z.string().trim().min(1),
      dni: z.string().optional(),
      telefono: z.string().trim().min(1),
      email: z.string().email(),
      fecha_nacimiento: z.string().date(),
    })
    .strict(),
]);

const contactoDeEmergencia = {
  cont_emerg_nombre: z.string().trim().min(1, "El contacto de emergencia es obligatorio").max(80),
  cont_emerg_telefono: z.string().trim().min(7, "El teléfono de emergencia debe tener entre 7 y 15 dígitos").max(20),
};

const datosDelAlumno = {
  dni: z.string().regex(/^\d{7,8}$/).optional(),
  telefono: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  cont_emerg_nombre: contactoDeEmergencia.cont_emerg_nombre.optional(),
  cont_emerg_telefono: contactoDeEmergencia.cont_emerg_telefono.optional(),
  fecha_apto_medico: z.string().date().nullable().optional(),
  observaciones: z.string().max(500).nullable().optional(),
};

const crearAlumnoSchema = z.object({
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  email: z.string().email().optional(),
  fecha_nacimiento: z.string().date(),
  ...datosDelAlumno,
  cont_emerg_nombre: contactoDeEmergencia.cont_emerg_nombre,
  cont_emerg_telefono: contactoDeEmergencia.cont_emerg_telefono,
  apto_medico: z.boolean().default(false),
  tutor: tutorSchema.optional(),
});

const actualizarAlumnoSchema = z
  .object({
    nombre: z.string().trim().min(1).optional(),
    apellido: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    fecha_nacimiento: z.string().date().optional(),
    ...datosDelAlumno,
    apto_medico: z.boolean().optional(),
    tutor: tutorSchema.optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0);

type TutorInput = z.infer<typeof tutorSchema>;

function edad(fechaNacimiento: string): number {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  const cumplioEsteAnio =
    hoy.getUTCMonth() > nacimiento.getUTCMonth() ||
    (hoy.getUTCMonth() === nacimiento.getUTCMonth() && hoy.getUTCDate() >= nacimiento.getUTCDate());
  return hoy.getUTCFullYear() - nacimiento.getUTCFullYear() - (cumplioEsteAnio ? 0 : 1);
}

function identidadOcupada(dni: string | undefined, email: string | undefined, idUsuarioPropio?: number) {
  const otros = db.usuariosPersonas.filter((u) => u.id_usuario !== idUsuarioPropio);
  if (dni && otros.some((u) => u.dni === dni)) return errorApi(409, "CONFLICT", "Ya existe un usuario con ese DNI");
  if (email && otros.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
    return errorApi(409, "CONFLICT", "Ya existe un usuario con ese email");
  }
  return null;
}

// Si ya existe un usuario con ese DNI o email, se reutiliza como tutor (alumno.service.ts).
function resolverTutor(tutor: TutorInput): number | null {
  if ("id_usuario" in tutor) return db.usuariosPersonas.some((u) => u.id_usuario === tutor.id_usuario) ? tutor.id_usuario : null;
  const existente = db.usuariosPersonas.find((u) => (tutor.dni && u.dni === tutor.dni) || u.email?.toLowerCase() === tutor.email.toLowerCase());
  if (existente) return existente.id_usuario;
  const nuevo: UsuarioPersonaMock = {
    id_usuario: siguienteId([...db.usuarios, ...db.usuariosPersonas].map((u) => u.id_usuario)),
    nombre: tutor.nombre,
    apellido: tutor.apellido,
    dni: tutor.dni ?? null,
    email: tutor.email,
    telefono: tutor.telefono,
    fecha_nacimiento: `${tutor.fecha_nacimiento}T00:00:00.000Z`,
    direccion: null,
    estado: "INACTIVO",
  };
  db.usuariosPersonas.push(nuevo);
  return nuevo.id_usuario;
}

/** Las reglas de edad del back: un menor lleva tutor y no email; un mayor, email y no tutor. */
function errorDeEdad(fechaNacimiento: string, email: string | null | undefined, conTutor: boolean) {
  if (edad(fechaNacimiento) < MAYORIA_DE_EDAD) {
    if (email) return errorApi(400, "VALIDATION_ERROR", "Un alumno menor de 18 años no lleva email: entra al sistema su tutor");
    return conTutor ? null : errorApi(400, "VALIDATION_ERROR", "Un alumno menor de 18 años necesita un tutor");
  }
  if (conTutor) return errorApi(400, "VALIDATION_ERROR", "Un alumno mayor de edad no lleva tutor");
  return email ? null : errorApi(400, "VALIDATION_ERROR", "El email es obligatorio para un alumno mayor de edad: lo usa para entrar");
}

// actualizar() de alumno.service.ts: las reglas se revisan con los datos que resultan del cambio.
function errorDeEdadAlEditar(alumno: AlumnoMock, cambios: z.infer<typeof actualizarAlumnoSchema>, menor: boolean) {
  if (menor) {
    if (cambios.email) return errorApi(400, "VALIDATION_ERROR", "Un alumno menor de 18 años no lleva email: entra al sistema su tutor");
    const conTutor = cambios.tutor !== undefined || alumno.id_usuario_responsable !== null;
    return conTutor ? null : errorApi(400, "VALIDATION_ERROR", "Un alumno menor de 18 años necesita un tutor");
  }
  if (cambios.tutor) return errorApi(400, "VALIDATION_ERROR", "Un alumno mayor de edad no lleva tutor");
  const email = cambios.email ?? datosPersonales(alumno.id_usuario).email;
  return email ? null : errorApi(400, "VALIDATION_ERROR", "El email es obligatorio para un alumno mayor de edad: lo usa para entrar");
}

function fechaDate(valor: string | null | undefined): string | null | undefined {
  return valor ? `${valor}T00:00:00.000Z` : valor;
}

function crearAlumno(datos: z.infer<typeof crearAlumnoSchema>, idResponsable: number | null): AlumnoMock {
  const usuario: UsuarioPersonaMock = {
    id_usuario: siguienteId([...db.usuarios, ...db.usuariosPersonas].map((u) => u.id_usuario)),
    nombre: datos.nombre,
    apellido: datos.apellido,
    dni: datos.dni ?? null,
    email: datos.email ?? null,
    telefono: datos.telefono ?? null,
    fecha_nacimiento: `${datos.fecha_nacimiento}T00:00:00.000Z`,
    direccion: datos.direccion ?? null,
    estado: "INACTIVO",
  };
  db.usuariosPersonas.push(usuario);
  const alumno: AlumnoMock = {
    id_alumno: siguienteId(db.alumnos.map((a) => a.id_alumno)),
    id_usuario: usuario.id_usuario,
    id_usuario_responsable: idResponsable,
    cont_emerg_nombre: datos.cont_emerg_nombre ?? "Contacto de Emergencia",
    cont_emerg_telefono: datos.cont_emerg_telefono ?? "3794 401122",
    apto_medico: datos.apto_medico,
    fecha_apto_medico: fechaDate(datos.fecha_apto_medico) ?? null,
    observaciones: datos.observaciones ?? null,
    // Queda INACTIVO hasta el primer pago de su pre-inscripción (US-05, US-07).
    estado: "INACTIVO",
    fecha_alta: new Date().toISOString(),
    fecha_baja: null,
  };
  db.alumnos.push(alumno);
  return alumno;
}

function aplicarCambios(alumno: AlumnoMock, cambios: z.infer<typeof actualizarAlumnoSchema>, idResponsable: number | null | undefined) {
  const { nombre, apellido, email, fecha_nacimiento, dni, telefono, direccion } = cambios;
  const usuario = datosPersonales(alumno.id_usuario);
  Object.assign(
    usuario,
    Object.fromEntries(
      Object.entries({ nombre, apellido, email, dni, telefono, direccion, fecha_nacimiento: fechaDate(fecha_nacimiento) }).filter(
        ([, valor]) => valor !== undefined,
      ),
    ),
  );
  const { cont_emerg_nombre, cont_emerg_telefono, apto_medico, fecha_apto_medico, observaciones } = cambios;
  Object.assign(
    alumno,
    Object.fromEntries(
      Object.entries({ cont_emerg_nombre, cont_emerg_telefono, apto_medico, observaciones, fecha_apto_medico: fechaDate(fecha_apto_medico) }).filter(
        ([, valor]) => valor !== undefined,
      ),
    ),
  );
  if (idResponsable !== undefined) alumno.id_usuario_responsable = idResponsable;
}

function esSoloProfesora(request: Request): boolean {
  const roles = usuarioDeLaSesion(request)?.roles ?? [];
  return roles.includes("PROFESORA") && !roles.includes("PROPIETARIA");
}

function idsDeLaSesion(request: Request): number[] {
  const usuario = usuarioDeLaSesion(request);
  if (!usuario) return [];
  const persona = db.usuariosPersonas.find(
    (u) => (usuario.email && u.email === usuario.email) || u.id_usuario === usuario.id_usuario,
  );
  return [usuario.id_usuario, ...(persona ? [persona.id_usuario] : [])];
}

/** El alumno es quien inició sesión o un menor a su cargo. */
function esDeLaSesion(request: Request, alumno: AlumnoMock): boolean {
  const ids = idsDeLaSesion(request);
  return ids.includes(alumno.id_usuario) || (alumno.id_usuario_responsable !== null && ids.includes(alumno.id_usuario_responsable));
}

function alumnoDeLaSesion(request: Request): AlumnoMock | undefined {
  return db.alumnos.find((alumno) => esDeLaSesion(request, alumno));
}

function diaDeSemana(fecha: Date): number {
  const dia = fecha.getDay();
  return dia === 0 ? 7 : dia;
}

function nombreProfesora(idProfesora: number): string {
  const profesora = db.profesoras.find((item) => item.id_profesora === idProfesora);
  const usuario = profesora && db.usuarios.find((item) => item.id_usuario === profesora.id_usuario);
  return usuario ? `${usuario.nombre} ${usuario.apellido}` : "Profesora sin asignar";
}

function panelAlumnoDe(alumno: AlumnoMock) {
  const persona = datosPersonales(alumno.id_usuario);
  const [inscripcion] = vigentesDe(alumno.id_alumno);
  const plan = inscripcion ? db.planes.find((item) => item.id_plan === inscripcion.id_plan) : undefined;
  const situacion = inscripcion ? situacionCuotaDe(inscripcion) : null;
  const estadoCuota =
    situacion?.estado === "POR_VENCER"
      ? "EN_GRACIA"
      : situacion?.estado === "AL_DIA"
        ? "AL_DIA"
        : "VENCIDA";
  const horarios = inscripcion
    ? inscripcion.ids_horarios
        .map((id) => db.horarios.find((horario) => horario.id_horario === id))
        .filter((horario): horario is HorarioMock => horario !== undefined && horario.fecha_baja === null)
    : [];
  const hoy = new Date();
  const proximasClases = [];

  for (let offset = 0; offset < 14 && proximasClases.length < 4; offset += 1) {
    const fecha = new Date(hoy);
    fecha.setHours(12, 0, 0, 0);
    fecha.setDate(hoy.getDate() + offset);
    const fechaTexto = fecha.toISOString().slice(0, 10);
    for (const horario of horarios) {
      if (horario.dia_semana !== diaDeSemana(fecha)) continue;
      const actividad = db.actividades.find((item) => item.id_actividad === horario.id_actividad);
      if (!actividad) continue;
      proximasClases.push({
        id: Number(fechaTexto.replaceAll("-", "")) * 100 + horario.id_horario,
        fecha: fechaTexto,
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
        actividad: actividad.nombre,
        profesora: nombreProfesora(horario.id_profesora),
        cupo_disponible: horario.cupo_maximo,
      });
    }
  }

  const historialAsistencias = db.asistencias
    .filter((registro) => registro.id_alumno === alumno.id_alumno)
    .map((registro) => {
      const clase = db.clases.find((item) => item.id_clase === registro.id_clase);
      const horario = clase && db.horarios.find((item) => item.id_horario === clase.id_horario);
      const actividad = horario && db.actividades.find((item) => item.id_actividad === horario.id_actividad);
      if (!clase || !horario || !actividad) return null;
      return {
        id: registro.id_clase,
        fecha: clase.fecha_clase.slice(0, 10),
        actividad: actividad.nombre,
        profesora: nombreProfesora(horario.id_profesora),
        estado: registro.asistio ? "PRESENTE" : "AUSENTE",
      };
    })
    .filter((registro): registro is NonNullable<typeof registro> => registro !== null)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return {
    id_alumno: alumno.id_alumno,
    alumno: { nombre: persona.nombre, apellido: persona.apellido },
    plan: plan && situacion
      ? {
          nombre: plan.nombre,
          tipo: plan.tipo,
          clases_por_semana: plan.clases_por_semana,
          profesora: nombreProfesora(inscripcion.id_profesora),
          estado_cuota: estadoCuota,
          fecha_vencimiento: situacion.fecha_vencimiento?.slice(0, 10) ?? "",
          dias_restantes: situacion.dias_restantes ?? 0,
        }
      : null,
    proximas_clases: proximasClases.sort((a, b) => `${a.fecha}${a.hora_inicio}`.localeCompare(`${b.fecha}${b.hora_inicio}`)),
    historial_asistencias: historialAsistencias,
  };
}

export const alumnosHandlers = [
  http.get("*/api/v1/alumnos", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const query = new URL(request.url).searchParams;
    const estado = query.get("estado");
    const limit = numeroDeQuery(query.get("limit"), LIMITE_POR_DEFECTO);
    const offset = numeroDeQuery(query.get("offset"), 0);
    if ((estado && !ESTADOS.includes(estado)) || !limit || limit > LIMITE_MAXIMO || offset === null) {
      return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    }

    const idProfACargo = esSoloProfesora(request) ? idProfesoraDeLaSesion(request) : undefined;
    const filtrados = filtrarAlumnos(query, idProfACargo);
    return HttpResponse.json({
      datos: filtrados.slice(offset, offset + limit).map(alumnoEnListado),
      total: filtrados.length,
      limit,
      offset,
    });
  }),

  // US-16 y US-29: Datos del plan actual, cuota y datos bancarios para el alumno en sesión.
  http.get("*/api/v1/alumnos/mi-plan", async ({ request }) => {
    await delay(300);
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Sesión no válida");

    const persona = db.usuariosPersonas.find(
      (u) => (usuario.email && u.email === usuario.email) || u.id_usuario === usuario.id_usuario,
    );
    const idsCandidatos = [usuario.id_usuario, ...(persona ? [persona.id_usuario] : [])];

    let alumno = db.alumnos.find(
      (a) =>
        idsCandidatos.includes(a.id_usuario) ||
        (a.id_usuario_responsable !== null && idsCandidatos.includes(a.id_usuario_responsable)),
    );

    // Para testing o demostración con la sesión inicial de propietaria, fallback al primer alumno con plan
    if (!alumno) {
      alumno = db.alumnos.find((a) => a.estado !== "BAJA") ?? db.alumnos[0];
    }

    if (!alumno) return errorApi(404, "NOT_FOUND", "No se encontró el alumno asociado");

    const personaAlumno = datosPersonales(alumno.id_usuario);
    const [vigente] = vigentesDe(alumno.id_alumno);
    const inscripcionDatos = vigente ? inscripcionConDatos(vigente) : null;
    const situacion = vigente ? situacionCuotaDe(vigente) : null;

    // Verificar si hay transferencias pendientes
    const transferenciaPendiente = vigente
      ? db.pagos.find(
          (p) =>
            p.id_inscripcion === vigente.id_inscripcion &&
            p.forma_pago === "TRANSFERENCIA" &&
            p.estado === "PENDIENTE",
        ) ?? null
      : null;

    const datosBancarios = {
      banco: "Banco Santander Río",
      cbu: "0720123488000012345678",
      alias: "MIFR.CENTRO.FIT",
      titular: "MiFR Entrenamiento Integral S.R.L.",
      cuit: "30-71234567-9",
    };

    return HttpResponse.json({
      alumno: {
        id_alumno: alumno.id_alumno,
        nombre: personaAlumno.nombre,
        apellido: personaAlumno.apellido,
        dni: personaAlumno.dni,
      },
      inscripcion: inscripcionDatos
        ? {
            id_inscripcion: inscripcionDatos.id_inscripcion,
            id_plan: inscripcionDatos.id_plan,
            nombre_plan: inscripcionDatos.plan.nombre,
            estado: inscripcionDatos.estado,
            precio: precioVigenteDePlan(inscripcionDatos.id_plan)?.precio ?? 25000,
            clases_por_semana: inscripcionDatos.plan.clases_por_semana,
            nombre_profesora: `${inscripcionDatos.profesora.usuario.nombre} ${inscripcionDatos.profesora.usuario.apellido}`,
          }
        : null,
      situacion_cuota: situacion
        ? {
            estado: situacion.estado,
            fecha_vencimiento: situacion.fecha_vencimiento,
            dias_restantes: situacion.dias_restantes,
            puede_asistir: situacion.puede_asistir,
            monto: precioVigenteDePlan(inscripcionDatos?.id_plan ?? 1)?.precio ?? 25000,
            tiene_transferencia_pendiente: transferenciaPendiente !== null,
            transferencia_pendiente: transferenciaPendiente
              ? {
                  id_pago: transferenciaPendiente.id_pago,
                  monto: transferenciaPendiente.monto,
                  fecha_hora_transferencia: transferenciaPendiente.fecha_hora_transferencia,
                  fecha_pago: transferenciaPendiente.fecha_pago,
                }
              : null,
          }
        : null,
      datos_bancarios: datosBancarios,
    });
  }),

  // US-29: contrato consolidado provisional para el panel del alumno. Se reemplaza por el
  // endpoint del backend cuando esté disponible.
  http.get("*/api/v1/alumnos/mi-panel", async ({ request }) => {
    await delay(300);
    // Con ?id_alumno= el tutor pide el de uno de sus menores; solo si es propio o está a su cargo.
    const pedido = Number(new URL(request.url).searchParams.get("id_alumno"));
    if (pedido) {
      const alumno = db.alumnos.find((item) => item.id_alumno === pedido);
      if (!alumno) return errorApi(404, "NOT_FOUND", "No se encontró el alumno");
      if (!esDeLaSesion(request, alumno)) return errorApi(403, "FORBIDDEN", "No tiene permisos para ver este alumno");
      return HttpResponse.json(panelAlumnoDe(alumno));
    }
    const alumno = alumnoDeLaSesion(request) ?? db.alumnos.find((item) => item.estado !== "BAJA");
    if (!alumno) return errorApi(404, "NOT_FOUND", "No se encontró el alumno asociado");
    return HttpResponse.json(panelAlumnoDe(alumno));
  }),

  http.get("*/api/v1/alumnos/:id/asistencias", async ({ params }) => {
    await delay(200);
    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");

    // Construcción trazable y dinámica del historial de asistencias a partir de los horarios reales del alumno
    const hoy = hoyEnArgentina();
    const marcasHistoricas = asistenciaHistorica(db, hoy).filter((marca) => marca.id_alumno === id);

    const historial = marcasHistoricas.map((marca) => {
      const horario = db.horarios.find((h) => h.id_horario === marca.id_horario);
      const actividad = db.actividades.find((a) => a.id_actividad === marca.id_actividad);
      const prof = db.profesoras.find((p) => p.id_profesora === marca.id_profesora);
      const usuarioProf = prof ? db.usuarios.find((u) => u.id_usuario === prof.id_usuario) : null;
      const diaNum = horario?.dia_semana ?? 1;

      return {
        id_clase: Number(marca.fecha.replaceAll("-", "")) * 100 + marca.id_horario,
        fecha: marca.fecha,
        dia: diaSemana(diaNum),
        hora_inicio: horario?.hora_inicio ?? "08:00",
        hora_fin: horario?.hora_fin ?? "09:00",
        actividad: actividad?.nombre ?? "Entrenamiento",
        profesora: usuarioProf ? `${usuarioProf.nombre} ${usuarioProf.apellido}` : "Profesora",
        asistio: marca.asistio,
        observaciones: null as string | null,
      };
    });

    const asistenciasEnVivo = db.asistencias.filter((reg) => reg.id_alumno === id);
    for (const reg of asistenciasEnVivo) {
      const clase = db.clases.find((c) => c.id_clase === reg.id_clase);
      if (!clase) continue;
      const horario = db.horarios.find((h) => h.id_horario === clase.id_horario);
      const actividad = horario ? db.actividades.find((a) => a.id_actividad === horario.id_actividad) : null;
      const prof = horario ? db.profesoras.find((p) => p.id_profesora === horario.id_profesora) : null;
      const usuarioProf = prof ? db.usuarios.find((u) => u.id_usuario === prof.id_usuario) : null;
      const diaNum = horario?.dia_semana ?? 1;

      const itemEnVivo = {
        id_clase: clase.id_clase,
        fecha: clase.fecha_clase,
        dia: diaSemana(diaNum),
        hora_inicio: horario?.hora_inicio ?? "08:00",
        hora_fin: horario?.hora_fin ?? "09:00",
        actividad: actividad?.nombre ?? "Entrenamiento",
        profesora: usuarioProf ? `${usuarioProf.nombre} ${usuarioProf.apellido}` : "Profesora",
        asistio: reg.asistio,
        observaciones: reg.observaciones ?? null,
      };

      const indiceExistente = historial.findIndex((h) => h.fecha === itemEnVivo.fecha && h.hora_inicio === itemEnVivo.hora_inicio);
      if (indiceExistente >= 0) {
        historial[indiceExistente] = itemEnVivo;
      } else {
        historial.push(itemEnVivo);
      }
    }

    historial.sort((a, b) => {
      const compFecha = b.fecha.localeCompare(a.fecha);
      if (compFecha !== 0) return compFecha;
      return b.hora_inicio.localeCompare(a.hora_inicio);
    });

    return HttpResponse.json(historial);
  }),

  http.get("*/api/v1/alumnos/:id", async ({ request, params }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    if (esSoloProfesora(request)) {
      const idProf = idProfesoraDeLaSesion(request);
      if (!esAlumnoDeLaProfesora(alumno, idProf)) {
        return errorApi(403, "FORBIDDEN", "Solo puede ver y editar a los alumnos que tiene a cargo");
      }
    }
    return HttpResponse.json(fichaDe(alumno));
  }),

  // Alta del alumno (US-05): queda INACTIVO hasta que su pre-inscripción tenga el primer pago.
  http.post("*/api/v1/alumnos", async ({ request }) => {
    await delay(400);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_EDITAR" });
    if (denegado) return denegado;

    const cuerpo = crearAlumnoSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const datos = cuerpo.data;
    const error = errorDeEdad(datos.fecha_nacimiento, datos.email, datos.tutor !== undefined) ?? identidadOcupada(datos.dni, datos.email);
    if (error) return error;

    const idResponsable = datos.tutor ? resolverTutor(datos.tutor) : null;
    if (datos.tutor && idResponsable === null) return errorApi(404, "NOT_FOUND", "Tutor no encontrado");
    return HttpResponse.json(alumnoDe(crearAlumno(datos, idResponsable)), { status: 201 });
  }),

  // Edición (US-09). La profesora solo cambia contacto y observaciones; el plan y los horarios se
  // cambian desde la inscripción.
  http.patch("*/api/v1/alumnos/:id", async ({ request, params }) => {
    await delay(400);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_EDITAR" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const cuerpo = actualizarAlumnoSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    const cambios = cuerpo.data;
    if (esSoloProfesora(request)) {
      const idProf = idProfesoraDeLaSesion(request);
      if (!esAlumnoDeLaProfesora(alumno, idProf)) {
        return errorApi(403, "FORBIDDEN", "Solo puede ver y editar a los alumnos que tiene a cargo");
      }
      if (Object.keys(cambios).some((campo) => !CAMPOS_DE_LA_PROFESORA.includes(campo))) {
        return errorApi(403, "FORBIDDEN", "La profesora solo modifica el contacto y las observaciones");
      }
    }

    const usuario = datosPersonales(alumno.id_usuario);
    const menor = edad(cambios.fecha_nacimiento ?? usuario.fecha_nacimiento) < MAYORIA_DE_EDAD;
    const error = errorDeEdadAlEditar(alumno, cambios, menor) ?? identidadOcupada(cambios.dni, cambios.email, usuario.id_usuario);
    if (error) return error;

    // Un menor sigue con su tutor si no se manda otro; si pasó a ser mayor, el tutor se quita.
    const idResponsable = cambios.tutor ? resolverTutor(cambios.tutor) : menor ? undefined : null;
    if (cambios.tutor && idResponsable === null) return errorApi(404, "NOT_FOUND", "Tutor no encontrado");
    aplicarCambios(alumno, cambios, idResponsable);
    return HttpResponse.json(alumnoDe(alumno));
  }),

  // Baja lógica (US-08): solo la propietaria. No borra nada: cierra las inscripciones vigentes
  // con el motivo (liberan su cupo) y deja al alumno de baja, sin acceso al sistema.
  http.post("*/api/v1/alumnos/:id/baja", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "ALUMNOS_EDITAR" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const cuerpo = bajaAlumnoBodySchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    if (alumno.estado === "BAJA") return errorApi(409, "CONFLICT", "El alumno ya está dado de baja");

    const ahora = new Date().toISOString();
    const { motivo_baja, detalle_baja = null } = cuerpo.data;
    for (const inscripcion of vigentesDe(id)) {
      Object.assign(inscripcion, { estado: "BAJA", motivo_baja, detalle_baja, fecha_baja: ahora });
    }
    Object.assign(alumno, { estado: "BAJA", fecha_baja: ahora });
    datosPersonales(alumno.id_usuario).estado = "INACTIVO";
    return HttpResponse.json({ mensaje: "Alumno dado de baja" });
  }),

  // Reactivación (US-08): solo la propietaria. Crea una inscripción nueva, activa si ya pagó alguna vez (la de la baja
  // queda en el historial) y vuelve a validar el cupo.
  http.post("*/api/v1/alumnos/:id/reactivar", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "ALUMNOS_EDITAR" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const cuerpo = planYHorariosSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    if (alumno.estado !== "BAJA") return errorApi(409, "CONFLICT", "Solo se puede reactivar un alumno dado de baja");
    const error = errorDeHorarios(cuerpo.data);
    if (error) return error;

    // Quien nunca pagó vuelve pre-inscripto y sin acceso hasta su primer pago (US-07).
    const yaPago = tuvoPagoConfirmado(id);
    const inscripcion = guardarInscripcion(id, cuerpo.data, yaPago ? "ACTIVA" : "PREINSCRIPTA");
    Object.assign(alumno, { estado: yaPago ? "ACTIVO" : "INACTIVO", fecha_baja: null });
    if (yaPago) datosPersonales(alumno.id_usuario).estado = "ACTIVO";
    return HttpResponse.json(inscripcionConDatos(inscripcion), { status: 201 });
  }),
];
