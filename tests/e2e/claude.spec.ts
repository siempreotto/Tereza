import { expect, test } from "@playwright/test";
import { entrarComoPrueba, hayCredencialesE2E } from "./sesion";

test.skip(!hayCredencialesE2E(), "Sin credenciales de prueba");

test("Más › Conexión con asistentes muestra la URL del conector", async ({ page, context, baseURL }) => {
  await entrarComoPrueba(context, baseURL!);
  await page.goto("/mas");
  test.skip(page.url().endsWith("/bienvenida"), "Sin hogar");
  await page.getByRole("link", { name: /Conexión con asistentes/ }).click();
  await expect(page.getByRole("heading", { name: "Conexión con Claude y ChatGPT" })).toBeVisible();
  await expect(page.getByText(/\/api\/mcp/).first()).toBeVisible();
});

test("el consentimiento sin solicitud explica qué hacer", async ({ page, context, baseURL }) => {
  await entrarComoPrueba(context, baseURL!);
  await page.goto("/oauth/consent");
  await expect(page.getByRole("heading", { name: "Enlace no válido" })).toBeVisible();
});

test("el MCP exige token y anuncia sus metadatos", async ({ request }) => {
  const r = await request.post("/api/mcp", { data: {} });
  expect(r.status()).toBe(401);
  expect(r.headers()["www-authenticate"]).toContain("resource_metadata=");
  const m = await (await request.get("/.well-known/oauth-protected-resource")).json();
  expect(m.resource).toMatch(/\/api\/mcp$/);
  expect(m.authorization_servers[0]).toMatch(/\/auth\/v1$/);
});
