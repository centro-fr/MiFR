import { http, HttpResponse, delay } from "msw";
import type { RoleCode } from "@/types/auth";
import type { MatrizPermisos } from "@/types/permissions";
import { db } from "@/mocks/db";
import {
  CATALOGO_PERMISOS,
  PERMISOS_CRITICOS,
  PERMISOS_EXCLUSIVOS_PROPIETARIA,
  ROLES,
} from "@/mocks/data/catalogo-permisos";
import { errorApi, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock del módulo rol del back:
// GET /seguridad/matriz (PROPIETARIA + SEGURIDAD_MATRIZ_VER) → { roles, modulos, matriz }
// PUT /seguridad/matriz (PROPIETARIA + SEGURIDAD_MATRIZ_EDITAR) ← { cambios } → { mensaje }

function matrizActual(): MatrizPermisos {
  const modulos = new Map<string, MatrizPermisos["modulos"][number]["permisos"]>();
  CATALOGO_PERMISOS.forEach((permiso, indice) => {
    const delModulo = modulos.get(permiso.modulo) ?? [];
    delModulo.push({
      id_permiso: indice + 1,
      codigo: permiso.codigo,
      descripcion: permiso.descripcion,
      critico: PERMISOS_CRITICOS.has(permiso.codigo),
    });
    modulos.set(permiso.modulo, delModulo);
  });
  return {
    roles: ROLES.map(({ id_rol, codigo, nombre }) => ({ id_rol, codigo, nombre })),
    modulos: [...modulos].map(([modulo, permisos]) => ({ modulo, permisos })),
    matriz: structuredClone(db.matriz),
  };
}

interface CambioPedido {
  rol: string;
  permiso: string;
  otorgado: boolean;
}

function validarCambio({ rol, permiso, otorgado }: CambioPedido) {
  if (!ROLES.some((r) => r.codigo === rol)) return errorApi(404, "NOT_FOUND", `El rol ${rol} no está cargado`);
  if (!CATALOGO_PERMISOS.some((p) => p.codigo === permiso)) {
    return errorApi(404, "NOT_FOUND", `El permiso ${permiso} no existe`);
  }
  if (rol === "PROPIETARIA" && !otorgado && PERMISOS_CRITICOS.has(permiso)) {
    return errorApi(
      400,
      "PERMISO_CRITICO_INMUTABLE",
      `El permiso ${permiso} es crítico y no se le puede quitar a la propietaria`,
    );
  }
  if (rol !== "PROPIETARIA" && otorgado && PERMISOS_EXCLUSIVOS_PROPIETARIA.has(permiso)) {
    return errorApi(
      400,
      "PERMISO_EXCLUSIVO_PROPIETARIA",
      `El permiso ${permiso} es exclusivo de la propietaria y no se puede otorgar a otro rol`,
    );
  }
  return null;
}

export const seguridadHandlers = [
  http.get("*/api/v1/seguridad/matriz", async ({ request }) => {
    await delay(600);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "SEGURIDAD_MATRIZ_VER" });
    if (denegado) return denegado;
    return HttpResponse.json(matrizActual());
  }),

  http.put("*/api/v1/seguridad/matriz", async ({ request }) => {
    await delay(700);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "SEGURIDAD_MATRIZ_EDITAR" });
    if (denegado) return denegado;

    const { cambios } = (await request.json()) as { cambios?: CambioPedido[] };
    if (!cambios || cambios.length === 0) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    for (const cambio of cambios) {
      const error = validarCambio(cambio);
      if (error) return error;
    }

    for (const { rol, permiso, otorgado } of cambios) {
      const otorgados = new Set(db.matriz[rol as RoleCode]);
      if (otorgado) otorgados.add(permiso);
      else otorgados.delete(permiso);
      db.matriz[rol as RoleCode] = [...otorgados];
    }
    return HttpResponse.json({ mensaje: "Matriz de permisos actualizada exitosamente" });
  }),
];
