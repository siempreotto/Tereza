import { expect, test } from "@playwright/test";

test("la página de salud carga y muestra el estado de Supabase", async ({ page }) => {
  await page.goto("/salud");
  await expect(page.getByRole("heading", { name: "El día de tu bebé, registrado en un toque." })).toBeVisible();
  await expect(page.getByRole("region", { name: "Estado técnico" })).toContainText("Supabase");
});

test("/api/salud responde JSON sin secretos", async ({ request }) => {
  const res = await request.get("/api/salud");
  const body = await res.json();
  expect(["conectado", "sin configurar", "sin respuesta"]).toContain(body.supabase);
  expect(JSON.stringify(body)).not.toMatch(/sb_secret|service_role/);
});
