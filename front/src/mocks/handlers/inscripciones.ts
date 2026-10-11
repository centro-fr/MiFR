import { http, HttpResponse, delay } from "msw";
import { db, siguienteId } from "@/mocks/db";
import { verificarAcceso } from "@/mocks/handlers/respuestas";
import type { CrearInscripcionPayload, Inscripcion } from "@/types/inscripcion";
import type { InscripcionMockRegistro } from "@/mocks/data/semilla";

function mapearInscripcion(ins: InscripcionMockRegistro): Inscripcion {
  const alumno = db.alumnos.find((a) => a.id_alumno === ins.id_alumno);
  const plan = db.planes.find((p) => p.id_plan === ins.id_plan);
  const profesora = db.profesoras.find((pr) => pr.id_profesora === ins.id_profesora);
  const usuarioProf = profesora ? db.usuarios.find((u) => u.id_usuario === profesora.id_usuario) : null;

  return {
    id_inscripcion: ins.id_inscripcion,
    id_alumno: ins.id_alumno,
    id_plan: ins.id_plan,
    id_plan_precio: ins.id_plan * 10,
    id_profesora: ins.id_profesora,
    estado: ins.estado,
    fecha_inscripcion: ins.fecha_inscripcion,
    fecha_inicio: ins.fecha_inicio,
    fecha_fin_estimado: null,
    fecha_baja: null,
    sin_cargo: ins.sin_cargo,
    observaciones: ins.observaciones,
    alumno: alumno
      ? {
          id_alumno: alumno.id_alumno,
          estado: alumno.estado,
          usuario: { nombre: alumno.nombre, apellido: alumno.apellido },
        }
      : undefined,
    plan: plan
      ? {
          id_plan: plan.id_plan,
          nombre: plan.nombre,
          tipo: plan.tipo,
          clases_por_semana: plan.clases_por_semana,
        }
      : undefined,
    profesora: usuarioProf
      ? {
          id_profesora: ins.id_profesora,
          usuario: { nombre: usuarioProf.nombre, apellido: usuarioProf.apellido },
        }
      : undefined,
  };
}

export const inscripcionesHandlers = [
  http.get("*/api/v1/inscripciones", async ({ request }) => {
    await delay(200);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const url = new URL(request.url);
    const idAlumno = url.searchParams.get("id_alumno");
    const estado = url.searchParams.get("estado");

    let lista = db.inscripciones;
    if (idAlumno) lista = lista.filter((i) => i.id_alumno === Number(idAlumno));
    if (estado) lista = lista.filter((i) => i.estado === estado);

    return HttpResponse.json(lista.map(mapearInscripcion));
  }),

  http.post("*/api/v1/inscripciones", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_EDITAR" });
    if (denegado) return denegado;

    const body = (await request.json()) as CrearInscripcionPayload;
    const nuevoId = siguienteId(db.inscripciones.map((i) => i.id_inscripcion));
    const hoy = new Date().toISOString().slice(0, 10);

    const nuevaInscripcion: InscripcionMockRegistro = {
      id_inscripcion: nuevoId,
      id_alumno: body.id_alumno,
      id_plan: body.id_plan,
      id_profesora: body.id_profesora,
      ids_horarios: body.ids_horarios,
      estado: "PREINSCRIPTA",
      fecha_inscripcion: hoy,
      fecha_inicio: body.fecha_inicio ?? hoy,
      sin_cargo: body.sin_cargo ?? false,
      observaciones: body.observaciones ?? null,
    };

    db.inscripciones.unshift(nuevaInscripcion);
    return HttpResponse.json(mapearInscripcion(nuevaInscripcion), { status: 201 });
  }),
];
