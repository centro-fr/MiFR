// Prueba temporal: crea una actividad de verdad y verifica que aparezca en la tabla.
const [, , url] = process.argv;
const base = "http://127.0.0.1:9222";

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`${base}/json/list`)).json();
      const p = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (p) return p;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("sin target");
}

const page = await target();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
const consola = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) {
    const { resolve, reject } = pend.get(m.id);
    pend.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  } else if (m.method === "Runtime.consoleAPICalled") {
    consola.push(m.params.type + ": " + m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
  } else if (m.method === "Runtime.exceptionThrown") {
    consola.push("EXCEPTION: " + (m.params.exceptionDetails?.exception?.description ?? ""));
  }
});
await new Promise((r) => ws.addEventListener("open", r));
const env = (method, params = {}) =>
  new Promise((resolve, reject) => {
    id++;
    pend.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluar = async (expression) =>
  (await env("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

await env("Runtime.enable");
await env("Page.enable");
await env("Page.addScriptToEvaluateOnNewDocument", {
  source: `try { localStorage.setItem('mifr:tema','oscuro'); } catch (e) {}`,
});
await env("Page.navigate", { url });

const esperar = async (cond, tries = 60) => {
  for (let i = 0; i < tries; i++) {
    if (await evaluar(cond)) return true;
    await dormir(500);
  }
  return false;
};

// Sesión
await esperar(`location.pathname === '/login'`);
for (let i = 0; i < 20; i++) {
  if ((await evaluar("location.pathname")) !== "/login") break;
  await evaluar(`[...document.querySelectorAll('button')].find(b => /google/i.test(b.innerText))?.click()`);
  await dormir(900);
}
await esperar(`document.querySelectorAll('tbody tr').length > 0`);
await dormir(1200);

const antes = await evaluar(`document.querySelectorAll('tbody tr').length`);
const contadorAntes = await evaluar(`document.body.innerText.match(/(\\d+) activas?/)?.[1] ?? '?'`);
console.log("filas antes:", antes, "| contador:", contadorAntes);

// Abrir modal
await evaluar(`[...document.querySelectorAll('button')].find(b => /nueva actividad/i.test(b.innerText))?.click()`);
await dormir(700);
console.log("modal abierto:", await evaluar(`!!document.querySelector('#actividad-form')`));

// Llenar y enviar
await evaluar(`(() => {
  const set = (sel, val) => {
    const el = document.querySelector(sel);
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('#actividad-nombre', 'Boxeo de Prueba');
  set('#actividad-descripcion', 'Actividad creada por prueba automatizada.');
  return 'lleno';
})()`);
await dormir(300);
console.log("valor en el campo:", await evaluar(`document.querySelector('#actividad-nombre').value`));

await evaluar(`[...document.querySelectorAll('button')].find(b => /guardar actividad/i.test(b.innerText))?.click()`);
await dormir(1200);

const despues = await evaluar(`document.querySelectorAll('tbody tr').length`);
const contadorDespues = await evaluar(`document.body.innerText.match(/(\\d+) activas?/)?.[1] ?? '?'`);
const aparecio = await evaluar(`document.body.innerText.includes('Boxeo de Prueba')`);
const modalAbierto = await evaluar(`!!document.querySelector('#actividad-form')`);

console.log("--- RESULTADO ---");
console.log("filas despues:", despues, "| contador:", contadorDespues);
console.log("aparece la actividad nueva:", aparecio);
console.log("modal sigue abierto:", modalAbierto);
console.log("toast:", (await evaluar(`document.body.innerText.match(/creada correctamente|actualizada correctamente/g)?.join(',') ?? 'ninguno'`)));
console.log("--- consola ---");
consola.filter((c) => /error|EXCEPTION/i.test(c)).slice(0, 8).forEach((c) => console.log("  " + c));
ws.close();
