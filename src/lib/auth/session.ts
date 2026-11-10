import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";

export type Rol = Database["public"]["Enums"]["rol_miembro"];
export type Contexto = {
  userId: string;
  email: string;
  miembro: { id: string; nombre: string; rol: Rol } | null;
  hogar: { id: string; nombre: string } | null;
  bebes: { id: string; nombre: string; fecha_nacimiento: string; semanas_gestacion: number | null; sexo: string }[];
};

// Usuario, hogar y bebés de la sesión actual (una vez por request).
export const contexto = cache(async (): Promise<Contexto | null> => {
  const db = await supabaseServer();
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: m } = await db
    .from("members")
    .select("id, nombre_visible, rol, household_id, households(id, nombre)")
    .eq("user_id", user.id)
    .order("creado_en")
    .limit(1)
    .maybeSingle();
  const hogar = m?.households ? { id: m.households.id, nombre: m.households.nombre } : null;
  const { data: bebes } = hogar
    ? await db.from("babies").select("id, nombre, fecha_nacimiento, semanas_gestacion, sexo").eq("household_id", hogar.id).eq("activo", true).order("creado_en")
    : { data: [] };
  return {
    userId: user.id,
    email: user.email ?? "",
    miembro: m ? { id: m.id, nombre: m.nombre_visible, rol: m.rol } : null,
    hogar,
    bebes: bebes ?? [],
  };
});

// Para páginas que necesitan hogar: sin sesión → /entrar; sin hogar → /bienvenida.
export async function requiereHogar(): Promise<Contexto & { miembro: NonNullable<Contexto["miembro"]>; hogar: NonNullable<Contexto["hogar"]> }> {
  const c = await contexto();
  if (!c) redirect("/entrar");
  if (!c.miembro || !c.hogar) redirect("/bienvenida");
  return c as Contexto & { miembro: NonNullable<Contexto["miembro"]>; hogar: NonNullable<Contexto["hogar"]> };
}
