import { createServerClient } from "@supabase/ssr";
import type { BrowserContext } from "@playwright/test";

// Inicia sesión con el usuario de pruebas (E2E_EMAIL/E2E_PASSWORD) y pasa las cookies de Supabase al navegador.
export async function entrarComoPrueba(context: BrowserContext, baseURL: string) {
  const email = process.env.E2E_EMAIL, password = process.env.E2E_PASSWORD;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!email || !password || !url || !key) throw new Error("Faltan E2E_EMAIL, E2E_PASSWORD o las variables de Supabase");
  const jar: { name: string; value: string }[] = [];
  const db = createServerClient(url, key, {
    cookies: { getAll: () => jar, setAll: (list) => list.forEach(({ name, value }) => { const i = jar.findIndex((c) => c.name === name); if (i >= 0) jar[i] = { name, value }; else jar.push({ name, value }); }) },
  });
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const host = new URL(baseURL);
  await context.addCookies(jar.map((c) => ({ ...c, domain: host.hostname, path: "/", httpOnly: false, secure: host.protocol === "https:", sameSite: "Lax" as const })));
}

export const hayCredencialesE2E = () => Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD && process.env.NEXT_PUBLIC_SUPABASE_URL);
