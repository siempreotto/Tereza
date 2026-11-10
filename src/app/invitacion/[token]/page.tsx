import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { contexto } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { ROL_TEXTO_SERVIDOR } from "@/lib/roles";
import { AceptarForm } from "./AceptarForm";

export const metadata: Metadata = { title: "Invitación · Tereza", referrer: "no-referrer" };

type Info = { hogar: string; rol: "admin" | "cuidador" | "limitado"; email: string; invita: string | null; estado: "vigente" | "vencida" | "usada" };

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <div className="tz-screen" data-theme="light">
      <div className="tz-app solo">
        <main className="tz-main solo" style={{ gap: 20, minHeight: "100dvh" }}>
          <p className="tz-logo" style={{ padding: 0 }}>Tereza</p>
          {children}
        </main>
      </div>
    </div>
  );
}

export default async function Invitacion({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) {
    return <Pantalla><h1 className="text-title-lg">Este enlace no es válido</h1><p className="text-body tz-muted">Pide a quien te invitó que te mande uno nuevo.</p></Pantalla>;
  }
  const c = await contexto();
  if (!c) {
    return (
      <Pantalla>
        <div className="tz-stack s8" style={{ marginTop: 24 }}>
          <h1 className="text-display">Te invitaron a cuidar en Tereza</h1>
          <p className="text-body-lg tz-muted">Entra con el correo al que llegó la invitación para unirte al hogar.</p>
        </div>
        <div className="tz-stack" style={{ marginTop: "auto" }}>
          <Link className="tz-btn tz-btn-primary tz-btn-lg tz-btn-block text-button" href={`/entrar?next=${encodeURIComponent(`/invitacion/${token}`)}`}>Entrar para aceptar</Link>
        </div>
      </Pantalla>
    );
  }
  const db = await supabaseServer();
  const { data } = await db.rpc("ver_invitacion", { p_token: token });
  const info = data as Info | null;
  if (!info) return <Pantalla><h1 className="text-title-lg">No encontramos esta invitación</h1><p className="text-body tz-muted">Puede que la hayan cancelado. Pide a quien te invitó que te mande una nueva.</p></Pantalla>;
  if (info.estado === "usada") redirect("/");
  if (info.estado === "vencida") return <Pantalla><h1 className="text-title-lg">La invitación venció</h1><p className="text-body tz-muted">Duran 7 días. Pide a quien te invitó que te mande una nueva.</p></Pantalla>;
  const otroCorreo = info.email.toLowerCase() !== c.email.toLowerCase();
  return (
    <Pantalla>
      <div className="tz-stack s8" style={{ marginTop: 24 }}>
        <h1 className="text-title-lg">{info.invita ? `${info.invita} te invitó a «${info.hogar}»` : `Te invitaron a «${info.hogar}»`}</h1>
        <p className="text-body tz-muted">Tu rol: <strong>{info.rol === "admin" ? "Admin" : info.rol === "cuidador" ? "Cuidador" : "Limitado"}</strong>. {ROL_TEXTO_SERVIDOR[info.rol]}.</p>
      </div>
      {otroCorreo ? (
        <div className="tz-alert" role="note">
          <div className="tz-stack s4">
            <p className="text-body-strong tz-alert-title">Esta invitación es para otro correo</p>
            <p className="text-body-sm">Entraste como {c.email}. Sal y vuelve a entrar con el correo al que llegó la invitación.</p>
          </div>
        </div>
      ) : (
        <AceptarForm token={token} nombreSugerido={c.miembro?.nombre ?? ""} />
      )}
      {otroCorreo ? (
        <form action="/salir" method="post" style={{ marginTop: "auto" }}>
          <button className="tz-btn tz-btn-glass tz-btn-lg tz-btn-block text-button" type="submit">Salir y entrar con otro correo</button>
        </form>
      ) : null}
    </Pantalla>
  );
}
