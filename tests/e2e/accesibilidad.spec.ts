import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { entrarComoPrueba, hayCredencialesE2E } from "./sesion";

// WCAG 2.1 AA en modo Día y Noche en las pantallas principales.
const RUTAS = ["/", "/diario", "/salud-bebe", "/salud-bebe/crecimiento", "/salud-bebe/medicamentos", "/salud-bebe/pediatra", "/salud-bebe/dudas", "/mas", "/mas/patrones", "/mas/resumen", "/mas/claude", "/mas/datos", "/mas/ajustes"];

test("entrar cumple AA", async ({ page }) => {
  await page.goto("/entrar");
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
});

for (const modo of ["day", "noche"] as const) {
  test(`pantallas con sesión cumplen AA en modo ${modo === "day" ? "día" : "noche"}`, async ({ page, context, baseURL }) => {
    test.skip(!hayCredencialesE2E(), "Sin credenciales de prueba");
    test.setTimeout(120_000);
    await entrarComoPrueba(context, baseURL!);
    await page.addInitScript((m) => { try { localStorage.setItem("tereza.noche", m === "noche" ? "on" : "off"); } catch {} }, modo);
    const fallas: string[] = [];
    for (const r of RUTAS) {
      await page.goto(r);
      if (page.url().endsWith("/bienvenida")) test.skip(true, "Sin hogar");
      await page.waitForLoadState("networkidle");
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      for (const v of res.violations) fallas.push(`${r} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
    }
    expect(fallas).toEqual([]);
  });
}
