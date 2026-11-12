import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = path.resolve("test-results/manual-visible");
const visiblePauseMs = Number(process.env.VISIBLE_PAUSE_MS ?? 4000);

const roles = [
  {
    name: "propietaria-profesora",
    option: "Propietaria + Profesora",
    routes: [
      "/app/dashboard",
      "/app/alumnos/listado",
      "/app/horarios",
      "/app/pagos",
      "/app/honorarios",
      "/app/comunidad",
    ],
  },
  {
    name: "profesora",
    option: "Profesora",
    routes: ["/app/hoy", "/app/alumnos/listado", "/app/comunidad"],
  },
  {
    name: "alumno",
    option: "Alumno",
    routes: ["/app/inicio", "/app/mi-plan", "/app/progreso", "/app/comunidad"],
  },
  {
    name: "tutor",
    option: "Tutor",
    routes: ["/app/inicio", "/app/progreso", "/app/comunidad"],
  },
];

const publicRoutes = ["/", "/disponibilidad", "/login"];
const failures = [];

async function pause(page) {
  await page.waitForTimeout(visiblePauseMs);
}

async function clickVisible(page, locator, label) {
  const target = page.locator(locator).filter({ visible: true }).first();
  if (await target.count() === 0) {
    console.log(`[SKIP] No se encontró el control: ${label}`);
    return false;
  }
  console.log(`[CLICK] ${label}`);
  try {
    await target.click({ timeout: 5000 });
  } catch (error) {
    const message = `[FALLO] ${label}: ${error.message}`;
    failures.push(message);
    console.error(message);
    return false;
  }
  await pause(page);
  return true;
}

async function assertText(page, pattern, label) {
  const found = await page.getByText(pattern).count();
  if (found === 0) {
    const message = `[FALLO] ${label}: no apareció ${String(pattern)}`;
    failures.push(message);
    console.error(message);
    return false;
  }
  console.log(`[OK] ${label}`);
  return true;
}

async function capture(page, name) {
  await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    fullPage: true,
  });
}

async function visit(page, route, name) {
  console.log(`[NAVEGAR] ${route}`);
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await pause(page);
  await capture(page, name);
  console.log(`[OK] ${name}: ${page.url()}`);
}

async function loginAs(page, role) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  console.log(`[CLICK] Selector de rol: ${role.option}`);
  await page.locator("#login-mocks-rol").selectOption({ label: role.option });
  await pause(page);
  console.log("[CLICK] Entrar");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/app\//);
  await pause(page);
}

async function run() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outputDir },
  });
  const page = await context.newPage();

  function attachDiagnostics(currentPage) {
    currentPage.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (text.includes("Failed to load resource: the server responded with a status of 401 (Unauthorized)")) {
        console.log(`[INFO] Consulta de sesión sin token: ${currentPage.url()}`);
        return;
      }
      failures.push(`console.error ${currentPage.url()}: ${text}`);
      console.error(`[CONSOLE ERROR] ${currentPage.url()}: ${text}`);
    });
    currentPage.on("pageerror", (error) => {
      if (error.message.includes("Failed to update a ServiceWorker") && error.message.includes("mockServiceWorker.js")) {
        console.log("[INFO] Actualización del Service Worker ignorada durante la ejecución visual.");
        return;
      }
      failures.push(`pageerror ${currentPage.url()}: ${error.message}`);
      console.error(`[PAGE ERROR] ${currentPage.url()}: ${error.message}`);
    });
    currentPage.on("requestfailed", (request) => {
      const message = `requestfailed ${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "unknown"}`;
      failures.push(message);
      console.error(`[REQUEST FAILED] ${message}`);
    });
  }

  attachDiagnostics(page);

  console.log("=== Vistas publicas desktop ===");
  for (const [index, route] of publicRoutes.entries()) {
    await visit(page, route, `public-desktop-${index + 1}`);
  }

  console.log("=== Vistas publicas mobile ===");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [index, route] of publicRoutes.entries()) {
    await visit(page, route, `public-mobile-${index + 1}`);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  for (const role of roles) {
    console.log(`=== Rol: ${role.name} desktop ===`);
    await context.clearCookies();
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle" });
    await loginAs(page, role);
    for (const [index, route] of role.routes.entries()) {
      await visit(page, route, `${role.name}-desktop-${index + 1}`);
    }

    if (role.name === "propietaria-profesora") {
      await inspectCalculations(page);
    }
    if (role.name === "profesora") {
      await inspectAttendance(page);
    }
    if (role.name === "alumno") {
      await inspectStudentMetrics(page);
    }
    await inspectNotifications(page);
  }

  console.log("=== Rol Alumno mobile ===");
  await page.setViewportSize({ width: 390, height: 844 });
  const alumno = roles.find((role) => role.name === "alumno");
  await context.clearCookies();
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
  await loginAs(page, alumno);
  for (const [index, route] of alumno.routes.entries()) {
    await visit(page, route, `alumno-mobile-${index + 1}`);
  }

  await context.close();
  await browser.close();
  await fs.writeFile(path.join(outputDir, "summary.txt"), failures.length ? failures.join("\n") : "Sin errores de consola o red.");

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

async function inspectCalculations(page) {
  console.log("=== Validación interactiva de cálculos de honorarios y cobros ===");
  await visit(page, "/app/honorarios", "calculos-honorarios-inicial");
  const puedeCalcularHonorarios = await page.getByRole("button", { name: /Calcular honorarios/i }).count();
  if (puedeCalcularHonorarios > 0) {
    await clickVisible(page, 'button:has-text("Calcular honorarios")', "Calcular honorarios");
    await assertText(page, /Honorarios calculados|Total del mes|líneas para revisar/i, "Resultado del cálculo de honorarios");
  } else {
    await assertText(page, "Total del mes", "Resumen total de honorarios");
    await clickVisible(page, 'button:has-text("Recalcular")', "Recalcular honorarios");
  }

  await visit(page, "/app/pagos", "calculos-cobros-inicial");
  await assertText(page, /Cobros/, "Panel de cobros");
  await clickVisible(page, 'button:has-text("Vencidas")', "Filtrar cuotas vencidas");
  await clickVisible(page, 'button:has-text("Registrar cobro")', "Abrir registro de cobro");
  await assertText(page, "Total a cobrar", "Total calculado del cobro");
  const confirmarCobro = page.getByRole("button", { name: /Confirmar cobro|Informar transferencia/i });
  await confirmarCobro.scrollIntoViewIfNeeded();
  console.log("  [scroll] Acción de cobro visible en el pie del modal");
  await clickVisible(
    page,
    '[role="dialog"] button[aria-label*="Cerrar"], [role="dialog"] button:has-text("Cancelar")',
    "Cerrar modal de cobro",
  );
}

async function inspectAttendance(page) {
  console.log("=== Validación interactiva de clases y asistencia ===");
  await visit(page, "/app/hoy", "clases-hoy-inicial");
  await assertText(page, /clases/i, "Resumen de clases del día");
  await clickVisible(page, 'a:has-text("Tomar asistencia"), button:has-text("Tomar asistencia")', "Abrir toma de asistencia");
  await clickVisible(page, 'button:has-text("Marcar todos presentes")', "Marcar todos presentes");
  await assertText(page, /Asistencia guardada|presentes/i, "Confirmación de asistencia");
}

async function inspectStudentMetrics(page) {
  console.log("=== Validación interactiva de ranking, racha e insignias ===");
  await visit(page, "/app/comunidad", "ranking-inicial");
  await assertText(page, /Ranking/, "Título del ranking");
  const dates = page.locator('input[type="date"]');
  if (await dates.count() >= 2) {
    console.log("[CLICK] Cambiar período del ranking");
    await dates.nth(0).fill("2026-01-01");
    await dates.nth(1).fill("2026-12-31");
    await clickVisible(page, 'button:has-text("Aplicar período")', "Aplicar período");
  }
  await visit(page, "/app/progreso", "insignias-inicial");
  await assertText(page, /Mi racha/, "Racha actual");
  await assertText(page, /Clases asistidas/, "Conteo de clases asistidas");
  await assertText(page, /Mis insignias/, "Listado de insignias");
}

async function inspectNotifications(page) {
  console.log("=== Validación interactiva de notificaciones ===");
  await clickVisible(page, 'button[aria-label*="Notificaciones"]', "Abrir campana de notificaciones");
  await clickVisible(page, 'button:has-text("Marcar todas como leídas"), [role="menuitem"]:has-text("Marcar todas como leídas")', "Marcar todas las notificaciones como leídas");
  await assertText(page, /notificaciones/i, "Desplegable de notificaciones");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
