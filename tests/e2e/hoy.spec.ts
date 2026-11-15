import { expect, test } from "@playwright/test";
import { entrarComoPrueba, hayCredencialesE2E } from "./sesion";

// Necesita red hacia Supabase y que el usuario de pruebas ya tenga hogar (corre después de onboarding.spec.ts).
test.skip(!hayCredencialesE2E(), "Sin credenciales de prueba");
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page, context, baseURL }) => {
  await entrarComoPrueba(context, baseURL!);
  await page.goto("/");
  test.skip(page.url().endsWith("/bienvenida"), "El usuario de pruebas todavía no tiene hogar");
});

// «Despertó» abre su hoja (hora, ánimo, cómo terminó) y guarda con «Guardar despertar».
async function despertar(page: import("@playwright/test").Page, animo?: string) {
  await page.getByRole("button", { name: "Despertó", exact: true }).click();
  const hoja = page.getByRole("dialog");
  if (animo) await hoja.getByRole("button", { name: animo }).click();
  await hoja.getByRole("button", { name: "Guardar despertar" }).click();
}

test("iniciar sueño, despertar con ánimo y deshacer el despertar", async ({ page }) => {
  // Si quedó un sueño abierto de otra corrida, primero lo cierra.
  if (await page.getByRole("button", { name: "Despertó", exact: true }).isVisible()) {
    await despertar(page);
    await expect(page.getByRole("status")).toContainText("Despertó");
  }
  await page.getByRole("button", { name: "Iniciar sueño" }).click();
  await expect(page.getByRole("status")).toContainText("Empezó el sueño a las");
  await expect(page.getByRole("timer")).toBeVisible();
  await despertar(page, "De buen humor");
  await expect(page.getByRole("status")).toContainText(/Despertó a las .* Durmió/);
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByRole("button", { name: "Despertó", exact: true })).toBeVisible();
  await despertar(page);
  // Espera la confirmación del servidor (el cambio en pantalla es optimista).
  await expect(page.getByRole("status")).toContainText(/Despertó a las .* Durmió/);
  await page.reload();
  await expect(page.getByText("Despierta", { exact: true })).toBeVisible();
  // El plan del día aparece con su siguiente bloque.
  await expect(page.getByRole("heading", { name: /Plan de hoy/ })).toBeVisible();
  await expect(page.getByRole("list", { name: "Bloques del día" })).toContainText("Hora de dormir");
});

test("hora de dormir, despertar nocturno y despertar de la mañana", async ({ page }) => {
  if (await page.getByRole("button", { name: "Despertó", exact: true }).isVisible()) {
    await despertar(page);
    // Espera la confirmación del servidor antes de navegar.
    await expect(page.getByRole("status")).toContainText(/Despertó a las/);
  }
  await page.goto("/?registrar=dormir");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar hora de dormir" }).click();
  await expect(page.getByRole("status")).toContainText("Se durmió a las");
  await page.goto("/?registrar=nocturno");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar despertar nocturno" }).click();
  await expect(page.getByRole("status")).toContainText("Despertar nocturno guardado");
  await expect(page.getByRole("timer")).toBeVisible();
  await despertar(page);
  await expect(page.getByRole("status")).toContainText(/Despertó a las/);
});

test("pañal en un toque y deshacer", async ({ page }) => {
  await page.getByRole("button", { name: "Pañal", exact: true }).click();
  await page.getByRole("button", { name: "Ambos" }).click();
  await expect(page.getByRole("status")).toContainText("Guardé: pañal, mojado y sucio");
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("region", { name: "Registros de hoy" })).not.toContainText("Mojado y sucio", { timeout: 1000 });
  }).toPass({ timeout: 10_000 });
});

test("toma de pecho: empezar, cambiar de lado y terminar", async ({ page }) => {
  await page.getByRole("button", { name: "Toma", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pecho" }).click();
  await page.getByRole("button", { name: "Empezar toma" }).click();
  await expect(page.getByRole("region", { name: "Toma de pecho en curso" })).toBeVisible();
  await page.getByRole("button", { name: /Cambiar a derecho/ }).click();
  await expect(page.getByRole("button", { name: /Cambiar a izquierdo/ })).toBeVisible();
  await page.getByRole("button", { name: "Terminar toma" }).click();
  await expect(page.getByRole("status")).toContainText("Guardé la toma de pecho");
  await page.reload();
  await expect(page.getByRole("button", { name: "Iniciar sueño" })).toBeVisible();
});

test("biberón en onzas y aparece en la lista de hoy", async ({ page }) => {
  await page.getByRole("button", { name: "Toma", exact: true }).click();
  await page.getByRole("button", { name: "Guardar toma" }).click();
  await expect(page.getByRole("status")).toContainText("biberón, 4 oz de leche materna");
  await expect(page.getByRole("region", { name: "Registros de hoy" })).toContainText("Biberón");
});

test("modo noche manual", async ({ page }) => {
  // El tema se aplica al hidratar (de noche, el modo automático ya lo activa): se lee el estado desde el botón.
  const boton = page.getByRole("button", { name: /Cambiar a modo (noche|día)/ });
  await page.waitForLoadState("networkidle");
  const eraNoche = /día/.test((await boton.getAttribute("aria-label")) ?? "");
  await boton.click();
  if (eraNoche) await expect(page.locator(".tz-screen").first()).not.toHaveAttribute("data-theme", "noche");
  else await expect(page.locator(".tz-screen").first()).toHaveAttribute("data-theme", "noche");
});

test("Diario, patrones, resumen y salud cargan con datos", async ({ page }) => {
  await page.goto("/diario");
  await expect(page.getByRole("heading", { name: "Diario" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Línea de tiempo de 24 horas" })).toBeVisible();
  await page.goto("/mas/patrones");
  await expect(page.getByRole("heading", { name: "Patrones de sueño" })).toBeVisible();
  await page.goto("/mas/resumen?p=hoy");
  await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();
  await page.goto("/salud-bebe");
  await expect(page.getByRole("heading", { name: "Salud" })).toBeVisible();
  await page.goto("/salud-bebe/resumen");
  await expect(page.getByRole("heading", { name: "Resumen para el pediatra" })).toBeVisible();
});

test("sin red: el pañal queda «por enviar» y se envía al volver la conexión", async ({ page, context }) => {
  await context.setOffline(true);
  await page.getByRole("button", { name: "Pañal", exact: true }).click();
  await page.getByRole("button", { name: "Mojado", exact: true }).click();
  await expect(page.getByText(/Sin conexión/).first()).toBeVisible();
  await expect(page.getByText("1 por enviar")).toBeVisible();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByText(/Envié el registro que quedó sin red/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("1 por enviar")).toHaveCount(0);
  // Limpieza: elimina el pañal que se envió.
  await page.reload();
  const fila = page.getByRole("region", { name: "Registros de hoy" }).getByText(/^Mojado$/).first();
  if (await fila.isVisible()) {
    await fila.click();
    await page.getByRole("button", { name: /Eliminar/ }).first().click();
  }
});

test("siesta que ya pasó: se guarda hoy con sus horas y el plan la cuenta", async ({ page }) => {
  if (await page.getByRole("button", { name: "Despertó", exact: true }).isVisible()) {
    await despertar(page);
    await expect(page.getByRole("status")).toContainText(/Despertó a las/);
  }
  const hhmm = (minAntes: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "America/Guatemala", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(Date.now() - minAntes * 60_000));
  // Desde un bloque del plan se abre la hoja ya en «Uno que ya pasó».
  const ya = page.getByRole("button", { name: /^Registrar Siesta/ }).first();
  if (await ya.isVisible()) {
    await ya.click();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Uno que ya pasó" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar" }).click();
  }
  await page.getByRole("button", { name: "Registrar una siesta que ya pasó" }).click();
  const hoja = page.getByRole("dialog");
  await hoja.getByLabel("Se durmió").fill(hhmm(110));
  await hoja.getByLabel("Despertó").fill(hhmm(60));
  await expect(hoja.getByText(/· 50 min/)).toBeVisible();
  await hoja.getByRole("button", { name: "Guardar sueño" }).click();
  await expect(page.getByRole("status")).toContainText(/Guardé: sueño de .* 50 min/);
  await page.reload();
  await expect(page.getByRole("list", { name: "Bloques del día" })).toContainText("50 min");
});
