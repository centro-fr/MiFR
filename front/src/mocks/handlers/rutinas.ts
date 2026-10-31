import { delay, http, HttpResponse } from "msw";
import { z } from "zod";
import { CODIGOS_MEDIDA, MEDIDAS } from "@/features/rutinas/schemas/medidas";
import { db, siguienteId } from "@/mocks/db";
import type { AlumnoMock } from "@/mocks/data/alumnos";
import type { RegistroProgresoMock, RutinaMock } from "@/mocks/data/rutinas";
import type { UsuarioSemilla } from "@/mocks/data/semilla";
import { hoyEnArgentina } from "@/mocks/precios";
import { errorApi, idDeRuta, idInvalido, permisosDeRoles, usuarioDeLaSesion, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de US-27 con el contrato del back (gestion-rutinas-y-progreso): mismas rutas, validaciones y
// reglas de AccesoAAlumno, incluidas la corrección y la baja lógica de mediciones.

const EDITAR = { permiso: "RUTINAS_EDITAR" } as const;
const UN_DIA_MS = 86_400_000;

// textoSchema del back: sin espacios en los extremos y con al menos una letra.
const texto = (maximo: number) => z.string().trim().min(1).max(maximo).regex(/\p{L}/u);
const textoOpcional = (maximo: number) =>
  z.preprocess((valor) => (typeof valor === "string" && valor.trim() === "" ? null : valor), texto(maximo).nullable().optional());
const fecha = z.string().date();

const crearRutinaSchema = z
  .object({
    id_alumno: z.number().int().positive(),
    id_profesora: z.number().int().positive().optional(),
    nombre: texto(100),
    fecha_desde: fecha,
    fecha_hasta: fecha.nullable().optional(),
    contenido: z.object({
      dias: z
        .array(
          z.object({
            nombre: texto(60),
            ejercicios: z
              .array(
                z.object({
                  nombre: texto(80),
                  series: z.number().int().min(1).max(20),
                  repeticiones: z.string().trim().min(1).max(30),
                  notas: textoOpcional(200),
                }),
              )
              .min(1)
              .max(30),
          }),
        )
        .min(1)
        .max(7),
    }),
    observaciones: textoOpcional(500),
  })
  .refine(({ fecha_desde, fecha_hasta }) => !fecha_hasta || fecha_hasta >= fecha_desde);

const medidasSchema = z
  .array(
    z
      .object({ codigo: z.enum(CODIGOS_MEDIDA), valor: z.number().positive() })
      .refine(({ codigo, valor }) => valor >= MEDIDAS[codigo].minimo && valor <= MEDIDAS[codigo].maximo)
      .refine(({ valor }) => Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-6),
  )
  .min(1)
  .max(CODIGOS_MEDIDA.length);

type MedidasPedidas = z.infer<typeof medidasSchema>;

const sinRepetidas = (medidas: MedidasPedidas | undefined) =>
  !medidas || new Set(medidas.map(({ codigo }) => codigo)).size === medidas.length;

const registrarProgresoSchema = z
  .object({
    id_alumno: z.number().int().positive(),
    id_profesora: z.number().int().positive().optional(),
    fecha: fecha.optional(),
    observaciones: textoOpcional(500),
    medidas: medidasSchema,
  })
  .refine(({ medidas }) => sinRepetidas(medidas));

// Corregir: lo mismo pero todo opcional y al menos un dato. observaciones en null la borra.
const actualizarProgresoSchema = z
  .object({ fecha: fecha.optional(), observaciones: textoOpcional(500), medidas: medidasSchema.optional() })
  .refine((cambios) => cambios.fecha !== undefined || cambios.observaciones !== undefined || cambios.medidas !== undefined)
  .refine(({ medidas }) => sinRepetidas(medidas));

const comoFecha = (dia: string) => `${dia}T00:00:00.000Z`;

function rutinaConFechas(rutina: RutinaMock) {
  return { ...rutina, fecha_desde: comoFecha(rutina.fecha_desde), fecha_hasta: rutina.fecha_hasta && comoFecha(rutina.fecha_hasta) };
}

// Lo que responde el back: sin la marca de baja, que queda solo en la base.
function registroConFecha(registro: RegistroProgresoMock) {
  const { id_registro, id_alumno, id_profesora, observaciones, fecha_modificacion, id_usuario_modifica, medidas } = registro;
  return { id_registro, id_alumno, id_profesora, fecha: comoFecha(registro.fecha), observaciones, fecha_modificacion, id_usuario_modifica, medidas };
}

// Como el back: en el orden de tipos_medida y con la unidad del catálogo, no la del pedido.
function medidasDelCatalogo(medidas: MedidasPedidas): RegistroProgresoMock["medidas"] {
  return [...medidas]
    .sort((a, b) => CODIGOS_MEDIDA.indexOf(a.codigo) - CODIGOS_MEDIDA.indexOf(b.codigo))
    .map(({ codigo, valor }) => ({ codigo, unidad: MEDIDAS[codigo].unidad, valor }));
}

// ---------- AccesoAAlumno del back ----------

function idProfesoraDe(usuario: UsuarioSemilla): number | null {
  return db.profesoras.find((profesora) => profesora.id_usuario === usuario.id_usuario)?.id_profesora ?? null;
}

// Una profesora tiene a su cargo al alumno con una inscripción suya que no está dada de baja.
function profesoraTieneAlumno(idProfesora: number, idAlumno: number): boolean {
  return db.inscripciones.some((i) => i.id_alumno === idAlumno && i.id_profesora === idProfesora && i.estado !== "BAJA");
}

// La sesión del mock es de `usuarios` y los alumnos y tutores están en `usuariosPersonas`: se reconoce
// a la persona por el email, como en mis-transferencias. En el back es el mismo id_usuario.
function idsDeLaPersona(usuario: UsuarioSemilla): number[] {
  const persona = db.usuariosPersonas.find((u) => u.email !== null && u.email === usuario.email);
  return persona ? [usuario.id_usuario, persona.id_usuario] : [usuario.id_usuario];
}

function esPropio(alumno: AlumnoMock, ids: number[]): boolean {
  return ids.includes(alumno.id_usuario);
}

function esMenorACargo(alumno: AlumnoMock, ids: number[]): boolean {
  return alumno.id_usuario_responsable !== null && ids.includes(alumno.id_usuario_responsable);
}

// Al que no puede ver a un alumno, uno que no existe se le responde igual que uno ajeno.
function errorDeLectura(usuario: UsuarioSemilla, idAlumno: number) {
  const alumno = db.alumnos.find((a) => a.id_alumno === idAlumno);
  if (usuario.roles.includes("PROPIETARIA")) return alumno ? null : errorApi(404, "NOT_FOUND", "Alumno no encontrado");
  const ids = idsDeLaPersona(usuario);
  if (alumno && (esPropio(alumno, ids) || esMenorACargo(alumno, ids))) return null;
  const idProfesora = idProfesoraDe(usuario);
  if (alumno && idProfesora !== null && profesoraTieneAlumno(idProfesora, idAlumno)) return null;
  return errorApi(403, "FORBIDDEN", "Solo podés ver lo tuyo, lo de un menor a tu cargo o lo de tus alumnos");
}

/** La profesora a cuyo nombre queda lo cargado, o la respuesta de error. */
function profesoraQueCarga(usuario: UsuarioSemilla, idAlumno: number, idPedida: number | undefined) {
  const alumno = db.alumnos.find((a) => a.id_alumno === idAlumno);
  const propia = idProfesoraDe(usuario);
  if (!usuario.roles.includes("PROPIETARIA")) {
    if (!alumno || propia === null || !profesoraTieneAlumno(propia, idAlumno)) {
      return { error: errorApi(403, "FORBIDDEN", "Solo podés cargar datos a los alumnos que tenés a cargo") };
    }
    return { idProfesora: propia };
  }
  if (!alumno) return { error: errorApi(404, "NOT_FOUND", "Alumno no encontrado") };
  if (idPedida !== undefined) {
    if (!db.profesoras.some((p) => p.id_profesora === idPedida)) {
      return { error: errorApi(400, "VALIDATION_ERROR", `La profesora ${idPedida} no existe`) };
    }
    return { idProfesora: idPedida };
  }
  if (propia !== null) return { idProfesora: propia };
  return { error: errorApi(400, "VALIDATION_ERROR", "Indicá la profesora que carga el dato") };
}

/**
 * La medición que puede corregir o dar de baja quien inició sesión, o la respuesta de error. La profesora,
 * solo las de sus alumnos a cargo aunque las haya cargado otra; a ella una inexistente o dada de baja se le
 * responde igual que una ajena.
 */
function registroModificable(usuario: UsuarioSemilla, idRegistro: number) {
  const registro = db.registrosProgreso.find((r) => r.id_registro === idRegistro && !r.dado_de_baja);
  if (usuario.roles.includes("PROPIETARIA")) {
    return registro ? { registro } : { error: errorApi(404, "NOT_FOUND", "Registro de progreso no encontrado") };
  }
  const idProfesora = idProfesoraDe(usuario);
  if (registro && idProfesora !== null && profesoraTieneAlumno(idProfesora, registro.id_alumno)) return { registro };
  return { error: errorApi(403, "FORBIDDEN", "Solo podés modificar las mediciones de los alumnos que tenés a cargo") };
}

/** RUTINAS_VER o RUTINAS_VER_PROPIAS abren la consulta; quién ve a cada alumno lo decide errorDeLectura. */
function lecturaDelAlumno(request: Request, valorId: string | readonly string[] | undefined) {
  const denegado = verificarAcceso(request);
  if (denegado) return { error: denegado };
  const usuario = usuarioDeLaSesion(request)!;
  const permisos = permisosDeRoles(usuario.roles);
  if (!permisos.includes("RUTINAS_VER") && !permisos.includes("RUTINAS_VER_PROPIAS")) {
    return { error: errorApi(403, "FORBIDDEN", "No tiene permisos para esta acción") };
  }
  const idAlumno = idDeRuta(valorId);
  if (idAlumno === null) return { error: idInvalido() };
  const error = errorDeLectura(usuario, idAlumno);
  return error ? { error } : { idAlumno };
}

// La nueva queda vigente; a la anterior sin fin se le pone el día previo, sin quedar antes de su inicio.
function cerrarVigentes(idAlumno: number, desde: string): void {
  const diaPrevio = new Date(Date.parse(comoFecha(desde)) - UN_DIA_MS).toISOString().slice(0, 10);
  for (const anterior of db.rutinas.filter((r) => r.id_alumno === idAlumno && r.activa)) {
    anterior.fecha_hasta ??= diaPrevio >= anterior.fecha_desde ? diaPrevio : anterior.fecha_desde;
    anterior.activa = false;
  }
}

export const rutinasHandlers = [
  // US-28: contrato pedido al back en un issue, todavía no existe. El alumno recibe el suyo y el tutor,
  // sus menores a cargo; el resto de los roles no tiene alumnos propios.
  http.get("*/api/v1/alumnos/mios", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request);
    if (denegado) return denegado;
    const usuario = usuarioDeLaSesion(request)!;
    if (!usuario.roles.includes("ALUMNO") && !usuario.roles.includes("TUTOR")) {
      return errorApi(403, "FORBIDDEN", "No tiene permisos para esta acción");
    }
    const ids = idsDeLaPersona(usuario);
    const mios = db.alumnos
      .filter((alumno) => esPropio(alumno, ids) || esMenorACargo(alumno, ids))
      .map((alumno) => {
        const persona = db.usuariosPersonas.find((u) => u.id_usuario === alumno.id_usuario);
        return {
          id_alumno: alumno.id_alumno,
          nombre: persona?.nombre ?? "",
          apellido: persona?.apellido ?? "",
          estado: alumno.estado,
          propio: esPropio(alumno, ids),
        };
      })
      .sort((a, b) => Number(b.propio) - Number(a.propio) || a.nombre.localeCompare(b.nombre, "es"));
    return HttpResponse.json(mios);
  }),

  http.post("*/api/v1/rutinas", async ({ request }) => {
    await delay(500);
    const denegado = verificarAcceso(request, EDITAR);
    if (denegado) return denegado;
    const cuerpo = crearRutinaSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const datos = cuerpo.data;
    const carga = profesoraQueCarga(usuarioDeLaSesion(request)!, datos.id_alumno, datos.id_profesora);
    if ("error" in carga) return carga.error;

    cerrarVigentes(datos.id_alumno, datos.fecha_desde);
    const nueva: RutinaMock = {
      id_rutina: siguienteId(db.rutinas.map((r) => r.id_rutina)),
      id_alumno: datos.id_alumno,
      id_profesora: carga.idProfesora,
      nombre: datos.nombre,
      fecha_desde: datos.fecha_desde,
      fecha_hasta: datos.fecha_hasta ?? null,
      contenido: {
        dias: datos.contenido.dias.map((dia) => ({
          ...dia,
          ejercicios: dia.ejercicios.map((ejercicio) => ({ ...ejercicio, notas: ejercicio.notas ?? null })),
        })),
      },
      observaciones: datos.observaciones ?? null,
      activa: true,
    };
    db.rutinas.push(nueva);
    return HttpResponse.json(rutinaConFechas(nueva), { status: 201 });
  }),

  http.get("*/api/v1/alumnos/:id/rutinas", async ({ request, params }) => {
    await delay(300);
    const lectura = lecturaDelAlumno(request, params.id);
    if ("error" in lectura) return lectura.error;
    const rutinas = db.rutinas
      .filter((r) => r.id_alumno === lectura.idAlumno)
      .sort((a, b) => b.fecha_desde.localeCompare(a.fecha_desde) || b.id_rutina - a.id_rutina);
    return HttpResponse.json(rutinas.map(rutinaConFechas));
  }),

  // Sin rutina responde 200 con null, no 404 (estado vacío del portal del alumno, US-28).
  http.get("*/api/v1/alumnos/:id/rutinas/vigente", async ({ request, params }) => {
    await delay(300);
    const lectura = lecturaDelAlumno(request, params.id);
    if ("error" in lectura) return lectura.error;
    const vigente = db.rutinas.find((r) => r.id_alumno === lectura.idAlumno && r.activa);
    return HttpResponse.json(vigente ? rutinaConFechas(vigente) : null);
  }),

  http.post("*/api/v1/progreso", async ({ request }) => {
    await delay(400);
    const denegado = verificarAcceso(request, EDITAR);
    if (denegado) return denegado;
    const cuerpo = registrarProgresoSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const datos = cuerpo.data;
    const carga = profesoraQueCarga(usuarioDeLaSesion(request)!, datos.id_alumno, datos.id_profesora);
    if ("error" in carga) return carga.error;

    const hoy = hoyEnArgentina();
    const dia = datos.fecha ?? hoy;
    if (dia > hoy) return errorApi(400, "VALIDATION_ERROR", "La fecha de la medición no puede ser futura");

    const nuevo: RegistroProgresoMock = {
      id_registro: siguienteId(db.registrosProgreso.map((r) => r.id_registro)),
      id_alumno: datos.id_alumno,
      id_profesora: carga.idProfesora,
      fecha: dia,
      observaciones: datos.observaciones ?? null,
      medidas: medidasDelCatalogo(datos.medidas),
      fecha_modificacion: null,
      id_usuario_modifica: null,
      dado_de_baja: false,
    };
    db.registrosProgreso.push(nuevo);
    return HttpResponse.json(registroConFecha(nuevo), { status: 201 });
  }),

  http.patch("*/api/v1/progreso/:id", async ({ request, params }) => {
    await delay(400);
    const denegado = verificarAcceso(request, EDITAR);
    if (denegado) return denegado;
    const idRegistro = idDeRuta(params.id);
    if (idRegistro === null) return idInvalido();
    const cuerpo = actualizarProgresoSchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    const usuario = usuarioDeLaSesion(request)!;
    const modificable = registroModificable(usuario, idRegistro);
    if ("error" in modificable) return modificable.error;

    const { fecha: dia, observaciones, medidas } = cuerpo.data;
    if (dia !== undefined && dia > hoyEnArgentina()) {
      return errorApi(400, "VALIDATION_ERROR", "La fecha de la medición no puede ser futura");
    }
    const { registro } = modificable;
    if (dia !== undefined) registro.fecha = dia;
    if (observaciones !== undefined) registro.observaciones = observaciones;
    if (medidas !== undefined) registro.medidas = medidasDelCatalogo(medidas);
    registro.fecha_modificacion = new Date().toISOString();
    registro.id_usuario_modifica = usuario.id_usuario;
    return HttpResponse.json(registroConFecha(registro));
  }),

  http.delete("*/api/v1/progreso/:id", async ({ request, params }) => {
    await delay(400);
    const denegado = verificarAcceso(request, EDITAR);
    if (denegado) return denegado;
    const idRegistro = idDeRuta(params.id);
    if (idRegistro === null) return idInvalido();
    const modificable = registroModificable(usuarioDeLaSesion(request)!, idRegistro);
    if ("error" in modificable) return modificable.error;
    modificable.registro.dado_de_baja = true;
    return new HttpResponse(null, { status: 204 });
  }),

  // De la medición más reciente a la más antigua, sin las dadas de baja.
  http.get("*/api/v1/alumnos/:id/progreso", async ({ request, params }) => {
    await delay(300);
    const lectura = lecturaDelAlumno(request, params.id);
    if ("error" in lectura) return lectura.error;
    const registros = db.registrosProgreso
      .filter((r) => r.id_alumno === lectura.idAlumno && !r.dado_de_baja)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id_registro - a.id_registro);
    return HttpResponse.json(registros.map(registroConFecha));
  }),
];
