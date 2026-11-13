import { http, HttpResponse, delay } from "msw";
import { db } from "@/mocks/db";
import { errorApi, idDeRuta, idInvalido, verificarAcceso } from "@/mocks/handlers/respuestas";
import { profesoraConNombre } from "@/mocks/handlers/serializar";
import type { RoleCode } from "@/types/auth";

// Mock de profesoras y usuarios (US-38)

export const personasHandlers = [
  http.get("*/api/v1/profesoras", async ({ request }) => {
    await delay(200);
    const denegado = verificarAcceso(request, { permiso: "HORARIOS_VER" });
    if (denegado) return denegado;

    const url = new URL(request.url);
    const incluirBajas =
      url.searchParams.get("incluirBajas") === "true" ||
      url.searchParams.get("incluir_bajas") === "true";

    const lista = incluirBajas
      ? db.profesoras
      : db.profesoras.filter((p) => p.fecha_baja === null);

    return HttpResponse.json(lista.map(profesoraConNombre));
  }),

  http.post("*/api/v1/profesoras", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "HORARIOS_EDITAR" });
    if (denegado) return denegado;

    const cuerpo = (await request.json().catch(() => ({}))) as { id_usuario?: number; especialidad?: string };
    if (!cuerpo.id_usuario || typeof cuerpo.id_usuario !== "number") {
      return errorApi(400, "VALIDATION_ERROR", "Usuario inválido");
    }

    const usuario = db.usuarios.find((u) => u.id_usuario === cuerpo.id_usuario);
    if (!usuario) {
      return errorApi(404, "NOT_FOUND", "Usuario no encontrado");
    }
    if (usuario.estado === "INACTIVO") {
      return errorApi(400, "VALIDATION_ERROR", "No se puede crear una profesora para un usuario inactivo");
    }
    if (!usuario.roles.includes("PROFESORA")) {
      return errorApi(400, "VALIDATION_ERROR", "El usuario debe tener asignado el rol PROFESORA");
    }

    const perfilExistente = db.profesoras.find((p) => p.id_usuario === cuerpo.id_usuario);
    if (perfilExistente) {
      return errorApi(409, "CONFLICT", "El usuario ya tiene un perfil de profesora");
    }

    const nuevoId = Math.max(0, ...db.profesoras.map((p) => p.id_profesora)) + 1;
    const nueva = {
      id_profesora: nuevoId,
      id_usuario: cuerpo.id_usuario,
      especialidad: cuerpo.especialidad?.trim() || null,
      fecha_alta: new Date().toISOString(),
      fecha_baja: null,
    };

    db.profesoras.push(nueva);
    return HttpResponse.json(profesoraConNombre(nueva), { status: 201 });
  }),

  http.delete("*/api/v1/profesoras/:id", async ({ request, params }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "HORARIOS_EDITAR" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const profesora = db.profesoras.find((p) => p.id_profesora === id);
    if (!profesora) {
      return errorApi(404, "NOT_FOUND", "Profesora no encontrada");
    }
    if (profesora.fecha_baja !== null) {
      return errorApi(409, "CONFLICT", "La profesora ya está dada de baja");
    }

    const tieneHorariosActivos = db.horarios.some(
      (h) => h.id_profesora === id && h.fecha_baja === null,
    );
    if (tieneHorariosActivos) {
      return errorApi(409, "CONFLICT", "Debe dar de baja los horarios activos antes que a la profesora");
    }

    profesora.fecha_baja = new Date().toISOString();
    return HttpResponse.json(profesoraConNombre(profesora));
  }),

  http.patch("*/api/v1/profesoras/:id", async ({ request, params }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "HORARIOS_EDITAR" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const profesora = db.profesoras.find((p) => p.id_profesora === id);
    if (!profesora) {
      return errorApi(404, "NOT_FOUND", "Profesora no encontrada");
    }

    const cuerpo = (await request.json().catch(() => ({}))) as {
      especialidad?: string | null;
      reactivar?: boolean;
    };

    if (cuerpo.reactivar) {
      if (profesora.fecha_baja === null) {
        return errorApi(409, "CONFLICT", "La profesora no está dada de baja");
      }
      profesora.fecha_baja = null;
    }

    if (cuerpo.especialidad !== undefined) {
      profesora.especialidad = cuerpo.especialidad?.trim() || null;
    }

    return HttpResponse.json(profesoraConNombre(profesora));
  }),

  http.get("*/api/v1/usuarios", async ({ request }) => {
    await delay(200);
    const denegado = verificarAcceso(request, { permiso: "USUARIOS_VER" });
    if (denegado) return denegado;

    return HttpResponse.json(
      db.usuarios.map((u) => ({
        id_usuario: u.id_usuario,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        estado: u.estado ?? "ACTIVO",
        roles: u.roles,
      })),
    );
  }),

  http.get("*/api/v1/usuarios/:id", async ({ request, params }) => {
    await delay(150);
    const denegado = verificarAcceso(request, { permiso: "USUARIOS_VER" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const usuario = db.usuarios.find((u) => u.id_usuario === id);
    if (!usuario) return errorApi(404, "NOT_FOUND", "Usuario no encontrado");

    return HttpResponse.json({
      id_usuario: usuario.id_usuario,
      google_id: null,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      dni: usuario.dni ?? null,
      telefono: usuario.telefono ?? null,
      fecha_nacimiento: usuario.fecha_nacimiento ?? "1990-01-01",
      direccion: usuario.direccion ?? null,
      estado: usuario.estado ?? "ACTIVO",
      fecha_alta: "2026-01-01T00:00:00.000Z",
      fecha_actualizacion: "2026-01-01T00:00:00.000Z",
      roles: usuario.roles,
    });
  }),

  http.patch("*/api/v1/usuarios/:id", async ({ request, params }) => {
    await delay(250);
    const denegado = verificarAcceso(request, { permiso: "USUARIOS_EDITAR" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const usuario = db.usuarios.find((u) => u.id_usuario === id);
    if (!usuario) return errorApi(404, "NOT_FOUND", "Usuario no encontrado");

    const cuerpo = (await request.json().catch(() => ({}))) as {
      nombre?: string;
      apellido?: string;
      dni?: string | null;
      telefono?: string | null;
      fecha_nacimiento?: string;
      direccion?: string | null;
      estado?: "ACTIVO" | "INACTIVO";
    };

    if (cuerpo.nombre !== undefined) usuario.nombre = cuerpo.nombre.trim();
    if (cuerpo.apellido !== undefined) usuario.apellido = cuerpo.apellido.trim();
    if (cuerpo.dni !== undefined) usuario.dni = cuerpo.dni ? cuerpo.dni.trim() : null;
    if (cuerpo.telefono !== undefined) usuario.telefono = cuerpo.telefono ? cuerpo.telefono.trim() : null;
    if (cuerpo.fecha_nacimiento !== undefined) usuario.fecha_nacimiento = cuerpo.fecha_nacimiento;
    if (cuerpo.direccion !== undefined) usuario.direccion = cuerpo.direccion ? cuerpo.direccion.trim() : null;
    if (cuerpo.estado !== undefined) usuario.estado = cuerpo.estado;

    return HttpResponse.json({
      id_usuario: usuario.id_usuario,
      google_id: null,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      dni: usuario.dni ?? null,
      telefono: usuario.telefono ?? null,
      fecha_nacimiento: usuario.fecha_nacimiento ?? "1990-01-01",
      direccion: usuario.direccion ?? null,
      estado: usuario.estado ?? "ACTIVO",
      fecha_alta: "2026-01-01T00:00:00.000Z",
      fecha_actualizacion: new Date().toISOString(),
      roles: usuario.roles,
    });
  }),

  http.post("*/api/v1/usuarios", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "USUARIOS_EDITAR" });
    if (denegado) return denegado;

    const cuerpo = (await request.json().catch(() => ({}))) as {
      nombre?: string;
      apellido?: string;
      email?: string;
      telefono?: string;
      fecha_nacimiento?: string;
    };

    if (!cuerpo.nombre || !cuerpo.apellido || !cuerpo.email) {
      return errorApi(400, "VALIDATION_ERROR", "Nombre, apellido y email son requeridos");
    }

    const emailExistente = db.usuarios.find((u) => u.email.toLowerCase() === cuerpo.email?.toLowerCase());
    if (emailExistente) {
      return errorApi(409, "CONFLICT", "Ya existe un usuario registrado con ese email");
    }

    const nuevoId = Math.max(0, ...db.usuarios.map((u) => u.id_usuario)) + 1;
    const nuevoUsuario = {
      id_usuario: nuevoId,
      nombre: cuerpo.nombre.trim(),
      apellido: cuerpo.apellido.trim(),
      email: cuerpo.email.trim().toLowerCase(),
      telefono: cuerpo.telefono?.trim() || null,
      fecha_nacimiento: cuerpo.fecha_nacimiento || "1995-01-01",
      estado: "ACTIVO" as const,
      roles: [],
    };

    db.usuarios.push(nuevoUsuario);
    return HttpResponse.json(nuevoUsuario, { status: 201 });
  }),

  http.post("*/api/v1/usuarios/:id/roles", async ({ request, params }) => {
    await delay(200);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "USUARIOS_EDITAR" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (!id) return idInvalido();

    const usuario = db.usuarios.find((u) => u.id_usuario === id);
    if (!usuario) return errorApi(404, "NOT_FOUND", "Usuario no encontrado");

    const cuerpo = (await request.json().catch(() => ({}))) as { rol?: string };
    if (!cuerpo.rol) return errorApi(400, "VALIDATION_ERROR", "Rol inválido");
    const rolesValidos: RoleCode[] = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"];
    if (!rolesValidos.includes(cuerpo.rol as RoleCode)) {
      return errorApi(400, "VALIDATION_ERROR", "Rol inválido");
    }

    const rol = cuerpo.rol as RoleCode;
    if (!usuario.roles.includes(rol)) {
      usuario.roles.push(rol);
    }

    return HttpResponse.json({ id_usuario: id, rol }, { status: 201 });
  }),
];
