import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { situacionCuotaDe } from "@/mocks/situacion-cuota";
import { db, type ClaseAsistenciaMock, type HorarioMock, type RegistroAsistenciaMock } from "@/mocks/db";
import { errorApi, idDeRuta, idInvalido, usuarioDeLaSesion, verificarAcceso } from "@/mocks/handlers/respuestas";

const marcaSchema = z.object({ asistio: z.boolean() });
const MINUTOS_GRACIA_CIERRE = 15;
const MILISEGUNDOS_POR_MINUTO = 60_000;

function hoyEnArgentina(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parte = (tipo: "year" | "month" | "day") => partes.find((item) => item.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

function fechaValida(fecha: string | null): fecha is string {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const valor = new Date(`${fecha}T00:00:00.000Z`);
  return Number.isFinite(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha;
}

function numeroDia(fecha: string): number {
  const dia = new Date(`${fecha}T00:00:00.000Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

function idClase(fecha: string, idHorario: number): number {
  return Number(fecha.replaceAll("-", "")) * 10 + idHorario;
}

function claseDeHorario(fecha: string, horario: HorarioMock): ClaseAsistenciaMock {
  const id = idClase(fecha, horario.id_horario);
  let clase = db.clases.find((candidata) => candidata.id_clase === id);
  if (!clase) {
    clase = {
      id_clase: id,
      id_horario: horario.id_horario,
      fecha_clase: `${fecha}T00:00:00.000Z`,
      estado: "PROGRAMADA",
      fecha_cierre_asist: null,
      observaciones: null,
    };
    db.clases.push(clase);
  }
  return clase;
}

function horarioDeClase(clase: ClaseAsistenciaMock): HorarioMock | undefined {
  return db.horarios.find((horario) => horario.id_horario === clase.id_horario);
}

function inscriptosDeClase(clase: ClaseAsistenciaMock) {
  return db.inscripciones.flatMap((inscripcion) => {
    if (inscripcion.estado !== "ACTIVA" || !inscripcion.ids_horarios.includes(clase.id_horario)) return [];
    const alumno = db.alumnos.find((candidato) => candidato.id_alumno === inscripcion.id_alumno);
    const usuario = alumno && db.usuariosPersonas.find((candidato) => candidato.id_usuario === alumno.id_usuario);
    if (!alumno || alumno.estado !== "ACTIVO" || !usuario) return [];
    return [{ inscripcion, alumno, usuario }];
  });
}

function respuestaClase(clase: ClaseAsistenciaMock) {
  const horario = horarioDeClase(clase);
  const actividad = horario && db.actividades.find((candidata) => candidata.id_actividad === horario.id_actividad);
  if (!horario || !actividad) throw new Error("La clase mock referencia un horario o actividad inexistente");
  return {
    ...clase,
    id_prof_dictante: horario.id_profesora,
    horario: {
      hora_inicio: `1970-01-01T${horario.hora_inicio}:00.000Z`,
      hora_fin: `1970-01-01T${horario.hora_fin}:00.000Z`,
      cupo_maximo: horario.cupo_maximo,
      actividad: {
        id_actividad: actividad.id_actividad,
        nombre: actividad.nombre,
        modalidad: actividad.modalidad,
        cupo_maximo: actividad.cupo_maximo,
      },
    },
  };
}

function respuestaClaseDelDia(clase: ClaseAsistenciaMock) {
  const horario = horarioDeClase(clase);
  if (!horario) throw new Error("La clase mock referencia un horario inexistente");
  const cupo = horario.cupo_maximo ?? db.actividades.find((a) => a.id_actividad === horario.id_actividad)?.cupo_maximo ?? null;
  return {
    ...respuestaClase(clase),
    inscriptos: inscriptosDeClase(clase).length,
    cupo_disponible: cupo === null ? null : cupo - inscriptosDeClase(clase).length,
  };
}

function registroDe(clase: ClaseAsistenciaMock, idAlumno: number) {
  return db.asistencias.find((registro) => registro.id_clase === clase.id_clase && registro.id_alumno === idAlumno);
}

function guardarRegistro(
  clase: ClaseAsistenciaMock,
  inscripto: ReturnType<typeof inscriptosDeClase>[number],
  asistio: boolean,
  idUsuario: number | null,
  fechaRegistro: string,
): void {
  const existente = registroDe(clase, inscripto.alumno.id_alumno);
  const registro: RegistroAsistenciaMock = {
    id_clase: clase.id_clase,
    id_alumno: inscripto.alumno.id_alumno,
    id_inscripcion: inscripto.inscripcion.id_inscripcion,
    asistio,
    observaciones: existente?.observaciones ?? null,
    id_usuario_registra: idUsuario,
    fecha_registro: fechaRegistro,
  };
  if (existente) Object.assign(existente, registro);
  else db.asistencias.push(registro);
}

function completarAusentes(clase: ClaseAsistenciaMock, fechaRegistro: string): void {
  for (const inscripto of inscriptosDeClase(clase)) {
    if (!registroDe(clase, inscripto.alumno.id_alumno)) {
      guardarRegistro(clase, inscripto, false, null, fechaRegistro);
    }
  }
}

function tieneMarcasManuales(clase: ClaseAsistenciaMock): boolean {
  return db.asistencias.some(
    (registro) => registro.id_clase === clase.id_clase && registro.id_usuario_registra !== null,
  );
}

function procesarCierresAutomaticos(): void {
  const ahora = new Date();
  for (const clase of db.clases) {
    if (clase.estado !== "PROGRAMADA") continue;
    const horario = horarioDeClase(clase);
    if (!horario) continue;
    const finClase = new Date(`${clase.fecha_clase.slice(0, 10)}T${horario.hora_fin}:00-03:00`);
    const vencimiento = new Date(finClase.getTime() + MINUTOS_GRACIA_CIERRE * MILISEGUNDOS_POR_MINUTO);
    if (vencimiento > ahora) continue;
    clase.estado = "DICTADA";
    clase.fecha_cierre_asist = ahora.toISOString();
    if (tieneMarcasManuales(clase)) completarAusentes(clase, ahora.toISOString());
  }
}

function listaDeFecha(fecha: string) {
  const idUsuario = db.idUsuarioSesion;
  const usuario = db.usuarios.find((candidato) => candidato.id_usuario === idUsuario);
  const profesora = usuario && db.profesoras.find((candidata) => candidata.id_usuario === usuario.id_usuario);
  const horarios = db.horarios.filter(
    (horario) =>
      horario.fecha_baja === null &&
      horario.dia_semana === numeroDia(fecha) &&
      (usuario?.roles.includes("PROPIETARIA") || horario.id_profesora === profesora?.id_profesora),
  );
  const clases = horarios.map((horario) => claseDeHorario(fecha, horario));
  procesarCierresAutomaticos();
  return clases
    .map(respuestaClaseDelDia)
    .sort((a, b) => a.horario.hora_inicio.localeCompare(b.horario.hora_inicio));
}

function permisoDeClase(request: Request) {
  return verificarAcceso(request, { permiso: "ASISTENCIAS_MARCAR" });
}

function claseParaUsuario(id: number, request: Request) {
  const clase = db.clases.find((candidata) => candidata.id_clase === id);
  const usuario = usuarioDeLaSesion(request);
  if (!clase || !usuario) return null;
  if (usuario.roles.includes("PROPIETARIA")) return clase;
  const profesora = db.profesoras.find((candidata) => candidata.id_usuario === usuario.id_usuario);
  const horario = horarioDeClase(clase);
  if (
    clase.fecha_clase.slice(0, 10) !== hoyEnArgentina() ||
    !profesora ||
    horario?.id_profesora !== profesora.id_profesora
  ) {
    return null;
  }
  return clase;
}

function respuestaAsistencia(clase: ClaseAsistenciaMock) {
  return {
    clase: respuestaClase(clase),
    inscriptos: inscriptosDeClase(clase).map(({ inscripcion, alumno, usuario }) => {
      const registro = registroDe(clase, alumno.id_alumno);
      return {
        id_alumno: alumno.id_alumno,
        id_inscripcion: inscripcion.id_inscripcion,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        asistencia: registro ? (registro.asistio ? "presente" : "ausente") : "sin_marcar",
        observaciones: registro?.observaciones ?? null,
        situacion_cuota: situacionCuotaDe(inscripcion),
      };
    }),
  };
}

export const asistenciaHandlers = [
  http.get("*/api/v1/clases/hoy", async ({ request }) => {
    await delay(250);
    const denegado = permisoDeClase(request);
    if (denegado) return denegado;
    return HttpResponse.json(listaDeFecha(hoyEnArgentina()));
  }),

  http.get("*/api/v1/clases", async ({ request }) => {
    await delay(250);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "ASISTENCIAS_MARCAR" });
    if (denegado) return denegado;
    const fecha = new URL(request.url).searchParams.get("fecha");
    if (!fechaValida(fecha)) return errorApi(400, "VALIDATION_ERROR", "Indique una fecha válida");
    if (fecha > hoyEnArgentina()) return errorApi(400, "VALIDATION_ERROR", "La fecha no puede ser futura");
    return HttpResponse.json(listaDeFecha(fecha));
  }),

  http.get("*/api/v1/clases/:id/asistencia", async ({ request, params }) => {
    await delay(200);
    const denegado = permisoDeClase(request);
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();
    procesarCierresAutomaticos();
    const clase = claseParaUsuario(id, request);
    if (!clase) return errorApi(404, "NOT_FOUND", "Clase no encontrada");
    return HttpResponse.json(respuestaAsistencia(clase));
  }),

  http.put("*/api/v1/clases/:id/asistencia/:idAlumno", async ({ request, params }) => {
    await delay(250);
    const denegado = permisoDeClase(request);
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    const idAlumno = idDeRuta(params.idAlumno);
    if (!id || !idAlumno) return idInvalido();
    const datos = marcaSchema.safeParse(await request.json().catch(() => null));
    if (!datos.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    procesarCierresAutomaticos();
    const clase = claseParaUsuario(id, request);
    if (!clase) return errorApi(404, "NOT_FOUND", "Clase no encontrada");
    if (clase.estado === "CANCELADA") return errorApi(409, "CONFLICT", "La clase está cancelada");
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    if (clase.estado === "DICTADA" && !usuario.roles.includes("PROPIETARIA")) {
      return errorApi(409, "CONFLICT", "La asistencia de la clase está cerrada");
    }
    const inscripto = inscriptosDeClase(clase).find(({ alumno }) => alumno.id_alumno === idAlumno);
    if (!inscripto) return errorApi(404, "NOT_FOUND", "El alumno no está inscripto en este horario");
    guardarRegistro(clase, inscripto, datos.data.asistio, usuario.id_usuario, new Date().toISOString());
    return HttpResponse.json({ mensaje: "Asistencia registrada" });
  }),

  http.post("*/api/v1/clases/:id/asistencia/todos-presentes", async ({ request, params }) => {
    await delay(250);
    const denegado = permisoDeClase(request);
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();
    procesarCierresAutomaticos();
    const clase = claseParaUsuario(id, request);
    if (!clase) return errorApi(404, "NOT_FOUND", "Clase no encontrada");
    if (clase.estado === "CANCELADA") return errorApi(409, "CONFLICT", "La clase está cancelada");
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    if (clase.estado === "DICTADA" && !usuario.roles.includes("PROPIETARIA")) {
      return errorApi(409, "CONFLICT", "La asistencia de la clase está cerrada");
    }
    for (const inscripto of inscriptosDeClase(clase)) {
      guardarRegistro(clase, inscripto, true, usuario.id_usuario, new Date().toISOString());
    }
    return HttpResponse.json({ mensaje: "Todos los inscriptos quedaron presentes" });
  }),

  http.post("*/api/v1/clases/:id/cerrar", async ({ request, params }) => {
    await delay(250);
    const denegado = permisoDeClase(request);
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();
    procesarCierresAutomaticos();
    const clase = claseParaUsuario(id, request);
    if (!clase) return errorApi(404, "NOT_FOUND", "Clase no encontrada");
    if (clase.estado === "CANCELADA") return errorApi(409, "CONFLICT", "La clase está cancelada");
    if (clase.estado === "PROGRAMADA") {
      const ahora = new Date().toISOString();
      completarAusentes(clase, ahora);
      clase.estado = "DICTADA";
      clase.fecha_cierre_asist = ahora;
    }
    return HttpResponse.json(respuestaClase(clase));
  }),
];
