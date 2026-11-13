#!/usr/bin/env node
// Prueba de humo del sistema completo en docker compose (perfil "completo"): que el front sirva la SPA
// con sus cabeceras, que reenvíe /api a la API y que la API llegue a la base con los datos de prueba.
// Va por el mismo camino que un navegador: todo contra el front, salvo /health, que es de la API.
//
//   docker compose --profile completo up -d --build
//   pnpm probar:compose
//
// Sale con código 1 si algo falla. Usa solo el fetch de Node, sin dependencias.

const FRONT = process.env.FRONT_URL ?? "http://localhost:8080";
const API = process.env.API_URL ?? "http://localhost:3000";
const EMAIL_PROPIETARIA = "marina.sosa@example.com";

let fallas = 0;

function informar(ok, descripcion, detalle = "") {
  if (!ok) fallas += 1;
  console.log(`${ok ? "✓" : "✗"} ${descripcion}${!ok && detalle ? ` (${detalle})` : ""}`);
}

async function pedir(url, opciones) {
  try {
    return await fetch(url, opciones);
  } catch (error) {
    return { ok: false, status: 0, headers: new Headers(), text: async () => "", json: async () => ({}), error };
  }
}

async function probarFront() {
  const inicio = await pedir(`${FRONT}/`);
  const html = await inicio.text();
  informar(inicio.status === 200 && html.includes('<div id="root">'), "el front sirve la SPA", `HTTP ${inicio.status}`);
  const csp = inicio.headers.get("content-security-policy") ?? "";
  informar(csp.includes("default-src 'self'"), "el front manda la Content-Security-Policy");
  informar(inicio.headers.get("x-frame-options") === "DENY", "el front manda X-Frame-Options DENY");

  for (const ruta of ["/disponibilidad", "/app/dashboard"]) {
    const respuesta = await pedir(`${FRONT}${ruta}`);
    const cuerpo = await respuesta.text();
    informar(respuesta.status === 200 && cuerpo.includes('<div id="root">'), `${ruta} vuelve a la SPA`, `HTTP ${respuesta.status}`);
  }
}

async function probarApi() {
  const salud = await pedir(`${API}/health`);
  informar(salud.status === 200, "la API responde /health", `HTTP ${salud.status}`);

  const sinSesion = await pedir(`${FRONT}/api/v1/auth/me`);
  informar(sinSesion.status === 401, "el front reenvía /api a la API (401 sin sesión)", `HTTP ${sinSesion.status}`);
}

async function probarBase() {
  const login = await pedir(`${FRONT}/api/v1/auth/desarrollo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL_PROPIETARIA }),
  });
  if (login.status === 404) {
    informar(false, "login de desarrollo", "404: falta LOGIN_DESARROLLO=true y NODE_ENV=development en back/.env");
    return;
  }
  const { token } = await login.json();
  informar(login.status === 200 && Boolean(token), `login de la propietaria de prueba (${EMAIL_PROPIETARIA})`, `HTTP ${login.status}: ¿corrió datos-demo?`);
  if (!token) return;

  const autorizado = { headers: { Authorization: `Bearer ${token}` } };
  const yo = await pedir(`${FRONT}/api/v1/auth/me`, autorizado);
  const perfil = await yo.json();
  informar(yo.status === 200 && perfil.roles?.includes("PROPIETARIA"), "la sesión se valida contra la base", `HTTP ${yo.status}`);

  const actividades = await pedir(`${FRONT}/api/v1/actividades`, autorizado);
  const lista = await actividades.json();
  const cantidad = Array.isArray(lista) ? lista.length : (lista.datos ?? lista.items ?? []).length;
  informar(actividades.status === 200 && cantidad > 0, `la API lee datos de la base (${cantidad} actividades)`, `HTTP ${actividades.status}`);
}

console.log(`Front: ${FRONT} · API: ${API}\n`);
await probarFront();
await probarApi();
await probarBase();
console.log(fallas === 0 ? "\nTodo funciona: front, API y base." : `\n${fallas} prueba(s) fallaron.`);
process.exit(fallas === 0 ? 0 : 1);
