import { http, HttpResponse, delay } from "msw";
import type { MatrizPermisos } from "@/types/permissions";
import type { RoleCode } from "@/types/auth";

// Mock alineado al contrato real del back (módulo rol):
// GET /seguridad/matriz (Bearer + PROPIETARIA) → { roles, modulos, matriz }
// PUT /seguridad/matriz ← { cambios: [{ rol, permiso, otorgado }] } → { mensaje }
// Errores: { error: { code, message } }.
// Catálogo, críticos y exclusivos copiados de back/src/.../rol/rol.catalogo.ts.

interface CatalogEntry {
  codigo: string;
  modulo: string;
  descripcion: string;
}

const CATALOGO: CatalogEntry[] = [
  { codigo: "SEGURIDAD_MATRIZ_VER", modulo: "SEGURIDAD", descripcion: "Ver la matriz de permisos por rol" },
  { codigo: "SEGURIDAD_MATRIZ_EDITAR", modulo: "SEGURIDAD", descripcion: "Modificar la matriz de permisos por rol" },
  { codigo: "USUARIOS_VER", modulo: "USUARIOS", descripcion: "Ver el listado de usuarios" },
  { codigo: "USUARIOS_EDITAR", modulo: "USUARIOS", descripcion: "Dar de alta, modificar y dar de baja usuarios y sus roles" },
  { codigo: "ACTIVIDADES_VER", modulo: "ACTIVIDADES", descripcion: "Ver las actividades y sus cupos" },
  { codigo: "ACTIVIDADES_EDITAR", modulo: "ACTIVIDADES", descripcion: "Dar de alta, modificar y dar de baja actividades" },
  { codigo: "HORARIOS_VER", modulo: "HORARIOS", descripcion: "Ver los horarios de las actividades" },
  { codigo: "HORARIOS_EDITAR", modulo: "HORARIOS", descripcion: "Asignar profesoras y horarios a las actividades" },
  { codigo: "ALUMNOS_VER", modulo: "ALUMNOS", descripcion: "Ver los alumnos y sus inscripciones" },
  { codigo: "ALUMNOS_EDITAR", modulo: "ALUMNOS", descripcion: "Inscribir, modificar y dar de baja alumnos" },
  { codigo: "PLANES_VER", modulo: "PLANES", descripcion: "Ver los planes y sus precios" },
  { codigo: "PLANES_EDITAR", modulo: "PLANES", descripcion: "Crear y modificar planes y precios" },
  { codigo: "PAGOS_CONFIRMAR", modulo: "PAGOS", descripcion: "Confirmar o rechazar pagos" },
  { codigo: "PAGOS_RENDICION_VER", modulo: "PAGOS", descripcion: "Ver la rendición de efectivo" },
  { codigo: "HONORARIOS_VER_TODOS", modulo: "HONORARIOS", descripcion: "Ver las liquidaciones de todas las profesoras" },
  { codigo: "HONORARIOS_VER_PROPIOS", modulo: "HONORARIOS", descripcion: "Ver únicamente los honorarios propios" },
  { codigo: "HONORARIOS_LIQUIDAR", modulo: "HONORARIOS", descripcion: "Generar y cerrar liquidaciones" },
  { codigo: "ASISTENCIAS_MARCAR", modulo: "ASISTENCIAS", descripcion: "Tomar asistencia en las clases" },
  { codigo: "RUTINAS_VER", modulo: "RUTINAS", descripcion: "Ver las rutinas y el progreso de los alumnos" },
  { codigo: "RUTINAS_EDITAR", modulo: "RUTINAS", descripcion: "Crear y modificar rutinas de alumnos" },
  { codigo: "REPORTES_COBRANZA_VER", modulo: "REPORTES", descripcion: "Ver los reportes de cobranza" },
];

const EXCLUSIVOS_PROPIETARIA = new Set([
  "SEGURIDAD_MATRIZ_VER",
  "SEGURIDAD_MATRIZ_EDITAR",
  "PAGOS_CONFIRMAR",
  "PAGOS_RENDICION_VER",
  "HONORARIOS_VER_TODOS",
  "HONORARIOS_LIQUIDAR",
  "REPORTES_COBRANZA_VER",
]);

const CRITICOS = new Set([...EXCLUSIVOS_PROPIETARIA, "USUARIOS_VER", "USUARIOS_EDITAR"]);

const ROLES: { id_rol: number; codigo: RoleCode; nombre: string }[] = [
  { id_rol: 1, codigo: "PROPIETARIA", nombre: "Propietaria" },
  { id_rol: 2, codigo: "PROFESORA", nombre: "Profesora" },
  { id_rol: 3, codigo: "ALUMNO", nombre: "Alumno" },
  { id_rol: 4, codigo: "TUTOR", nombre: "Tutor" },
];

function matrizInicial(): Record<RoleCode, string[]> {
  const todos = CATALOGO.map((p) => p.codigo);
  return {
    PROPIETARIA: [...todos],
    PROFESORA: [
      "HORARIOS_VER",
      "ALUMNOS_VER",
      "ASISTENCIAS_MARCAR",
      "RUTINAS_VER",
      "RUTINAS_EDITAR",
      "HONORARIOS_VER_PROPIOS",
    ],
    ALUMNO: ["RUTINAS_VER"],
    TUTOR: ["RUTINAS_VER", "ALUMNOS_VER"],
  };
}

let matriz: Record<RoleCode, string[]> = matrizInicial();

export function resetMatrizMock(): void {
  matriz = matrizInicial();
}

function payload(): MatrizPermisos {
  const modulos = new Map<string, { id_permiso: number; codigo: string; descripcion: string; critico: boolean }[]>();
  CATALOGO.forEach((permiso, index) => {
    const lista = modulos.get(permiso.modulo) ?? [];
    lista.push({
      id_permiso: index + 1,
      codigo: permiso.codigo,
      descripcion: permiso.descripcion,
      critico: CRITICOS.has(permiso.codigo),
    });
    modulos.set(permiso.modulo, lista);
  });
  return {
    roles: ROLES,
    modulos: [...modulos].map(([modulo, permisos]) => ({ modulo, permisos })),
    matriz: { ...matriz },
  };
}

const CODIGOS_ROL = new Set(ROLES.map((r) => r.codigo));
const CODIGOS_PERMISO = new Set(CATALOGO.map((p) => p.codigo));

export const seguridadHandlers = [
  http.get("*/seguridad/matriz", async ({ request }) => {
    await delay(600);
    const auth = request.headers.get("authorization");
    if (auth === "Bearer mock-jwt-sin-permiso") {
      return HttpResponse.json(
        { error: { code: "FORBIDDEN", message: "No tiene permisos para esta acción" } },
        { status: 403 },
      );
    }
    if (auth !== "Bearer mock-jwt-token") {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Token no provisto" } },
        { status: 401 },
      );
    }
    return HttpResponse.json(payload(), { status: 200 });
  }),

  http.put("*/seguridad/matriz", async ({ request }) => {
    await delay(700);
    const auth = request.headers.get("authorization");
    if (auth !== "Bearer mock-jwt-token") {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Token no provisto" } },
        { status: 401 },
      );
    }
    const body = (await request.json()) as {
      cambios?: { rol: string; permiso: string; otorgado: boolean }[];
    };
    if (!body.cambios || body.cambios.length === 0) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Debe enviar al menos un cambio" } },
        { status: 400 },
      );
    }
    for (const { rol, permiso, otorgado } of body.cambios) {
      if (!CODIGOS_ROL.has(rol as RoleCode) || !CODIGOS_PERMISO.has(permiso)) {
        return HttpResponse.json(
          { error: { code: "NOT_FOUND", message: `Rol o permiso inexistente: ${rol}/${permiso}` } },
          { status: 404 },
        );
      }
      if (rol === "PROPIETARIA" && !otorgado && CRITICOS.has(permiso)) {
        return HttpResponse.json(
          {
            error: {
              code: "PERMISO_CRITICO_INMUTABLE",
              message: `El permiso ${permiso} es crítico y no se le puede quitar a la propietaria`,
            },
          },
          { status: 400 },
        );
      }
      if (rol !== "PROPIETARIA" && otorgado && EXCLUSIVOS_PROPIETARIA.has(permiso)) {
        return HttpResponse.json(
          {
            error: {
              code: "PERMISO_EXCLUSIVO_PROPIETARIA",
              message: `El permiso ${permiso} es exclusivo de la propietaria y no se puede otorgar a otro rol`,
            },
          },
          { status: 400 },
        );
      }
    }
    for (const { rol, permiso, otorgado } of body.cambios) {
      const lista = new Set(matriz[rol as RoleCode]);
      if (otorgado) lista.add(permiso);
      else lista.delete(permiso);
      matriz[rol as RoleCode] = [...lista];
    }
    return HttpResponse.json({ mensaje: "Matriz de permisos actualizada exitosamente" }, { status: 200 });
  }),
];
