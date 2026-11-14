import Link from "next/link";
import { headers } from "next/headers";
import { requiereHogar } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ahoraMs, ajustesDelHogar } from "@/lib/datos/hoy";
import { Pantalla } from "@/components/hoy/Pantalla";
import { fFecha, fHace, fHora } from "@/lib/core/tiempo";
import { Revocar } from "./Revocar";
import { CopiarUrl } from "./CopiarUrl";

export const dynamic = "force-dynamic";

export default async function ConexionClaude() {
  const c = await requiereHogar();
  const a = await ajustesDelHogar(c.hogar.id);
  const db = await supabaseServer();
  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const url = `${origen}/api/mcp`;
  const [grants, usos, revocados, miembros] = await Promise.all([
    db.auth.oauth.listGrants().then((r) => r.data ?? []).catch(() => []),
    db.from("mcp_audit").select("user_id, client_id, creado_en").eq("household_id", c.hogar.id).order("creado_en", { ascending: false }).limit(500),
    db.from("mcp_revocados").select("client_id"),
    db.from("members").select("user_id, nombre_visible").eq("household_id", c.hogar.id),
  ]);
  const bloqueados = new Set((revocados.data ?? []).map((r) => r.client_id));
  const ultimo = new Map<string, string>();
  for (const u of usos.data ?? []) { const k = `${u.user_id}|${u.client_id}`; if (!ultimo.has(k)) ultimo.set(k, u.creado_en); }
  const nombre = Object.fromEntries((miembros.data ?? []).map((m) => [m.user_id, m.nombre_visible]));
  const mias = grants.filter((g) => !bloqueados.has(g.client.id));
  const otros = c.miembro.rol === "admin" ? [...ultimo.entries()].filter(([k]) => !k.startsWith(c.userId)) : [];
  const ahora = ahoraMs();
  const bebe = c.bebes[0];
  if (!bebe) redirect("/");
  return (
    <Pantalla ajustes={a} activa="mas" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <Link href="/mas" className="text-body-sm tz-muted">‹ Más</Link>
        <h1 className="text-title-lg">Conexión con Claude</h1>
        <section className="tz-card tz-glass tz-stack" style={{ gap: 10 }} aria-labelledby="c-como">
          <h2 id="c-como" className="text-title-sm">Cómo conectarla</h2>
          <ol className="tz-stack" style={{ gap: 6, paddingLeft: 20, margin: 0 }}>
            <li className="text-body">En Claude abre Ajustes › Conectores › Agregar conector personalizado.</li>
            <li className="text-body">Pega esta dirección: <code style={{ wordBreak: "break-all" }}>{url}</code> <CopiarUrl texto={url} /></li>
            <li className="text-body">Entra con tu cuenta de Tereza y toca «Permitir».</li>
          </ol>
          <p className="text-body-sm tz-muted">En Claude Code: <code style={{ wordBreak: "break-all" }}>claude mcp add --transport http tereza {url}</code></p>
          <p className="text-body-sm tz-muted">Prueba con: «Lucía se durmió a las 2», «¿cuándo fue la última toma?», «dale 4 oz de fórmula hace 20 minutos», «¿cómo durmió esta semana comparada con la anterior?», «anota para el pediatra que tose de noche».</p>
        </section>
        <section className="tz-stack" style={{ gap: 8 }} aria-labelledby="c-mias">
          <h2 id="c-mias" className="text-title-sm">Tus conexiones</h2>
          {mias.length ? (
            <ul className="tz-list tz-glass">
              {mias.map((g) => {
                const u = ultimo.get(`${c.userId}|${g.client.id}`);
                return (
                  <li key={g.client.id} className="tz-row">
                    <span className="grow"><span className="text-body-strong">{g.client.name || "Claude"}</span><span className="text-body-sm tz-muted">Conectado el {fFecha(new Date(g.granted_at).getTime(), a.tz).toLowerCase()}{u ? ` · último uso ${fHace(new Date(u).getTime(), ahora)}` : " · sin uso todavía"}</span></span>
                    <Revocar clienteId={g.client.id} nombre={g.client.name || "Claude"} />
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-body tz-muted">Todavía no conectas Tereza con Claude.</p>}
        </section>
        {otros.length ? (
          <section className="tz-stack" style={{ gap: 8 }} aria-labelledby="c-otros">
            <h2 id="c-otros" className="text-title-sm">Otros cuidadores que usan Claude</h2>
            <ul className="tz-list tz-glass">
              {otros.map(([k, cuando]) => (
                <li key={k} className="tz-row"><span className="grow"><span className="text-body-strong">{nombre[k.split("|")[0]] ?? "Cuidador"}</span><span className="text-body-sm tz-muted">Último uso {fFecha(new Date(cuando).getTime(), a.tz).toLowerCase()}, {fHora(new Date(cuando).getTime(), a.tz)}</span></span></li>
              ))}
            </ul>
            <p className="text-body-sm tz-muted">Cada persona revoca su propia conexión. Si quieres quitarle el acceso a alguien, cambia su rol o sácalo del hogar en Cuidadores y roles.</p>
          </section>
        ) : null}
      </main>
    </Pantalla>
  );
}
