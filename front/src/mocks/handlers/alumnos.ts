import { http, HttpResponse, delay } from "msw";
import {
  actualizarAlumnoSchema,
  type AlumnoDetalle,
  type AlumnoResumen,
  type EstadoAlumno,
  type EstadoCuota,
} from "@/features/alumnos/schemas/alumno";
import { db } from "@/mocks/db";
import {
  errorApi,
  idDeRuta,
  idInvalido,
  permisosDeRoles,
  verificarAcceso,
} from "@/mocks/handlers/respuestas";
import { normalizarBusqueda } from "@/features/alumnos/utils/normalizar-busqueda";

const LIMITE_MAXIMO = 50;

function estadoDeVista(alumno: AlumnoDetalle): EstadoAlumno {
  if (alumno.estado === "BAJA" || alumno.inscripcion?.estado === "BAJA") return "BAJA";
  return alumno.inscripcion?.estado === "PREINSCRIPTA" ? "PENDIENTE" : "ACTIVO";
}

function resumen(alumno: AlumnoDetalle): AlumnoResumen {
  const inscripcion = alumno.inscripcion;
  return {
    id_alumno: alumno.id_alumno,
    nombre_completo: `${alumno.usuario.nombre} ${alumno.usuario.apellido}`,
    dni: alumno.usuario.dni,
    telefono: alumno.usuario.telefono ?? alumno.tutor?.telefono ?? null,
    estado: estadoDeVista(alumno),
    plan: inscripcion?.plan?.nombre ?? null,
    id_plan: inscripcion?.plan?.id_plan ?? null,
    estado_cuota: inscripcion?.estado_cuota ?? null,
    fecha_vencimiento: inscripcion?.fecha_vencimiento ?? null,
    profesora: inscripcion?.profesora ?? null,
    id_profesora: inscripcion?.id_profesora ?? null,
    actividad: inscripcion?.horarios[0]?.actividad ?? null,
    id_actividad: inscripcion?.horarios[0]?.id_actividad ?? null,
  };
}

function alumnaVisibleParaSesion(alumno: AlumnoDetalle): boolean {
  const usuario = db.usuarios.find((item) => item.id_usuario === db.idUsuarioSesion);
  if (!usuario) return false;
  if (usuario.roles.includes("PROPIETARIA")) return true;
  if (!usuario.roles.includes("PROFESORA")) return false;
  const idProfesora = db.profesoras.find((item) => item.id_usuario === usuario.id_usuario)?.id_profesora;
  return idProfesora !== undefined && alumno.inscripcion?.id_profesora === idProfesora;
}

function listar(request: Request): AlumnoResumen[] {
  const parametros = new URL(request.url).searchParams;
  const texto = normalizarBusqueda(parametros.get("q")?.trim() ?? "");
  const estado = parametros.get("estado");
  const incluirBajas = parametros.get("incluir_bajas") === "true";
  const idPlan = Number(parametros.get("id_plan"));
  const idProfesora = Number(parametros.get("id_profesora"));
  const idActividad = Number(parametros.get("id_actividad"));
  const estadoCuota = parametros.get("estado_cuota") as EstadoCuota | null;

  const visibles = db.alumnos.filter(alumnaVisibleParaSesion);
  const coincidenciasExactas = texto
    ? visibles.filter(
        (alumno) =>
          String(alumno.id_alumno) === texto || alumno.usuario.dni === texto || alumno.tutor?.dni === texto,
      )
    : visibles;
  const coincidencias = coincidenciasExactas.length
    ? coincidenciasExactas
    : visibles.filter((alumno) => {
        if (!texto) return true;
        const contenido = [
          alumno.usuario.nombre,
          alumno.usuario.apellido,
          alumno.usuario.dni ?? "",
          alumno.usuario.telefono ?? "",
          alumno.usuario.email ?? "",
          alumno.tutor?.nombre ?? "",
          alumno.tutor?.apellido ?? "",
          alumno.tutor?.dni ?? "",
          alumno.tutor?.telefono ?? "",
          alumno.tutor?.email ?? "",
        ].join(" ");
        return normalizarBusqueda(contenido).includes(texto);
      });

  return coincidencias
    .map(resumen)
    .filter((alumno) => {
      if (estado === "BAJA" || estado === "ACTIVO" || estado === "PENDIENTE") {
        return alumno.estado === estado;
      }
      return alumno.estado !== "BAJA" || incluirBajas;
    })
    .filter((alumno) => !Number.isInteger(idPlan) || idPlan <= 0 || alumno.id_plan === idPlan)
    .filter(
      (alumno) => !Number.isInteger(idProfesora) || idProfesora <= 0 || alumno.id_profesora === idProfesora,
    )
    .filter(
      (alumno) =>
        !parametros.has("id_actividad") ||
        !Number.isInteger(idActividad) ||
        idActividad <= 0 ||
        alumno.id_actividad === idActividad,
    )
    .filter((alumno) => !estadoCuota || alumno.estado_cuota === estadoCuota)
    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo, "es"));
}

export const alumnosHandlers = [
  http.get("*/api/v1/alumnos", async ({ request }) => {
    await delay(250);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const parametros = new URL(request.url).searchParams;
    const estado = parametros.get("estado");
    const estadoCuota = parametros.get("estado_cuota");
    const busqueda = parametros.get("q");
    const incluirBajas = parametros.get("incluir_bajas");
    const parametrosNumericos = ["id_plan", "id_profesora", "id_actividad"];
    const parametrosInvalidos = parametrosNumericos.some((nombre) => {
      const valor = parametros.get(nombre);
      return valor !== null && valor !== "" && (!/^\d+$/.test(valor) || Number(valor) < 1);
    });
    if (
      (estado !== null && !["TODOS", "ACTIVO", "PENDIENTE", "BAJA"].includes(estado)) ||
      (estadoCuota !== null && !["AL_DIA", "POR_VENCER", "VENCIDA"].includes(estadoCuota)) ||
      (incluirBajas !== null && !["true", "false"].includes(incluirBajas)) ||
      (busqueda !== null && busqueda.length > 120) ||
      parametrosInvalidos
    ) {
      return errorApi(400, "VALIDATION_ERROR", "Los filtros de alumnos no son válidos");
    }
    const limiteSolicitado = Number(parametros.get("limit") ?? 10);
    const offsetSolicitado = Number(parametros.get("offset") ?? 0);
    if (
      !Number.isInteger(limiteSolicitado) ||
      limiteSolicitado < 1 ||
      !Number.isInteger(offsetSolicitado) ||
      offsetSolicitado < 0 ||
      offsetSolicitado > 1_000_000
    ) {
      return errorApi(400, "VALIDATION_ERROR", "Los parámetros de paginación no son válidos");
    }
    const limit = Math.min(limiteSolicitado, LIMITE_MAXIMO);
    const alumnos = listar(request);
    return HttpResponse.json({
      items: alumnos.slice(offsetSolicitado, offsetSolicitado + limit),
      total: alumnos.length,
      limit,
      offset: offsetSolicitado,
    });
  }),

  http.get("*/api/v1/alumnos/:id", async ({ request, params }) => {
    await delay(180);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const alumno = db.alumnos.find((item) => item.id_alumno === id);
    if (!alumno || !alumnaVisibleParaSesion(alumno))
      return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    const usuario = db.usuarios.find((item) => item.id_usuario === db.idUsuarioSesion);
    const respuesta = structuredClone(alumno);
    if (!usuario?.roles.includes("PROPIETARIA")) respuesta.historial_cobros = [];
    return HttpResponse.json(respuesta);
  }),

  http.put("*/api/v1/alumnos/:id", async ({ request, params }) => {
    await delay(350);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;
    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const alumno = db.alumnos.find((item) => item.id_alumno === id);
    if (!alumno || !alumnaVisibleParaSesion(alumno))
      return errorApi(404, "NOT_FOUND", "Alumno no encontrado");

    const entrada: unknown = await request.json().catch(() => null);
    const validacion = actualizarAlumnoSchema.safeParse(entrada);
    if (!validacion.success) {
      return errorApi(
        400,
        "VALIDATION_ERROR",
        validacion.error.issues[0]?.message ?? "Los datos no son válidos",
      );
    }

    const sesion = db.usuarios.find((item) => item.id_usuario === db.idUsuarioSesion);
    const permisos = sesion ? permisosDeRoles(sesion.roles) : [];
    const esPropietaria =
      sesion?.roles.includes("PROPIETARIA") === true && permisos.includes("ALUMNOS_EDITAR");
    const esProfesora =
      sesion?.roles.includes("PROFESORA") === true && permisos.includes("ALUMNOS_CONTACTO_EDITAR");
    if (!esPropietaria && !esProfesora)
      return errorApi(403, "FORBIDDEN", "No tiene permisos para editar alumnos");

    const cambios = validacion.data;
    if (!esPropietaria) {
      const camposPersonalesSinPermiso =
        cambios.usuario.nombre !== alumno.usuario.nombre ||
        cambios.usuario.apellido !== alumno.usuario.apellido ||
        cambios.usuario.dni !== alumno.usuario.dni ||
        cambios.usuario.fecha_nacimiento !== alumno.usuario.fecha_nacimiento ||
        JSON.stringify(cambios.tutor) !== JSON.stringify(alumno.tutor) ||
        cambios.apto_medico !== alumno.apto_medico ||
        cambios.fecha_apto_medico !== alumno.fecha_apto_medico ||
        cambios.id_plan !== (alumno.inscripcion?.plan?.id_plan ?? null) ||
        cambios.id_horarios.join(",") !==
          alumno.inscripcion?.horarios.map((horario) => horario.id_horario).join(",");
      if (camposPersonalesSinPermiso) {
        return errorApi(
          403,
          "FORBIDDEN",
          "Solo la propietaria puede modificar datos personales, médicos o del plan",
        );
      }
    }

    const emailEnUso = db.usuarios.some(
      (usuario) =>
        usuario.id_usuario !== alumno.usuario.id_usuario &&
        usuario.email.toLocaleLowerCase("es") === (cambios.usuario.email ?? "").toLocaleLowerCase("es"),
    );
    const dniEnUso = db.alumnos.some(
      (otroAlumno) =>
        otroAlumno.id_alumno !== alumno.id_alumno &&
        cambios.usuario.dni !== null &&
        otroAlumno.usuario.dni === cambios.usuario.dni,
    );
    if (emailEnUso) return errorApi(409, "CONFLICT", "Ya existe una persona registrada con ese email");
    if (dniEnUso) return errorApi(409, "CONFLICT", "Ya existe una persona registrada con ese DNI");

    let idUsuarioResponsable: number | null = null;
    if (cambios.tutor) {
      const tutorRegistrado = db.usuarios.find(
        (usuario) =>
          usuario.roles.includes("TUTOR") &&
          usuario.email.toLocaleLowerCase("es") === cambios.tutor?.email?.toLocaleLowerCase("es"),
      );
      if (!tutorRegistrado) {
        return errorApi(
          400,
          "VALIDATION_ERROR",
          "El tutor debe estar registrado antes de asociarlo al alumno",
        );
      }
      idUsuarioResponsable = tutorRegistrado.id_usuario;
      tutorRegistrado.nombre = cambios.tutor.nombre;
      tutorRegistrado.apellido = cambios.tutor.apellido;
      tutorRegistrado.email = cambios.tutor.email ?? "";
    }

    const cambioPlan = cambios.id_plan !== (alumno.inscripcion?.plan?.id_plan ?? null);
    const horariosActuales = alumno.inscripcion?.horarios.map((horario) => horario.id_horario) ?? [];
    const cambioHorarios = cambios.id_horarios.join(",") !== horariosActuales.join(",");
    if (
      cambios.id_horarios.some(
        (idHorario) => !alumno.horarios_disponibles.some((horario) => horario.id_horario === idHorario),
      )
    ) {
      return errorApi(400, "VALIDATION_ERROR", "Uno de los horarios seleccionados ya no está disponible");
    }
    if ((cambioPlan || cambioHorarios) && !alumno.inscripcion) {
      return errorApi(409, "CONFLICT", "El alumno no tiene una inscripción que se pueda modificar");
    }
    if ((cambioPlan || cambioHorarios) && alumno.inscripcion) {
      const nuevoPlan = alumno.planes_disponibles.find((plan) => plan.id_plan === cambios.id_plan);
      if (cambios.id_plan !== null && !nuevoPlan) {
        return errorApi(400, "VALIDATION_ERROR", "El plan seleccionado ya no está vigente");
      }
      alumno.inscripcion.plan = nuevoPlan ?? null;
      alumno.inscripcion.horarios = alumno.horarios_disponibles.filter((horario) =>
        cambios.id_horarios.includes(horario.id_horario),
      );
    }

    alumno.usuario = {
      ...alumno.usuario,
      ...cambios.usuario,
      dni: cambios.usuario.dni || null,
      telefono: cambios.usuario.telefono || null,
      email: cambios.usuario.email || null,
    };
    const usuarioRegistrado = db.usuarios.find((usuario) => usuario.id_usuario === alumno.usuario.id_usuario);
    if (usuarioRegistrado) {
      usuarioRegistrado.nombre = alumno.usuario.nombre;
      usuarioRegistrado.apellido = alumno.usuario.apellido;
      usuarioRegistrado.email = alumno.usuario.email ?? "";
    }
    alumno.tutor = cambios.tutor;
    alumno.id_usuario_responsable = idUsuarioResponsable;
    alumno.cont_emerg_nombre = cambios.cont_emerg_nombre || null;
    alumno.cont_emerg_telefono = cambios.cont_emerg_telefono || null;
    alumno.apto_medico = cambios.apto_medico;
    alumno.fecha_apto_medico = cambios.fecha_apto_medico;
    alumno.observaciones = cambios.observaciones || null;
    return HttpResponse.json(alumno);
  }),
];
