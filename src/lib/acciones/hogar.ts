"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { contexto } from "@/lib/auth/session";
import { ZONAS } from "@/lib/zonas";

export type Resultado<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const HogarYBebe = z.object({
  tuNombre: z.string().trim().min(1, "Escribe cómo te llamas").max(60),
  hogar: z.string().trim().min(1, "Ponle nombre al hogar").max(80),
  zona: z.enum(ZONAS.map((z) => z.id) as [string, ...string[]]),
  unidadVolumen: z.enum(["ml", "oz"]),
  unidadPeso: z.enum(["kg", "lb"]),
  unidadLongitud: z.enum(["cm", "in"]),
  bebe: z.object({
    nombre: z.string().trim().min(1, "Escribe el nombre del bebé").max(60),
    fechaNacimiento: z.iso.date("Revisa la fecha de nacimiento"),
    semanasGestacion: z.number().int().min(22).max(44).nullable(),
    sexo: z.enum(["F", "M"]),
  }),
});
export type HogarYBebeInput = z.input<typeof HogarYBebe>;

// Crea hogar (RPC crear_hogar: hogar + ajustes + admin) y el primer bebé.
export async function crearHogarYBebe(input: HogarYBebeInput): Promise<Resultado<{ hogarId: string }>> {
  const p = HogarYBebe.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisa los datos" };
  const v = p.data;
  const hoy = new Date().toISOString().slice(0, 10);
  if (v.bebe.fechaNacimiento > hoy) return { ok: false, error: "La fecha de nacimiento no puede ser futura." };
  const c = await contexto();
  if (!c) return { ok: false, error: "Tu sesión venció. Vuelve a entrar." };
  const db = await supabaseServer();
  let hogarId = c.hogar?.id;
  // Si ya tiene hogar (doble toque, recarga), no crea otro.
  if (!hogarId) {
    const { data, error } = await db.rpc("crear_hogar", {
      p_nombre: v.hogar, p_nombre_visible: v.tuNombre, p_zona_horaria: v.zona,
      p_unidad_volumen: v.unidadVolumen, p_unidad_peso: v.unidadPeso, p_unidad_longitud: v.unidadLongitud,
    });
    if (error || !data) return { ok: false, error: "No pudimos crear el hogar. Vuelve a intentarlo." };
    hogarId = data;
  }
  if (c.bebes.length === 0) {
    const { error } = await db.from("babies").insert({
      household_id: hogarId, nombre: v.bebe.nombre, fecha_nacimiento: v.bebe.fechaNacimiento,
      semanas_gestacion: v.bebe.semanasGestacion, sexo: v.bebe.sexo,
    });
    if (error) return { ok: false, error: "Creamos el hogar, pero no pudimos guardar al bebé. Vuelve a intentarlo." };
  }
  return { ok: true, data: { hogarId } };
}

const Invitacion = z.object({
  email: z.email("Revisa el correo: falta la @ o el dominio").trim().toLowerCase(),
  rol: z.enum(["admin", "cuidador", "limitado"]),
});

// Crea una invitación y devuelve el enlace para compartir (el token solo existe en este enlace).
export async function crearInvitacion(input: z.input<typeof Invitacion>): Promise<Resultado<{ enlace: string; email: string }>> {
  const p = Invitacion.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisa el correo" };
  const c = await contexto();
  if (!c?.hogar) return { ok: false, error: "Primero crea tu hogar." };
  if (c.miembro?.rol !== "admin") return { ok: false, error: "Solo quien administra el hogar puede invitar." };
  const db = await supabaseServer();
  const { data: token, error } = await db.rpc("crear_invitacion", { p_household: c.hogar.id, p_email: p.data.email, p_rol: p.data.rol });
  if (error || !token) return { ok: false, error: "No pudimos crear la invitación. Vuelve a intentarlo." };
  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  return { ok: true, data: { enlace: `${origen}/invitacion/${token}`, email: p.data.email } };
}

const Aceptar = z.object({ token: z.string().regex(/^[a-f0-9]{48}$/), nombre: z.string().trim().min(1, "Escribe cómo te llamas").max(60) });

export async function aceptarInvitacion(input: z.input<typeof Aceptar>): Promise<Resultado<{ hogarId: string }>> {
  const p = Aceptar.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "El enlace no es válido" };
  const db = await supabaseServer();
  const { data, error } = await db.rpc("aceptar_invitacion", { p_token: p.data.token, p_nombre_visible: p.data.nombre });
  if (error || !data) {
    // Los mensajes de la RPC ya están escritos para el cuidador (venció, otro correo, ya se usó).
    const conocido = error?.message && /invitaci|correo|sesión/i.test(error.message);
    return { ok: false, error: conocido ? error!.message : "No pudimos aceptar la invitación. Vuelve a intentarlo." };
  }
  return { ok: true, data: { hogarId: data } };
}
