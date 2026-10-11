import { http, HttpResponse, delay } from "msw";
import { db, siguienteId } from "@/mocks/db";
import { verificarAcceso } from "@/mocks/handlers/respuestas";
import type { Alumno, CrearAlumnoPayload, PaginaAlumnos } from "@/types/alumno";
import type { AlumnoMockRegistro } from "@/mocks/data/semilla";

function mapearAlumno(reg: AlumnoMockRegistro): Alumno {
  return {
    id_alumno: reg.id_alumno,
    id_usuario: reg.id_usuario,
    id_responsable_menor: reg.id_responsable_menor,
    cont_emerg_nombre: reg.cont_emerg_nombre,
    cont_emerg_telefono: reg.cont_emerg_telefono,
    apto_medico: reg.apto_medico,
    fecha_apto_medico: reg.fecha_apto_medico,
    observaciones: reg.observaciones,
    estado: reg.estado,
    usuario: {
      id_usuario: reg.id_usuario,
      nombre: reg.nombre,
      apellido: reg.apellido,
      dni: reg.dni,
      email: reg.email,
      telefono: reg.telefono,
      fecha_nacimiento: reg.fecha_nacimiento,
      direccion: reg.direccion,
      estado: reg.estado === "ACTIVO" ? "ACTIVO" : "INACTIVO",
    },
    responsable: reg.tutor_nombre
      ? {
          id_usuario: reg.id_responsable_menor ?? 999,
          nombre: reg.tutor_nombre,
          apellido: reg.tutor_apellido ?? "",
          dni: reg.tutor_dni ?? null,
          email: reg.tutor_email ?? null,
          telefono: reg.tutor_telefono ?? null,
          fecha_nacimiento: reg.tutor_fecha_nacimiento ?? "1980-01-01",
          direccion: null,
          estado: "ACTIVO",
        }
      : null,
    plan: (() => {
      const ins = db.inscripciones.find((i) => i.id_alumno === reg.id_alumno && i.estado !== "BAJA");
      const p = ins ? db.planes.find((plan) => plan.id_plan === ins.id_plan) : null;
      return p ? { id_plan: p.id_plan, nombre: p.nombre, tipo: p.tipo } : null;
    })(),
    estado_cuota: reg.estado === "ACTIVO" ? "AL_DIA" : null,
  };
}

export const alumnosHandlers = [
  http.get("*/api/v1/alumnos", async ({ request }) => {
    await delay(250);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const url = new URL(request.url);
    const busqueda = url.searchParams.get("busqueda")?.toLowerCase().trim();
    const estado = url.searchParams.get("estado");
    const incluirBajas = url.searchParams.get("incluirBajas") === "true";
    const limit = Number(url.searchParams.get("limit") || 20);
    const offset = Number(url.searchParams.get("offset") || 0);

    const lista = db.alumnos.filter((a) => {
      if (!incluirBajas && a.estado === "BAJA") return false;
      if (estado && a.estado !== estado) return false;
      if (busqueda) {
        const nombreCompleto = `${a.nombre} ${a.apellido} ${a.tutor_nombre ?? ""} ${a.tutor_apellido ?? ""}`.toLowerCase();
        const dniMatch = a.dni?.includes(busqueda) || a.tutor_dni?.includes(busqueda);
        return nombreCompleto.includes(busqueda) || !!dniMatch;
      }
      return true;
    });

    const total = lista.length;
    const paginados = lista.slice(offset, offset + limit).map(mapearAlumno);

    const respuesta: PaginaAlumnos = {
      datos: paginados,
      total,
      limit,
      offset,
    };

    return HttpResponse.json(respuesta);
  }),

  http.get("*/api/v1/alumnos/:id", async ({ request, params }) => {
    await delay(150);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const id = Number(params.id);
    const alumno = db.alumnos.find((a) => a.id_alumno === id);
    if (!alumno) {
      return HttpResponse.json({ codigo: "ALUMNO_NO_ENCONTRADO", mensaje: "El alumno no existe" }, { status: 404 });
    }

    return HttpResponse.json(mapearAlumno(alumno));
  }),

  http.post("*/api/v1/alumnos", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_EDITAR" });
    if (denegado) return denegado;

    const body = (await request.json()) as CrearAlumnoPayload;

    // Verificar unicidad de DNI si viene informado
    if (body.dni) {
      const existeDni = db.alumnos.some((a) => a.dni === body.dni && a.estado !== "BAJA");
      if (existeDni) {
        return HttpResponse.json(
          {
            codigo: "ALUMNO_EXISTENTE",
            mensaje: `Ya existe un alumno registrado con el DNI ${body.dni}`,
          },
          { status: 409 },
        );
      }
    }

    const nuevoIdAlumno = siguienteId(db.alumnos.map((a) => a.id_alumno));
    const nuevoIdUsuario = siguienteId(db.usuarios.map((u) => u.id_usuario));

    let idResponsable: number | null = null;
    let tutorNombre: string | undefined;
    let tutorApellido: string | undefined;
    let tutorDni: string | undefined;
    let tutorEmail: string | undefined;
    let tutorTelefono: string | undefined;
    let tutorFechaNacimiento: string | undefined;

    if (body.tutor && "nombre" in body.tutor) {
      // Reutilizar tutor existente si coincide DNI o email (caso hermanos)
      const tutorExistente = db.alumnos.find(
        (a) =>
          (body.tutor && "dni" in body.tutor && body.tutor.dni && a.tutor_dni === body.tutor.dni) ||
          (body.tutor && "email" in body.tutor && body.tutor.email && a.tutor_email === body.tutor.email),
      );

      if (tutorExistente?.id_responsable_menor) {
        idResponsable = tutorExistente.id_responsable_menor;
        tutorNombre = tutorExistente.tutor_nombre;
        tutorApellido = tutorExistente.tutor_apellido;
        tutorDni = tutorExistente.tutor_dni;
        tutorEmail = tutorExistente.tutor_email;
        tutorTelefono = tutorExistente.tutor_telefono;
        tutorFechaNacimiento = tutorExistente.tutor_fecha_nacimiento;
      } else {
        idResponsable = siguienteId([...db.usuarios.map((u) => u.id_usuario), nuevoIdUsuario]);
        tutorNombre = body.tutor.nombre;
        tutorApellido = body.tutor.apellido;
        tutorDni = body.tutor.dni;
        tutorEmail = body.tutor.email;
        tutorTelefono = body.tutor.telefono;
        tutorFechaNacimiento = body.tutor.fecha_nacimiento;
      }
    }

    const nuevoRegistro: AlumnoMockRegistro = {
      id_alumno: nuevoIdAlumno,
      id_usuario: nuevoIdUsuario,
      id_responsable_menor: idResponsable,
      nombre: body.nombre,
      apellido: body.apellido,
      dni: body.dni ?? null,
      email: body.email ?? null,
      telefono: body.telefono ?? null,
      fecha_nacimiento: body.fecha_nacimiento,
      direccion: body.direccion ?? null,
      cont_emerg_nombre: body.cont_emerg_nombre ?? null,
      cont_emerg_telefono: body.cont_emerg_telefono ?? null,
      apto_medico: body.apto_medico ?? false,
      fecha_apto_medico: body.fecha_apto_medico ?? null,
      observaciones: body.observaciones ?? null,
      estado: "INACTIVO", // Los preinscriptos quedan INACTIVO hasta su primer pago
      tutor_nombre: tutorNombre,
      tutor_apellido: tutorApellido,
      tutor_dni: tutorDni,
      tutor_email: tutorEmail,
      tutor_telefono: tutorTelefono,
      tutor_fecha_nacimiento: tutorFechaNacimiento,
    };

    db.alumnos.unshift(nuevoRegistro);
    return HttpResponse.json(mapearAlumno(nuevoRegistro), { status: 201 });
  }),
];
