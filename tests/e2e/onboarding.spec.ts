import { expect, test } from "@playwright/test";
import { entrarComoPrueba, hayCredencialesE2E } from "./sesion";

// Necesita red hacia Supabase y el usuario de pruebas sin hogar (E2E_EMAIL/E2E_PASSWORD en .env.local).
test.skip(!hayCredencialesE2E(), "Sin credenciales de prueba");

test("alta completa: hogar, bebé, sueño seguro, invitación y portada", async ({ page, context, baseURL }) => {
  await entrarComoPrueba(context, baseURL!);
  await page.goto("/");
  // Si el usuario de pruebas ya tiene hogar (corrida anterior), el alta no aplica.
  test.skip(!page.url().endsWith("/bienvenida"), "El usuario de pruebas ya tiene hogar; reinícialo para repetir el alta.");

  await page.getByLabel("¿Cómo te llamas?").fill("Andrea");
  await page.getByLabel("Nombre del hogar").fill("Casa de prueba");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await page.getByLabel("Fecha de nacimiento").fill("2026-06-05");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Antes de empezar: sueño seguro" })).toBeVisible();
  await page.getByRole("button", { name: "Entendido" }).click();

  await page.getByLabel("Correo de la persona").fill("abuela@ejemplo.tereza.test");
  await page.getByRole("radio", { name: /Limitado/ }).click();
  await page.getByRole("button", { name: "Crear invitación" }).click();
  await expect(page.getByRole("list", { name: "Invitaciones creadas" })).toContainText("abuela@ejemplo.tereza.test");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Listo, ir a Hoy" }).click();
  await expect(page.getByText("¿Qué está haciendo Lucía ahora?")).toBeVisible();
});
