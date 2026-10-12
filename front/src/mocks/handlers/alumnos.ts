import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { bajaAlumnoBodySchema, type AlumnoApi } from "@/features/alumnos/schemas/alumno";
import { db, siguienteId } from "@/mocks/db";
import type { AlumnoMock, UsuarioPersonaMock } from "@/mocks/data/alumnos";
import { errorApi, idDeRuta, idInvalido, usuarioDeLaSesion, verificarAcceso } from "@/mocks/handlers/respuestas";
import { errorDeHorarios, guardarInscripcion, planYHorariosSchema, vigentesDe } from "@/mocks/handlers/reglas-inscripcion";
import { inscripcionConDatos } from "@/mocks/handlers/serializar";
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

// AlumnoEnListado del back: el resumen de su inscripción vigente más reciente, o null.
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
  };
}

// FichaAlumno del back: el alumno con sus inscripciones vigentes.
function fichaDe(alumno: AlumnoMock) {
  return { ...alumnoDe(alumno), inscripciones: vigentesDe(alumno.id_alumno).map(inscripcionConDatos) };
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

function filtrarAlumnos(query: URLSearchParams): AlumnoMock[] {
  const dni = query.get("dni");
  return db.alumnos
    .filter((a) => coincideEstado(a, query.get("estado"), query.get("incluirBajas") === "true"))
    .filter((a) => coincideBusqueda(a, query.get("busqueda")))
    .filter((a) => !dni || datosPersonales(a.id_usuario).dni === dni)
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

const datosDelAlumno = {
  dni: z.string().regex(/^\d{7,8}$/).optional(),
  telefono: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  cont_emerg_nombre: z.string().nullable().optional(),
  cont_emerg_telefono: z.string().nullable().optional(),
  fecha_apto_medico: z.string().date().nullable().optional(),
  observaciones: z.string().max(500).nullable().optional(),
};

const crearAlumnoSchema = z.object({
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  email: z.string().email().optional(),
  fecha_nacimiento: z.string().date(),
  ...datosDelAlumno,
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
    cont_emerg_nombre: datos.cont_emerg_nombre ?? null,
    cont_emerg_telefono: datos.cont_emerg_telefono ?? null,
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

    const filtrados = filtrarAlumnos(query);
    return HttpResponse.json({
      datos: filtrados.slice(offset, offset + limit).map(alumnoEnListado),
      total: filtrados.length,
      limit,
      offset,
    });
  }),

  http.get("*/api/v1/alumnos/:id", async ({ request, params }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
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
    if (esSoloProfesora(request) && Object.keys(cambios).some((campo) => !CAMPOS_DE_LA_PROFESORA.includes(campo))) {
      return errorApi(403, "FORBIDDEN", "La profesora solo modifica el contacto y las observaciones");
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

  // Reactivación (US-08): solo la propietaria. Crea una inscripción activa nueva (la de la baja
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

    const inscripcion = guardarInscripcion(id, cuerpo.data, "ACTIVA");
    Object.assign(alumno, { estado: "ACTIVO", fecha_baja: null });
    datosPersonales(alumno.id_usuario).estado = "ACTIVO";
    return HttpResponse.json(inscripcionConDatos(inscripcion), { status: 201 });
  }),
];
