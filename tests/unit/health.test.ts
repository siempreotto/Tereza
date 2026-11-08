import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(url = "https://abc.supabase.co", key = "sb_publishable_x") {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
  return import("@/lib/health");
}

describe("revisarSalud", () => {
  it("dice «sin configurar» si faltan las variables", async () => {
    const { revisarSalud } = await load("", "");
    const r = await revisarSalud(vi.fn());
    expect(r.supabase).toBe("sin configurar");
    expect(r.ok).toBe(true);
  });

  it("dice «conectado» cuando Supabase responde 200 y manda solo la llave publicable", async () => {
    const { revisarSalud } = await load();
    const f = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const r = await revisarSalud(f);
    expect(r).toMatchObject({ ok: true, supabase: "conectado" });
    expect(f.mock.calls[0][0]).toBe("https://abc.supabase.co/auth/v1/health");
    expect(f.mock.calls[0][1].headers).toEqual({ apikey: "sb_publishable_x" });
  });

  it("dice «sin respuesta» si la red falla", async () => {
    const { revisarSalud } = await load();
    const r = await revisarSalud(vi.fn().mockRejectedValue(new Error("red")));
    expect(r).toMatchObject({ ok: false, supabase: "sin respuesta" });
  });
});
