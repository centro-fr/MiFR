import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const pauseMs = Number(process.env.VISIBLE_PAUSE_MS ?? 4000);

async function pause(page) {
  await page.waitForTimeout(pauseMs);
}

async function login(page, option) {
  console.log(`[NAVEGAR] /login como ${option}`);
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator("#login-mocks-rol").selectOption({ label: option });
  console.log("[CLICK] Entrar");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/app\//);
  await pause(page);
}

async function resetSession(page) {
  await page.context().clearCookies();
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
}

async function run() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("/auth/me")) {
      console.error(`[CONSOLE ERROR] ${message.text()}`);
    }
  });

  console.log("=== Asistencia con clases de prueba en curso ===");
  await login(page, "Profesora");
  await page.goto(`${baseUrl}/app/hoy`, { waitUntil: "networkidle" });
  await pause(page);
  const tomarAsistencia = page.getByRole("link", { name: /Tomar asistencia/i }).last();
  console.log("[CLICK] Tomar asistencia");
  await tomarAsistencia.click();
  await pause(page);
  console.log(`[OK] Inscriptos visibles: ${await page.locator("tbody tr").count()}`);

  console.log("[CLICK] Marcar todos presentes");
  await page.getByRole("button", { name: "Marcar todos presentes" }).click();
  await pause(page);
  await page.getByText(/Los inscriptos quedaron marcados como presentes/i).waitFor();
  console.log("[OK] Asistencia masiva confirmada");

  console.log("[CLICK] Cerrar asistencia");
  await page.getByRole("button", { name: "Cerrar asistencia" }).click();
  await pause(page);
  await page.getByRole("button", { name: "Confirmar cierre" }).click();
  await pause(page);
  await page.getByText("Asistencia cerrada", { exact: true }).waitFor();
  console.log("[OK] Cierre de asistencia confirmado");

  console.log("=== Notificaciones no leídas y marcado global ===");
  await resetSession(page);
  await login(page, "Propietaria + Profesora");
  await page.goto(`${baseUrl}/app/notificaciones`, { waitUntil: "networkidle" });
  await pause(page);
  await page.getByRole("button", { name: /Marcar todas como leídas/i }).waitFor();
  console.log("[OK] Notificaciones no leídas visibles");
  console.log("[CLICK] Marcar todas como leídas");
  await page.getByRole("button", { name: /Marcar todas como leídas/i }).click();
  await pause(page);
  await page.getByText(/Todas leídas/i).waitFor();
  console.log("[OK] Todas las notificaciones quedaron leídas");

  await page.screenshot({ path: "test-results/manual-visible/asistencia-notificaciones-final.png", fullPage: true });
  await page.close();
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
