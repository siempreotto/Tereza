"use server";

import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/env";
import type { Resultado } from "./hogar";

// Eliminar la cuenta: borrado real. Si eres el único miembro de un hogar, el hogar se borra completo (bebés,
// registros, salud y adjuntos). Si compartes el hogar, tus registros quedan para la familia sin autor.
// La llave secreta se usa solo aquí, en el servidor, para borrar el usuario de Auth.
export async function eliminarCuenta(input: { confirmacion: string }): Promise<Resultado<{ hogaresBorrados: number }>> {
  if (input.confirmacion.trim().toUpperCase() !== "ELIMINAR") return { ok: false, error: "Escribe ELIMINAR para confirmar." };
  const secreta = process.env.SUPABASE_SECRET_KEY;
  if (!secreta) return { ok: false, error: "Eliminar la cuenta no está disponible en este momento." };
  const db = await supabaseServer();
  const { data: u } = await db.auth.getUser();
  if (!u.user) return { ok: false, error: "Tu sesión venció. Vuelve a entrar." };
  const { data: sit, error: e0 } = await db.rpc("mi_situacion_para_eliminar");
  if (e0) return { ok: false, error: "No pudimos revisar tu cuenta. Vuelve a intentarlo." };
  const bloqueo = (sit ?? []).find((h) => h.rol === "admin" && h.admins === 1 && h.miembros > 1);
  if (bloqueo) return { ok: false, error: `Eres quien administra «${bloqueo.nombre}» y hay más personas. Antes nombra a otra persona como admin en Más › Cuidadores y roles.` };
  // Adjuntos de visitas de los hogares que se van a borrar (Storage no se borra en cascada).
  const propios = (sit ?? []).filter((h) => h.miembros === 1).map((h) => h.household_id);
  for (const h of propios) {
    const { data: carpetas } = await db.storage.from("visitas").list(h, { limit: 1000 });
    for (const c of carpetas ?? []) {
      const { data: arch } = await db.storage.from("visitas").list(`${h}/${c.name}`, { limit: 1000 });
      const rutas = (arch ?? []).map((a) => `${h}/${c.name}/${a.name}`);
      if (rutas.length) await db.storage.from("visitas").remove(rutas);
    }
  }
  const { data: n, error: e1 } = await db.rpc("borrar_hogares_propios");
  if (e1) return { ok: false, error: "No pudimos borrar tu hogar. Vuelve a intentarlo." };
  const admin = createClient(SUPABASE_URL, secreta, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: e2 } = await admin.auth.admin.deleteUser(u.user.id);
  if (e2) return { ok: false, error: "Borramos tus datos pero no la cuenta. Vuelve a intentarlo." };
  await db.auth.signOut().catch(() => undefined);
  return { ok: true, data: { hogaresBorrados: n ?? 0 } };
}
