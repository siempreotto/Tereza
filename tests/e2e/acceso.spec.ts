import { expect, test } from "@playwright/test";

// Pantallas públicas del acceso (no necesitan sesión).
test("sin sesión, la portada manda a /entrar", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "El día de tu bebé, a un toque." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar con mi correo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeDisabled();
});

test("conserva a dónde ibas para volver después de entrar", async ({ page }) => {
  await page.goto("/mas/cuidadores");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fmas%2Fcuidadores$/);
});

test("valida el correo antes de mandarlo", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Tu correo").fill("andrea-sin-arroba");
  await page.getByRole("button", { name: "Continuar con mi correo" }).click();
  await expect(page.locator("#entrar-error")).toHaveText("Revisa el correo: falta la @ o el dominio.");
});

test("un enlace de invitación mal formado se explica", async ({ page }) => {
  await page.goto("/invitacion/no-es-un-token");
  await expect(page.getByRole("heading", { name: "Este enlace no es válido" })).toBeVisible();
});

test("una invitación sin sesión pide entrar y vuelve a la invitación", async ({ page }) => {
  const token = "a".repeat(48);
  await page.goto(`/invitacion/${token}`);
  await expect(page.getByRole("heading", { name: "Te invitaron a cuidar en Tereza" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar para aceptar" })).toHaveAttribute("href", `/entrar?next=${encodeURIComponent(`/invitacion/${token}`)}`);
});

test("/entrar no acepta redirigir a otro dominio", async ({ page }) => {
  await page.goto("/entrar?next=https://malicioso.example");
  // El destino se normaliza a "/" (se valida en destinoSeguro).
  await expect(page.getByRole("button", { name: "Continuar con mi correo" })).toBeVisible();
});
