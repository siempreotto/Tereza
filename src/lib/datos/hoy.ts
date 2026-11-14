import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { Evento } from "@/lib/core/eventos";
import type { Hogar } from "@/lib/core/sueno";
import { inicioDia, sumarDias } from "@/lib/core/tiempo";
import type { UnidadLongitud, UnidadPeso, UnidadVolumen } from "@/lib/core/unidades";

export type Ajustes = Hogar & {
  unidadVolumen: UnidadVolumen; unidadPeso: UnidadPeso; unidadLongitud: UnidadLongitud;
  nocheUiModo: "auto" | "on" | "off"; nocheUiDesde: string; nocheUiHasta: string; alarmasActivas: boolean;
};

const hhmm = (t: string) => t.slice(0, 5);

export async function ajustesDelHogar(hogarId: string): Promise<Ajustes> {
  const db = await supabaseServer();
  const { data: s } = await db.from("household_settings").select("*").eq("household_id", hogarId).single();
  if (!s) throw new Error("Sin ajustes del hogar");
  return {
    tz: s.zona_horaria, nocheDesde: hhmm(s.sueno_noche_desde), nocheHasta: hhmm(s.sueno_noche_hasta), horaDormir: hhmm(s.hora_dormir),
    ventanasModo: s.ventanas_modo as "auto" | "propias", ventanasPropias: s.ventanas_propias,
    unidadVolumen: s.unidad_volumen as UnidadVolumen, unidadPeso: s.unidad_peso as UnidadPeso, unidadLongitud: s.unidad_longitud as UnidadLongitud,
    nocheUiModo: s.noche_ui_modo as "auto" | "on" | "off", nocheUiDesde: hhmm(s.noche_ui_desde), nocheUiHasta: hhmm(s.noche_ui_hasta), alarmasActivas: s.alarmas_activas,
  };
}

/** Eventos de los últimos `dias` días locales (para Hoy y el predictor), sin eliminados, más los activos. */
export async function eventosRecientes(babyId: string, tz: string, dias = 8, ahora = Date.now()): Promise<Evento[]> {
  const db = await supabaseServer();
  const desde = new Date(sumarDias(inicioDia(ahora, tz), -dias, tz)).toISOString();
  const { data } = await db
    .from("events")
    .select("id, tipo, started_at, ended_at, payload, notas, logged_by, source, version, eliminado_en")
    .eq("baby_id", babyId)
    .is("eliminado_en", null)
    .or(`started_at.gte.${desde},ended_at.is.null`)
    .order("started_at", { ascending: false })
    .limit(600);
  return (data ?? []) as Evento[];
}

export async function nombresMiembros(hogarId: string): Promise<Record<string, string>> {
  const db = await supabaseServer();
  const { data } = await db.from("members").select("user_id, nombre_visible").eq("household_id", hogarId);
  return Object.fromEntries((data ?? []).map((m) => [m.user_id, m.nombre_visible]));
}

export async function tratamientosActivos(babyId: string): Promise<{ id: string; nombre: string; indicacion: string }[]> {
  const db = await supabaseServer();
  const { data } = await db.from("medications").select("id, nombre, indicacion_textual").eq("baby_id", babyId).eq("activo", true).order("creado_en");
  return (data ?? []).map((m) => ({ id: m.id, nombre: m.nombre, indicacion: m.indicacion_textual }));
}

/** Eventos que se cruzan con [desde, hasta) (incluye sueños que empezaron antes y terminan dentro). */
export async function eventosRango(babyId: string, desde: number, hasta: number): Promise<Evento[]> {
  const db = await supabaseServer();
  const d = new Date(desde - 24 * 3_600_000).toISOString(), h = new Date(hasta).toISOString();
  const { data } = await db
    .from("events")
    .select("id, tipo, started_at, ended_at, payload, notas, logged_by, source, version, eliminado_en")
    .eq("baby_id", babyId)
    .is("eliminado_en", null)
    .gte("started_at", d)
    .lt("started_at", h)
    .order("started_at", { ascending: false })
    .limit(3000);
  return (data ?? []) as Evento[];
}

/** Página con barra: hogar, ajustes y bebé, o redirige. Para Diario, Patrones, Resumen y Salud. */
export async function paginaConBebe(opciones: { soloSalud?: boolean } = {}) {
  const { requiereHogar } = await import("@/lib/auth/session");
  const { redirect } = await import("next/navigation");
  const c = await requiereHogar();
  if (opciones.soloSalud && c.miembro.rol === "limitado") redirect("/");
  const bebe = c.bebes[0];
  if (!bebe) redirect("/");
  const ajustes = await ajustesDelHogar(c.hogar.id);
  return { c, bebe, ajustes };
}

/** Hora del servidor para la página (fuera del componente, para que el render sea puro). */
export function ahoraMs(): number {
  return Date.now();
}
