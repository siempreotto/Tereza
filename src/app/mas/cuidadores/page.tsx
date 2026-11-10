import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/tz";
import { requiereHogar } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { Invitar } from "./Invitar";

export const metadata: Metadata = { title: "Cuidadores · Tereza" };
export const dynamic = "force-dynamic";

const ROL = { admin: "Admin", cuidador: "Cuidador", limitado: "Limitado" } as const;

export default async function Cuidadores() {
  const c = await requiereHogar();
  if (c.miembro.rol !== "admin") redirect("/");
  const db = await supabaseServer();
  const [{ data: miembros }, { data: invitaciones }] = await Promise.all([
    db.from("members").select("id, nombre_visible, rol, user_id").eq("household_id", c.hogar.id).order("creado_en"),
    db.from("invites").select("id, email, rol, vence_en").eq("household_id", c.hogar.id).is("aceptada_en", null).gt("vence_en", new Date().toISOString()).order("creada_en", { ascending: false }),
  ]);
  return (
    <div className="tz-screen" data-theme="light">
      <main className="tz-main">
        <div className="tz-pagehead">
          <Link className="tz-back" href="/"><Icon name="chevron-left" />Inicio</Link>
          <h1 className="text-title-lg">Cuidadores y roles</h1>
          <p className="text-body-sm tz-muted">Cada persona entra con su propia cuenta y ve solo lo que su rol permite.</p>
        </div>
        <section className="tz-stack" aria-label="Personas del hogar">
          <h2 className="text-title">En {c.hogar.nombre}</h2>
          <ul className="tz-list tz-glass" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {(miembros ?? []).map((m) => (
              <li key={m.id} className="tz-row">
                <span className="tz-avatar sm" aria-hidden>{m.nombre_visible.charAt(0)}</span>
                <span className="grow"><span className="text-body-strong">{m.nombre_visible}{m.user_id === c.userId ? " (tú)" : ""}</span></span>
                <span className="tz-tag">{ROL[m.rol]}</span>
              </li>
            ))}
          </ul>
        </section>
        {invitaciones?.length ? (
          <section className="tz-stack" aria-label="Invitaciones pendientes">
            <h2 className="text-title">Invitaciones pendientes</h2>
            <ul className="tz-list tz-glass" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {invitaciones.map((i) => (
                <li key={i.id} className="tz-row">
                  <span className="grow"><span className="text-body-strong">{i.email}</span><span className="text-body-sm tz-muted">{ROL[i.rol]} · vence el {new Date(i.vence_en).toLocaleDateString("es", { day: "numeric", month: "long" })}</span></span>
                </li>
              ))}
            </ul>
            <p className="tz-help">Por seguridad, el enlace solo se muestra al crearlo. Si se perdió, crea otra invitación.</p>
          </section>
        ) : null}
        <Invitar />
      </main>
    </div>
  );
}
