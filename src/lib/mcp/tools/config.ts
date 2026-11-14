import "server-only";
import * as z from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { ErrorMcp, soloAdmin, type Ctx } from "../contexto";
import { errorDeBase, ok, type Respuesta } from "../util";

type ConCtx = <A>(nombre: string, fn: (ctx: Ctx, args: A) => Promise<Respuesta>) => (args: A, extra: unknown) => Promise<Respuesta>;

const ROL_TXT = { admin: "administra", cuidador: "cuidador", limitado: "limitado (solo sueño, tomas y pañales de hoy)" } as const;
const HHMM = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Usa HH:MM en 24 h");

export function registrarHerramientasConfig(server: McpServer, conCtx: ConCtx, appUrl: () => string) {
  server.registerTool("ver_configuracion", {
    title: "Ver la configuración del hogar",
    description: "Unidades, zona horaria, modo noche, ventana del sueño nocturno, hora de dormir, alarmas y cuidadores con su rol.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  }, conCtx("ver_configuracion", async (ctx) => {
    const { data: miembros } = await ctx.db.from("members").select("nombre_visible, rol").eq("household_id", ctx.hogarId).order("creado_en");
    const a = ctx.ajustes;
    const cfg = {
      hogar: ctx.hogarNombre, tu_rol: ctx.rol,
      unidades: { volumen: a.unidadVolumen, peso: a.unidadPeso, longitud: a.unidadLongitud },
      zona_horaria: a.tz,
      modo_noche: { modo: a.nocheUiModo, desde: a.nocheUiDesde, hasta: a.nocheUiHasta },
      ventana_sueno_nocturno: { desde: a.nocheDesde, hasta: a.nocheHasta },
      ventanas_vigilia: { modo: a.ventanasModo, propias_min: a.ventanasPropias },
      hora_dormir: a.horaDormir,
      alarmas_activas: a.alarmasActivas,
      cuidadores: (miembros ?? []).map((m) => ({ nombre: m.nombre_visible, rol: m.rol })),
    };
    return ok([
      `Hogar: ${cfg.hogar} (tu rol: ${ROL_TXT[ctx.rol]}).`,
      `Unidades: volumen en ${a.unidadVolumen}, peso en ${a.unidadPeso}, longitud en ${a.unidadLongitud}. Zona horaria: ${a.tz}.`,
      `Modo noche: ${a.nocheUiModo === "auto" ? `automático de ${a.nocheUiDesde} a ${a.nocheUiHasta}` : a.nocheUiModo === "on" ? "siempre" : "nunca"}. Sueño nocturno: los que empiezan entre ${a.nocheDesde} y ${a.nocheHasta}. Hora de dormir: ${a.horaDormir}.`,
      `Alarmas: ${a.alarmasActivas ? "activas (umbrales pendientes de validar con un pediatra)" : "apagadas"}.`,
      `Cuidadores: ${cfg.cuidadores.map((c) => `${c.nombre} (${c.rol})`).join(", ")}.`,
    ].join("\n"), cfg);
  }));

  server.registerTool("cambiar_configuracion", {
    title: "Cambiar la configuración del hogar",
    description: "Cambia ajustes del hogar o el rol de un cuidador (solo quien administra). Devuelve el valor anterior y el nuevo de cada campo y cómo revertirlo.",
    inputSchema: z.object({
      unidad_volumen: z.enum(["ml", "oz"]).optional(),
      unidad_peso: z.enum(["kg", "lb"]).optional(),
      unidad_longitud: z.enum(["cm", "in"]).optional(),
      zona_horaria: z.string().max(60).optional().describe("Nombre IANA, p. ej. America/Guatemala"),
      modo_noche: z.enum(["auto", "on", "off"]).optional(),
      modo_noche_desde: HHMM.optional(), modo_noche_hasta: HHMM.optional(),
      sueno_noche_desde: HHMM.optional(), sueno_noche_hasta: HHMM.optional(),
      hora_dormir: HHMM.optional(),
      ventanas_propias_min: z.array(z.number().int().min(30).max(360)).min(1).max(6).nullable().optional().describe("Ventanas de vigilia propias en minutos; null vuelve a la referencia por edad"),
      alarmas_activas: z.boolean().optional(),
      rol: z.object({ miembro: z.string().describe("Nombre del cuidador"), rol: z.enum(["admin", "cuidador", "limitado"]) }).optional(),
    }),
  }, conCtx("cambiar_configuracion", async (ctx, a: Record<string, unknown> & { rol?: { miembro: string; rol: "admin" | "cuidador" | "limitado" }; ventanas_propias_min?: number[] | null }) => {
    soloAdmin(ctx, "cambiar la configuración del hogar");
    const { data: s } = await ctx.db.from("household_settings").select("*").eq("household_id", ctx.hogarId).single();
    if (!s) throw new ErrorMcp("ERROR", "No pudimos leer los ajustes.");
    const MAPA: Record<string, keyof typeof s> = {
      unidad_volumen: "unidad_volumen", unidad_peso: "unidad_peso", unidad_longitud: "unidad_longitud", zona_horaria: "zona_horaria",
      modo_noche: "noche_ui_modo", modo_noche_desde: "noche_ui_desde", modo_noche_hasta: "noche_ui_hasta",
      sueno_noche_desde: "sueno_noche_desde", sueno_noche_hasta: "sueno_noche_hasta", hora_dormir: "hora_dormir", alarmas_activas: "alarmas_activas",
    };
    const cambios: { campo: string; anterior: unknown; nuevo: unknown }[] = [];
    const upd: Record<string, unknown> = {};
    for (const [k, col] of Object.entries(MAPA)) {
      if (a[k] === undefined) continue;
      if (k === "zona_horaria") {
        try { new Intl.DateTimeFormat("es", { timeZone: String(a[k]) }); } catch { throw new ErrorMcp("VALIDACION", "Esa zona horaria no existe. Usa un nombre como America/Guatemala."); }
      }
      const anterior = typeof s[col] === "string" && /^\d\d:\d\d:\d\d$/.test(String(s[col])) ? String(s[col]).slice(0, 5) : s[col];
      if (anterior === a[k]) continue;
      upd[col] = a[k];
      cambios.push({ campo: k, anterior, nuevo: a[k] });
    }
    if (a.ventanas_propias_min !== undefined) {
      upd.ventanas_propias = a.ventanas_propias_min;
      upd.ventanas_modo = a.ventanas_propias_min ? "propias" : "auto";
      cambios.push({ campo: "ventanas_propias_min", anterior: s.ventanas_modo === "propias" ? s.ventanas_propias : null, nuevo: a.ventanas_propias_min });
    }
    if (Object.keys(upd).length) {
      upd.editado_en = new Date(ctx.ahora).toISOString();
      const { error } = await ctx.db.from("household_settings").update(upd as never).eq("household_id", ctx.hogarId);
      if (error) throw errorDeBase(error, "cambiar los ajustes");
    }
    if (a.rol) {
      const { data: ms } = await ctx.db.from("members").select("id, nombre_visible, rol, user_id").eq("household_id", ctx.hogarId);
      const m = (ms ?? []).filter((x) => x.nombre_visible.toLowerCase().includes(a.rol!.miembro.toLowerCase()));
      if (m.length !== 1) throw new ErrorMcp(m.length ? "VALIDACION" : "NO_ENCONTRADO", m.length ? `Hay varias personas que coinciden: ${m.map((x) => x.nombre_visible).join(", ")}. Dime el nombre completo.` : `No encontré a «${a.rol.miembro}» en el hogar.`);
      if (m[0].rol !== a.rol.rol) {
        const { error } = await ctx.db.from("members").update({ rol: a.rol.rol }).eq("id", m[0].id);
        if (error) throw new ErrorMcp("VALIDACION", error.message.includes("admin") ? "El hogar necesita al menos una persona que lo administre." : "No pudimos cambiar el rol.");
        cambios.push({ campo: `rol de ${m[0].nombre_visible}`, anterior: m[0].rol, nuevo: a.rol.rol });
      }
    }
    if (!cambios.length) return ok("No había nada que cambiar: los valores ya eran esos.", { cambios: [], como_revertir: null });
    const revertir = `Para revertir, llama cambiar_configuracion con: ${cambios.map((c) => `${c.campo} = ${JSON.stringify(c.anterior)}`).join(", ")}.`;
    return ok(`Listo. ${cambios.map((c) => `${c.campo}: ${JSON.stringify(c.anterior)} → ${JSON.stringify(c.nuevo)}`).join("; ")}.\n${revertir}`, { cambios, como_revertir: revertir });
  }));

  server.registerTool("invitar_cuidador", {
    title: "Invitar a un cuidador",
    description: "Crea una invitación de un solo uso (vence en 7 días) para un correo con un rol. Solo quien administra. Devuelve el enlace para compartir.",
    inputSchema: z.object({ email: z.string().email(), rol: z.enum(["admin", "cuidador", "limitado"]) }),
  }, conCtx("invitar_cuidador", async (ctx, a: { email: string; rol: "admin" | "cuidador" | "limitado" }) => {
    soloAdmin(ctx, "invitar cuidadores");
    const { data: token, error } = await ctx.db.rpc("crear_invitacion", { p_household: ctx.hogarId, p_email: a.email.trim().toLowerCase(), p_rol: a.rol });
    if (error || !token) throw errorDeBase(error, "crear la invitación");
    const enlace = `${appUrl()}/invitacion/${token}`;
    const vence = new Date(ctx.ahora + 7 * 86_400_000).toISOString();
    return ok(`Invitación creada para ${a.email} como ${ROL_TXT[a.rol]}. Compártele este enlace (vence en 7 días y sirve una sola vez):\n${enlace}`, { email: a.email, rol: a.rol, enlace, vence_en: vence });
  }));
}
