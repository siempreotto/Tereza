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

test("iniciar sueño, despertar y deshacer el despertar", async ({ page }) => {
  // Si quedó un sueño abierto de otra corrida, primero lo cierra.
  if (await page.getByRole("button", { name: "Despertó" }).isVisible()) {
    await page.getByRole("button", { name: "Despertó" }).click();
    await expect(page.getByRole("status")).toContainText("Despertó");
  }
  await page.getByRole("button", { name: "Iniciar sueño" }).click();
  await expect(page.getByRole("status")).toContainText("Empezó el sueño a las");
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByRole("button", { name: "Despertó" }).click();
  await expect(page.getByRole("status")).toContainText("Despertó. Durmió");
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByRole("button", { name: "Despertó" })).toBeVisible();
  await page.getByRole("button", { name: "Despertó" }).click();
  // Espera la confirmación del servidor (el cambio en pantalla es optimista).
  await expect(page.getByRole("status")).toContainText("Despertó. Durmió");
  await page.reload();
  await expect(page.getByText("Despierta", { exact: true })).toBeVisible();
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
  const boton = page.getByRole("button", { name: /Cambiar a modo (noche|día)/ });
  const antes = await page.locator("html").getAttribute("data-theme");
  await boton.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", antes ?? "light");
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
