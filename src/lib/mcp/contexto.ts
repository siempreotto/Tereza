import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { AuthInfo } from "@modelcontextprotocol/server";
import type { Database } from "@/lib/db/types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Ajustes } from "@/lib/datos/hoy";
import type { UnidadLongitud, UnidadPeso, UnidadVolumen } from "@/lib/core/unidades";

export type Bebe = { id: string; nombre: string; fecha_nacimiento: string; semanas_gestacion: number | null; sexo: string };
export type Ctx = {
  db: ReturnType<typeof createClient<Database>>;
  userId: string;
  clientId: string;
  rol: "admin" | "cuidador" | "limitado";
  nombre: string;
  hogarId: string;
  hogarNombre: string;
  ajustes: Ajustes;
  bebes: Bebe[];
  ahora: number;
};

export class ErrorMcp extends Error {
  constructor(public codigo: "PERMISO" | "BEBE_AMBIGUO" | "NO_ENCONTRADO" | "CONFLICTO" | "VALIDACION" | "SIN_HOGAR" | "REVOCADO" | "ERROR", mensaje: string) {
    super(mensaje);
  }
}

const hhmm = (t: string) => t.slice(0, 5);

/** Contexto por llamada: cliente de Supabase con el token del usuario (RLS), su hogar, rol, ajustes y bebés. */
export async function crearContexto(auth: AuthInfo | undefined): Promise<Ctx> {
  const userId = auth?.extra?.userId as string | undefined;
  if (!auth || !userId) throw new ErrorMcp("PERMISO", "Sesión no válida. Vuelve a conectar Tereza en Claude.");
  const db = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${auth.token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [{ data: revocado }, { data: m }] = await Promise.all([
    db.from("mcp_revocados").select("client_id").eq("client_id", auth.clientId).maybeSingle(),
    db.from("members").select("nombre_visible, rol, household_id, households(nombre)").eq("user_id", userId).order("creado_en").limit(1).maybeSingle(),
  ]);
  if (revocado) throw new ErrorMcp("REVOCADO", "Esta conexión con Claude fue revocada desde la app. Vuelve a conectarla en Más › Conexión con Claude.");
  if (!m) throw new ErrorMcp("SIN_HOGAR", "Tu cuenta todavía no tiene hogar en Tereza. Entra a la app para crearlo o acepta una invitación.");
  const [{ data: s }, { data: bebes }] = await Promise.all([
    db.from("household_settings").select("*").eq("household_id", m.household_id).single(),
    db.from("babies").select("id, nombre, fecha_nacimiento, semanas_gestacion, sexo").eq("household_id", m.household_id).eq("activo", true).order("creado_en"),
  ]);
  if (!s) throw new ErrorMcp("ERROR", "No pudimos leer los ajustes del hogar.");
  return {
    db, userId, clientId: auth.clientId, rol: m.rol, nombre: m.nombre_visible, hogarId: m.household_id, hogarNombre: m.households?.nombre ?? "",
    ajustes: {
      tz: s.zona_horaria, nocheDesde: hhmm(s.sueno_noche_desde), nocheHasta: hhmm(s.sueno_noche_hasta), horaDormir: hhmm(s.hora_dormir),
      ventanasModo: s.ventanas_modo as "auto" | "propias", ventanasPropias: s.ventanas_propias,
      unidadVolumen: s.unidad_volumen as UnidadVolumen, unidadPeso: s.unidad_peso as UnidadPeso, unidadLongitud: s.unidad_longitud as UnidadLongitud,
      nocheUiModo: s.noche_ui_modo as "auto" | "on" | "off", nocheUiDesde: hhmm(s.noche_ui_desde), nocheUiHasta: hhmm(s.noche_ui_hasta), alarmasActivas: s.alarmas_activas,
    },
    bebes: bebes ?? [],
    ahora: Date.now(),
  };
}

/** Si hay un solo bebé activo se infiere; si hay varios y no se indica, error que pide aclarar. */
export function bebeDe(ctx: Ctx, babyId?: string | null): Bebe {
  if (babyId) {
    const b = ctx.bebes.find((x) => x.id === babyId || x.nombre.toLowerCase() === babyId.toLowerCase());
    if (!b) throw new ErrorMcp("NO_ENCONTRADO", `No encontré ese bebé. En el hogar están: ${ctx.bebes.map((x) => x.nombre).join(", ")}.`);
    return b;
  }
  if (ctx.bebes.length === 1) return ctx.bebes[0];
  if (!ctx.bebes.length) throw new ErrorMcp("NO_ENCONTRADO", "El hogar todavía no tiene bebé registrado. Agrégalo desde la app.");
  throw new ErrorMcp("BEBE_AMBIGUO", `Hay ${ctx.bebes.length} bebés en el hogar (${ctx.bebes.map((b) => `${b.nombre}: ${b.id}`).join("; ")}). ¿De cuál se trata? Repite con baby_id.`);
}

export function soloSalud(ctx: Ctx) {
  if (ctx.rol === "limitado") throw new ErrorMcp("PERMISO", "Tu rol (limitado) permite registrar y ver sueño, tomas y pañales de hoy. Salud, medicamentos y días anteriores los ve quien administra el hogar o un cuidador.");
}
export function soloAdmin(ctx: Ctx, que: string) {
  if (ctx.rol !== "admin") throw new ErrorMcp("PERMISO", `Solo quien administra el hogar puede ${que}.`);
}
