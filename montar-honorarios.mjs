#!/usr/bin/env node
// Monta el subsistema GestionHonorarios en el resto del back: app.ts, composicion.ts, openapi.ts,
// auditoria.ts, el test de OpenAPI y los tests de rutas que arman la app con "fakes".
//
// Uso, desde la raíz del repo (la carpeta que tiene back/):
//   node montar-honorarios.mjs            aplica los cambios
//   node montar-honorarios.mjs --probar   solo informa qué cambiaría, sin escribir nada
//
// Es seguro correrlo más de una vez: lo que ya está hecho se salta. Respeta los saltos de línea
// (LF o CRLF) de cada archivo. Si una ancla no aparece, lo dice y no toca ese archivo.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const argumentos = process.argv.slice(2);
const soloProbar = argumentos.includes("--probar");
const raiz = argumentos.find((argumento) => !argumento.startsWith("--")) ?? join("back", "src");

const resultados = [];
let huboFallas = false;

function registrar(estado, archivo, detalle) {
  resultados.push({ estado, archivo: relative(process.cwd(), archivo), detalle });
  if (estado === "FALLA") huboFallas = true;
}

function sangria(linea) {
  return linea.match(/^\s*/)[0];
}

function indiceDe(lineas, texto) {
  return lineas.findIndex((linea) => linea.includes(texto));
}

// Cada paso: { nombre, yaEsta(texto), aplicar(lineas) -> lineas o null si falta la ancla }; noCorresponde
// (opcional) lo salta sin informar cuando el archivo no necesita ese paso.
function editar(archivo, pasos) {
  const original = readFileSync(archivo, "utf8");
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  let lineas = original.split(/\r?\n/);
  let cambio = false;

  for (const paso of pasos) {
    if (paso.noCorresponde?.(lineas.join("\n"))) continue;
    if (paso.yaEsta(lineas.join("\n"))) {
      registrar("YA ESTABA", archivo, paso.nombre);
      continue;
    }
    const nuevas = paso.aplicar(lineas);
    if (!nuevas) {
      registrar("FALLA", archivo, `${paso.nombre}: no encontré el lugar donde insertarlo`);
      continue;
    }
    lineas = nuevas;
    cambio = true;
    registrar(soloProbar ? "CAMBIARÍA" : "APLICADO", archivo, paso.nombre);
  }

  if (cambio && !soloProbar) writeFileSync(archivo, lineas.join(eol), "utf8");
}

function insertarDespues(lineas, ancla, nuevas) {
  const indice = indiceDe(lineas, ancla);
  if (indice === -1) return null;
  return [...lineas.slice(0, indice + 1), ...nuevas, ...lineas.slice(indice + 1)];
}

function insertarAntes(lineas, ancla, nuevas) {
  const indice = indiceDe(lineas, ancla);
  if (indice === -1) return null;
  return [...lineas.slice(0, indice), ...nuevas, ...lineas.slice(indice)];
}

// ---------------------------------------------------------------------------------------------
// app.ts
editar(join(raiz, "app.ts"), [
  {
    nombre: "importar las rutas y la interfaz de honorarios",
    yaEsta: (texto) => texto.includes("gestion-honorarios/gestion-honorarios.routes.js"),
    aplicar: (lineas) =>
      insertarDespues(lineas, "createGestionServicioEntrenamientoRoutes } from", [
        'import type { ILogicaHonorarios } from "./modules/gestion-honorarios/interface/i-logica-honorarios.js";',
        'import { createGestionHonorariosRoutes } from "./modules/gestion-honorarios/gestion-honorarios.routes.js";',
      ]),
  },
  {
    nombre: "sumar gestionHonorarios a AppDependencies",
    yaEsta: (texto) => /gestionHonorarios:\s*ILogicaHonorarios/.test(texto),
    aplicar: (lineas) => {
      const indice = lineas.findIndex((linea) => /^\s*reportes:\s*ILogicaInformes;/.test(linea));
      if (indice === -1) return null;
      return [
        ...lineas.slice(0, indice + 1),
        `${sangria(lineas[indice])}gestionHonorarios: ILogicaHonorarios;`,
        ...lineas.slice(indice + 1),
      ];
    },
  },
  {
    nombre: "montar las rutas de honorarios",
    yaEsta: (texto) => texto.includes("createGestionHonorariosRoutes(deps."),
    aplicar: (lineas) => {
      const indice = indiceDe(lineas, "createReportesRoutes(deps.reportes");
      if (indice === -1) return null;
      return [
        ...lineas.slice(0, indice + 1),
        `${sangria(lineas[indice])}api.use(createGestionHonorariosRoutes(deps.gestionHonorarios, acceso));`,
        ...lineas.slice(indice + 1),
      ];
    },
  },
]);

// ---------------------------------------------------------------------------------------------
// composicion.ts
editar(join(raiz, "composicion.ts"), [
  {
    nombre: "importar los servicios y el repositorio de honorarios",
    yaEsta: (texto) => texto.includes("gestion-honorarios/gestion-honorarios.service.js"),
    aplicar: (lineas) =>
      insertarDespues(lineas, "GestionServicioEntrenamientoService } from", [
        'import { GestionHonorariosService } from "./modules/gestion-honorarios/gestion-honorarios.service.js";',
        'import { TarifaHonorarioRepository } from "./modules/gestion-honorarios/tarifa-honorario/tarifa-honorario.repository.js";',
        'import { TarifaHonorarioService } from "./modules/gestion-honorarios/tarifa-honorario/tarifa-honorario.service.js";',
      ]),
  },
  {
    nombre: "construir GestionHonorariosService",
    yaEsta: (texto) => texto.includes("new TarifaHonorarioService("),
    aplicar: (lineas) => {
      const indiceDependencias = indiceDe(lineas, "dependencias: {");
      if (indiceDependencias === -1) return null;
      let indiceReturn = indiceDependencias - 1;
      while (indiceReturn >= 0 && lineas[indiceReturn].trim() === "") indiceReturn -= 1;
      if (indiceReturn < 0 || !/^\s*return\s*\{\s*$/.test(lineas[indiceReturn])) return null;
      const base = sangria(lineas[indiceReturn]);
      return [
        ...lineas.slice(0, indiceReturn),
        `${base}const gestionHonorarios = new GestionHonorariosService(`,
        `${base}  new TarifaHonorarioService(new TarifaHonorarioRepository(prisma), profesorService, planService),`,
        `${base});`,
        "",
        ...lineas.slice(indiceReturn),
      ];
    },
  },
  {
    nombre: "entregar gestionHonorarios en las dependencias",
    yaEsta: (texto) => /^\s*gestionHonorarios,\s*$/m.test(texto),
    aplicar: (lineas) => {
      const indice = indiceDe(lineas, "difusionPublica: new DifusionPublicaService(");
      if (indice === -1) return null;
      return [
        ...lineas.slice(0, indice),
        `${sangria(lineas[indice])}gestionHonorarios,`,
        ...lineas.slice(indice),
      ];
    },
  },
]);

// ---------------------------------------------------------------------------------------------
// openapi.ts
editar(join(raiz, "openapi.ts"), [
  {
    nombre: "importar la documentación de honorarios",
    yaEsta: (texto) => texto.includes("gestion-honorarios/gestion-honorarios.openapi.js"),
    aplicar: (lineas) =>
      insertarDespues(lineas, "registrarDocumentacionGestionServicioEntrenamiento } from", [
        'import { registrarDocumentacionGestionHonorarios } from "./modules/gestion-honorarios/gestion-honorarios.openapi.js";',
      ]),
  },
  {
    nombre: "registrar la documentación de honorarios",
    yaEsta: (texto) => texto.includes("registrarDocumentacionGestionHonorarios(registro)"),
    aplicar: (lineas) => {
      const indice = indiceDe(lineas, "registrarDocumentacionReportes(registro);");
      if (indice === -1) return null;
      return [
        ...lineas.slice(0, indice + 1),
        `${sangria(lineas[indice])}registrarDocumentacionGestionHonorarios(registro);`,
        ...lineas.slice(indice + 1),
      ];
    },
  },
]);

// ---------------------------------------------------------------------------------------------
// El test de OpenAPI lista todas las operaciones que debe documentar la API.
editar(join(raiz, "__tests__", "openapi.test.ts"), [
  {
    nombre: "sumar las operaciones de tarifas a la lista esperada",
    yaEsta: (texto) => texto.includes("/tarifas-honorario"),
    aplicar: (lineas) => {
      const indice = indiceDe(lineas, '"delete /suplencias/{idClase}",');
      if (indice === -1) return null;
      const margen = sangria(lineas[indice]);
      return [
        ...lineas.slice(0, indice + 1),
        `${margen}"get /tarifas-honorario",`,
        `${margen}"post /tarifas-honorario",`,
        `${margen}"post /tarifas-honorario/{id}/cerrar",`,
        ...lineas.slice(indice + 1),
      ];
    },
  },
]);

// ---------------------------------------------------------------------------------------------
// auditoria.ts: los dos eventos nuevos de tarifas.
editar(join(raiz, "shared", "utils", "auditoria.ts"), [
  {
    nombre: "sumar TARIFA_HONORARIO_REGISTRADA y TARIFA_HONORARIO_CERRADA",
    yaEsta: (texto) => texto.includes("TARIFA_HONORARIO_REGISTRADA"),
    aplicar: (lineas) => {
      const indice = lineas.findIndex((linea) => /\|\s*"SUPLENCIA_ELIMINADA";/.test(linea));
      if (indice === -1) return null;
      const margen = sangria(lineas[indice]);
      return [
        ...lineas.slice(0, indice),
        lineas[indice].replace('"SUPLENCIA_ELIMINADA";', '"SUPLENCIA_ELIMINADA"'),
        `${margen}| "TARIFA_HONORARIO_REGISTRADA"`,
        `${margen}| "TARIFA_HONORARIO_CERRADA";`,
        ...lineas.slice(indice + 1),
      ];
    },
  },
]);

// ---------------------------------------------------------------------------------------------
// Los tests de rutas que arman la app completa con un "fake" por subsistema.
function archivosDeTest(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return nombre === "node_modules" ? [] : archivosDeTest(ruta);
    return ruta.endsWith(".test.ts") ? [ruta] : [];
  });
}

for (const archivo of archivosDeTest(raiz)) {
  const texto = readFileSync(archivo, "utf8");
  if (!texto.includes("reportes: logicaInformesNoConfigurada")) continue;

  editar(archivo, [
    {
      nombre: "importar el fake de honorarios",
      yaEsta: (contenido) => contenido.includes("logicaHonorariosNoConfigurada }"),
      aplicar: (lineas) => {
        const indice = lineas.findIndex((linea) =>
          /import \{ logicaInformesNoConfigurada \} from ".*logica-informes-no-configurada\.js";/.test(linea),
        );
        if (indice === -1) return null;
        const importHonorarios = lineas[indice]
          .replace("logicaInformesNoConfigurada", "logicaHonorariosNoConfigurada")
          .replace("logica-informes-no-configurada.js", "logica-honorarios-no-configurada.js");
        return [...lineas.slice(0, indice + 1), importHonorarios, ...lineas.slice(indice + 1)];
      },
    },
    {
      nombre: "pasar gestionHonorarios a la app",
      yaEsta: (contenido) => contenido.includes("gestionHonorarios:"),
      aplicar: (lineas) => {
        const indice = lineas.findIndex((linea) => /^\s*reportes:\s*logicaInformesNoConfigurada,\s*$/.test(linea));
        if (indice === -1) return null;
        return [
          ...lineas.slice(0, indice + 1),
          `${sangria(lineas[indice])}gestionHonorarios: logicaHonorariosNoConfigurada,`,
          ...lineas.slice(indice + 1),
        ];
      },
    },
    {
      nombre: 'sumar "gestionHonorarios" a las dependencias que la app base no recibe',
      noCorresponde: (contenido) => !/^\s*\|\s*"reportes"\s*$/m.test(contenido),
      yaEsta: (contenido) => /\|\s*"gestionHonorarios"/.test(contenido),
      aplicar: (lineas) => {
        const indice = lineas.findIndex((linea) => /^\s*\|\s*"reportes"\s*$/.test(linea));
        if (indice === -1) return null;
        return [
          ...lineas.slice(0, indice + 1),
          `${sangria(lineas[indice])}| "gestionHonorarios"`,
          ...lineas.slice(indice + 1),
        ];
      },
    },
  ]);
}

// ---------------------------------------------------------------------------------------------
const aplicados = resultados.filter(({ estado }) => estado === "APLICADO" || estado === "CAMBIARÍA");
const salteados = resultados.filter(({ estado }) => estado === "YA ESTABA");
const fallas = resultados.filter(({ estado }) => estado === "FALLA");

for (const { estado, archivo, detalle } of resultados.filter(({ estado }) => estado !== "YA ESTABA")) {
  console.log(`${estado.padEnd(10)} ${archivo}  ->  ${detalle}`);
}
console.log("");
console.log(
  `${soloProbar ? "Cambiaría" : "Aplicados"}: ${aplicados.length}. Ya estaban: ${salteados.length}. Fallas: ${fallas.length}.`,
);
if (huboFallas) {
  console.log("Hubo fallas: revisá los archivos marcados antes de seguir (el resto sí se modificó).");
  process.exitCode = 1;
}
