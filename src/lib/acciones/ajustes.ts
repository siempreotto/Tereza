"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contexto } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import type { Resultado } from "./hogar";

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa una hora válida");
const Ajustes = z.object({
  unidad_volumen: z.enum(["ml", "oz"]),
  unidad_peso: z.enum(["kg", "lb"]),
  unidad_longitud: z.enum(["cm", "in"]),
  zona_horaria: z.string().min(3).max(60),
  noche_ui_modo: z.enum(["auto", "on", "off"]),
  noche_ui_desde: HHMM, noche_ui_hasta: HHMM,
  sueno_noche_desde: HHMM, sueno_noche_hasta: HHMM,
  hora_dormir: HHMM,
  plan_modo: z.enum(["auto", "fijo"]),
  plan_fijo: z.object({
    despertar: HHMM,
    siestas: z.array(z.object({ inicio: HHMM, duracion_min: z.number().int().min(10).max(240) })).max(4),
    dormir: HHMM,
  }).nullable(),
});
export type AjustesInput = z.input<typeof Ajustes>;

/** Guarda los ajustes del hogar (solo quien administra; RLS también lo exige). */
export async function guardarAjustes(input: AjustesInput): Promise<Resultado> {
  const p = Ajustes.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisa los datos" };
  const c = await contexto();
  if (!c?.hogar || !c.miembro) return { ok: false, error: "Tu sesión venció. Vuelve a entrar." };
  if (c.miembro.rol !== "admin") return { ok: false, error: "Solo quien administra el hogar puede cambiar los ajustes." };
  const v = p.data;
  try { new Intl.DateTimeFormat("es", { timeZone: v.zona_horaria }); } catch { return { ok: false, error: "Esa zona horaria no existe." }; }
  if (v.plan_modo === "fijo") {
    if (!v.plan_fijo) return { ok: false, error: "Completa tu horario fijo." };
    const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    let previo = min(v.plan_fijo.despertar);
    for (const [i, s] of v.plan_fijo.siestas.entries()) {
      if (min(s.inicio) <= previo) return { ok: false, error: `La siesta ${i + 1} tiene que empezar después de ${i ? `que termine la siesta ${i}` : "despertar"}.` };
      previo = min(s.inicio) + s.duracion_min;
    }
    if (min(v.plan_fijo.dormir) <= previo) return { ok: false, error: "La hora de dormir tiene que ser después de la última siesta." };
  }
  const db = await supabaseServer();
  const { error } = await db.from("household_settings").update({ ...v, editado_en: new Date().toISOString() }).eq("household_id", c.hogar.id);
  if (error) return { ok: false, error: "No pudimos guardar los ajustes. Vuelve a intentarlo." };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
