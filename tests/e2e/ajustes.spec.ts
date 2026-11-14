import { expect, test } from "@playwright/test";
import { entrarComoPrueba, hayCredencialesE2E } from "./sesion";

test.skip(!hayCredencialesE2E(), "Sin credenciales de prueba");

test("horario fijo de 1 siesta se refleja en el plan y se vuelve a Automático", async ({ page, context, baseURL }) => {
  await entrarComoPrueba(context, baseURL!);
  await page.goto("/mas/ajustes");
  test.skip(!page.url().includes("/mas/ajustes"), "Sin hogar");
  await page.getByRole("group", { name: "Cómo se arma el plan del día" }).getByRole("button", { name: "Horario fijo" }).click();
  await page.getByRole("group", { name: "Siestas al día" }).getByRole("button", { name: "1", exact: true }).click();
  await page.getByLabel("Siesta 1: empieza").fill("12:30");
  await page.getByRole("button", { name: "Guardar ajustes" }).click();
  await expect(page.getByRole("status")).toContainText("Guardé los ajustes");
  await page.goto("/");
  const lista = page.getByRole("list", { name: "Bloques del día" });
  await expect(lista).toContainText("tu horario");
  await expect(lista).not.toContainText("Siesta 2");
  await page.goto("/mas/ajustes");
  await page.getByRole("group", { name: "Cómo se arma el plan del día" }).getByRole("button", { name: "Automático" }).click();
  await page.getByRole("button", { name: "Guardar ajustes" }).click();
  await expect(page.getByRole("status")).toContainText("Guardé los ajustes");
});
