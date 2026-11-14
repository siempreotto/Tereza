// Llama al servidor MCP real (mismo handler que /api/mcp) con tokens de usuarios de ejemplo, para comprobar
// herramientas, RLS por rol y auditoría. El token de sesión se acepta solo aquí (en producción se exige client_id de OAuth).
import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

try { process.loadEnvFile(".env.local"); } catch { /* sin archivo: se omiten */ }
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", PASS = process.env.E2E_SEED_PASSWORD ?? "";
const hay = Boolean(URL_SB && KEY && PASS);

let llamar: (correo: string, herramienta: string, args?: Record<string, unknown>) => Promise<{ texto: string; datos: Record<string, unknown>; error: boolean }>;
let listar: () => Promise<string[]>;

describe.skipIf(!hay)("servidor MCP", () => {
  beforeAll(async () => {
    const { registrarHerramientas, INSTRUCCIONES } = await import("@/lib/mcp/servidor");
    const tokens: Record<string, string> = {};
    for (const n of ["andrea", "carmen"]) {
      const db = createClient(URL_SB, KEY, { auth: { persistSession: false } });
      const { data, error } = await db.auth.signInWithPassword({ email: `${n}@ejemplo.tereza.test`, password: PASS });
      if (error) throw error;
      tokens[`${n}@ejemplo.tereza.test`] = data.session!.access_token;
    }
    const handler = withMcpAuth(createMcpHandler(registrarHerramientas, { serverInfo: { name: "Tereza", version: "test" }, instructions: INSTRUCCIONES }),
      async (_r, t) => (t ? { token: t, clientId: "pruebas-integracion", scopes: [], extra: { userId: JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub } } : undefined), { required: true });
    let id = 0;
    const rpc = async (token: string, method: string, params: unknown) => {
      const res = await handler(new Request("http://localhost/api/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}`, "mcp-protocol-version": "2025-06-18" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) }));
      const txt = await res.text();
      const linea = txt.split("\n").find((l) => l.startsWith("data:"));
      return JSON.parse(linea ? linea.slice(5) : txt);
    };
    llamar = async (correo, herramienta, args = {}) => {
      const r = await rpc(tokens[correo], "tools/call", { name: herramienta, arguments: args });
      if (r.error) throw new Error(JSON.stringify(r.error));
      return { texto: r.result.content[0].text as string, datos: (r.result.structuredContent ?? {}) as Record<string, unknown>, error: Boolean(r.result.isError) };
    };
    listar = async () => (await rpc(tokens["andrea@ejemplo.tereza.test"], "tools/list", {})).result.tools.map((t: { name: string }) => t.name);
  });

  const A = "andrea@ejemplo.tereza.test", C = "carmen@ejemplo.tereza.test";

  it("lista todas las herramientas", async () => {
    const t = await listar();
    for (const n of ["listar_bebes", "estado_actual", "iniciar_timer", "cambiar_lado", "pausar_toma", "terminar_timer", "registrar_evento", "corregir_evento", "eliminar_evento", "deshacer_eliminacion", "consultar_eventos", "resumen", "analizar_periodo", "predecir_proximo_sueno", "registrar_medida", "registrar_medicamento", "gestionar_tratamiento", "agregar_duda_pediatra", "resolver_duda", "ver_proxima_cita", "fijar_proxima_cita", "resumen_pediatra", "ver_configuracion", "cambiar_configuracion", "invitar_cuidador", "plan_del_dia", "registrar_despertar"]) expect(t).toContain(n);
  });

  it("estado actual y bebés", async () => {
    const b = await llamar(A, "listar_bebes");
    expect(b.texto).toContain("Lucía");
    const e = await llamar(A, "estado_actual");
    expect(e.error).toBe(false);
    expect(["duerme", "despierto"]).toContain(e.datos.estado);
  });

  it("biberón con hora natural, corrección con versión, conflicto, eliminar y deshacer", async () => {
    const r = await llamar(A, "registrar_evento", { tipo: "toma_biberon", hora: "hace 20 minutos", detalles: { contenido: "formula", volumen: 4, sobrante: 0.5 } });
    expect(r.error).toBe(false);
    const ev = r.datos.evento as { event_id: string; version: number; payload: { volumen_ml: number } };
    expect(ev.payload.volumen_ml).toBe(118);
    const c = await llamar(A, "corregir_evento", { event_id: ev.event_id, version_esperada: ev.version, detalles: { volumen: 5 } });
    expect(c.error).toBe(false);
    const viejo = await llamar(A, "corregir_evento", { event_id: ev.event_id, version_esperada: ev.version, notas: "x" });
    expect(viejo.error).toBe(true);
    expect(viejo.datos.codigo).toBe("CONFLICTO");
    const d = await llamar(A, "eliminar_evento", { event_id: ev.event_id });
    expect(d.datos.como_revertir).toBe("deshacer_eliminacion");
    const u = await llamar(A, "deshacer_eliminacion", { event_id: ev.event_id });
    expect(u.error).toBe(false);
    await llamar(A, "eliminar_evento", { event_id: ev.event_id });
  });

  it("timer de pecho: iniciar, no duplicar, cambiar lado, terminar", async () => {
    const i = await llamar(A, "iniciar_timer", { tipo: "toma_pecho", lado: "izq" });
    expect(i.error).toBe(false);
    const id = (i.datos.evento as { event_id: string }).event_id;
    const dup = await llamar(A, "iniciar_timer", { tipo: "toma_pecho", lado: "der" });
    expect(dup.datos.ya_existia).toBe(true);
    expect(dup.texto).toContain("No lo dupliqué");
    const l = await llamar(A, "cambiar_lado", {});
    expect(l.datos.lado_activo).toBe("der");
    const t = await llamar(A, "terminar_timer", { tipo: "toma_pecho" });
    expect(t.error).toBe(false);
    await llamar(A, "eliminar_evento", { event_id: id });
  });

  it("medicamento: solo registra y la descripción lo dice", async () => {
    const r = await llamar(A, "registrar_medicamento", { nombre: "Paracetamol de prueba", indicacion_textual: "Según indicación del pediatra", cantidad_textual: "2.5 ml" });
    expect(r.error).toBe(false);
    expect(r.texto).toContain("solo registra");
    await llamar(A, "eliminar_evento", { event_id: (r.datos.evento as { event_id: string }).event_id });
    await llamar(A, "gestionar_tratamiento", { accion: "terminar", medication_id: r.datos.medication_id });
  });

  it("resúmenes, análisis y predicción sin lenguaje prohibido", async () => {
    for (const [h, a] of [["resumen", { periodo: "7d" }], ["analizar_periodo", { periodo: "7d" }], ["predecir_proximo_sueno", {}], ["resumen_pediatra", {}]] as const) {
      const r = await llamar(A, h, a);
      expect(r.error, `${h}: ${r.texto}`).toBe(false);
      expect(r.texto).not.toMatch(/científicamente|ciencia del sueño|debería dormir/i);
    }
  });

  it("rol limitado: registra pañal pero no ve salud ni días anteriores", async () => {
    const p = await llamar(C, "registrar_evento", { tipo: "panal", detalles: { mojado: true } });
    expect(p.error).toBe(false);
    const m = await llamar(C, "registrar_medicamento", { nombre: "X", cantidad_textual: "1 ml" });
    expect(m.datos.codigo).toBe("PERMISO");
    const r = await llamar(C, "resumen", { periodo: "7d" });
    expect(r.datos.codigo).toBe("PERMISO");
    const cfg = await llamar(C, "cambiar_configuracion", { unidad_volumen: "ml" });
    expect(cfg.datos.codigo).toBe("PERMISO");
    const e = await llamar(C, "estado_actual");
    expect(e.datos).not.toHaveProperty("ultimo_medicamento");
    await llamar(C, "eliminar_evento", { event_id: (p.datos.evento as { event_id: string }).event_id });
  });

  it("plan del día y despertar con ánimo", async () => {
    // Si había un sueño en curso de otra corrida, lo cierra registrando el despertar.
    const d = await llamar(A, "registrar_despertar", { hora: "hace 5 minutos", se_durmio: "ayer a las 7 de la noche", animo: "bien", como_termino: "natural" });
    expect(d.error, d.texto).toBe(false);
    const ev = d.datos.evento as { event_id: string; payload: { animo_despertar?: string } };
    expect(ev.payload.animo_despertar).toBe("bien");
    const p = await llamar(A, "plan_del_dia", {});
    expect(p.error, p.texto).toBe(false);
    expect(p.texto).toContain("Plan de hoy");
    expect(p.texto).not.toMatch(/deber[ií]a|científic/i);
    const bloques = p.datos.bloques as { tipo: string }[];
    expect(bloques[0].tipo).toBe("despertar");
    expect(bloques.at(-1)!.tipo).toBe("dormir");
    const s = await llamar(A, "predecir_proximo_sueno", {});
    expect(s.error, s.texto).toBe(false);
    const c = await llamar(C, "plan_del_dia", {});
    expect(c.datos.codigo).toBe("PERMISO");
    await llamar(A, "eliminar_evento", { event_id: ev.event_id });
  });

  it("horario fijo por configuración y vuelta a automático", async () => {
    const c = await llamar(A, "cambiar_configuracion", { horario_fijo: { despertar: "6:30", siestas: [{ inicio: "12:30", duracion_min: 90 }], dormir: "19:30" } });
    expect(c.error, c.texto).toBe(false);
    const p = await llamar(A, "plan_del_dia", {});
    expect(p.datos.fuente_siestas).toBe("horario");
    const v = await llamar(A, "cambiar_configuracion", { plan_modo: "auto" });
    expect(v.error, v.texto).toBe(false);
  });

  it("configuración: devuelve anterior y nuevo, y se revierte", async () => {
    const v = await llamar(A, "ver_configuracion");
    const antes = (v.datos.unidades as { volumen: string }).volumen;
    const otro = antes === "oz" ? "ml" : "oz";
    const c = await llamar(A, "cambiar_configuracion", { unidad_volumen: otro });
    expect(c.datos.cambios).toEqual([{ campo: "unidad_volumen", anterior: antes, nuevo: otro }]);
    await llamar(A, "cambiar_configuracion", { unidad_volumen: antes });
  });
});
