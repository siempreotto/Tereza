import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/env";

export type Salud = {
  ok: boolean;
  version: string;
  entorno: string;
  supabase: "conectado" | "sin configurar" | "sin respuesta";
};

// Estado técnico sin datos de salud ni secretos: solo si la app llega a Supabase.
export async function revisarSalud(fetcher: typeof fetch = fetch): Promise<Salud> {
  const version = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);
  const entorno = process.env.VERCEL_ENV ?? "local";
  if (!supabaseConfigured()) return { ok: true, version, entorno, supabase: "sin configurar" };
  try {
    const res = await fetcher(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    return { ok: res.ok, version, entorno, supabase: res.ok ? "conectado" : "sin respuesta" };
  } catch {
    return { ok: false, version, entorno, supabase: "sin respuesta" };
  }
}
