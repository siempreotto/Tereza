import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { contexto } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { Consentimiento } from "./Consentimiento";

export const metadata: Metadata = { title: "Conectar tu asistente · Tereza", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Solo se entregan códigos a asistentes conocidos (Claude y ChatGPT, en web, escritorio y móvil)
// o a un cliente local en loopback (Claude Code, MCP Inspector). Se pueden sumar orígenes con MCP_ALLOWED_REDIRECT_ORIGINS.
const ASISTENTES: Record<string, string> = { "https://claude.ai": "Claude", "https://claude.com": "Claude", "https://chatgpt.com": "ChatGPT", "https://chat.openai.com": "ChatGPT" };
const PERMITIDOS = [...Object.keys(ASISTENTES), ...(process.env.MCP_ALLOWED_REDIRECT_ORIGINS ?? "").split(",").map((x) => x.trim()).filter(Boolean)];
function destinoPermitido(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)) return true;
    return u.protocol === "https:" && PERMITIDOS.includes(u.origin);
  } catch {
    return false;
  }
}

/** Nombre del asistente según a dónde vuelve el código (el nombre que registra el cliente no es confiable). */
function asistenteDe(raw: string, registrado?: string) {
  try { return ASISTENTES[new URL(raw).origin] ?? (registrado || "Tu asistente"); } catch { return registrado || "Tu asistente"; }
}

const PUEDE = {
  admin: ["Registrar y corregir sueño, tomas, pañales, medicamentos, temperatura y notas.", "Consultar el día, resúmenes, patrones y la estimación del próximo sueño.", "Ver y anotar crecimiento, dudas y la próxima cita.", "Cambiar ajustes del hogar e invitar cuidadores (siempre te dice cómo revertirlo)."],
  cuidador: ["Registrar y corregir sueño, tomas, pañales, medicamentos, temperatura y notas.", "Consultar el día, resúmenes, patrones y la estimación del próximo sueño.", "Ver y anotar crecimiento, dudas y la próxima cita."],
  limitado: ["Registrar sueño, tomas y pañales.", "Ver cómo va el día de hoy."],
};

export default async function Consent({ searchParams }: { searchParams: Promise<{ authorization_id?: string }> }) {
  const raw = (await searchParams).authorization_id;
  const id = typeof raw === "string" && /^[\w-]{1,100}$/.test(raw) ? raw : null;
  if (!id) return <Mensaje titulo="Enlace no válido" texto="Vuelve a conectar Tereza desde tu asistente (Claude o ChatGPT) para generar una solicitud nueva." />;
  const c = await contexto();
  if (!c) redirect(`/entrar?next=${encodeURIComponent(`/oauth/consent?authorization_id=${id}`)}`);
  if (!c.miembro) return <Mensaje titulo="Primero crea tu hogar" texto="Entra a Tereza, crea tu hogar o acepta una invitación, y luego vuelve a conectar desde tu asistente." />;
  const db = await supabaseServer();
  const { data, error } = await db.auth.oauth.getAuthorizationDetails(id);
  if (error || !data) return <Mensaje titulo="La solicitud venció" texto="Las solicitudes duran unos minutos. Vuelve a conectar Tereza desde tu asistente." />;
  if (!("authorization_id" in data)) {
    if (!destinoPermitido(data.redirect_url)) return <Mensaje titulo="Destino no permitido" texto="Esta conexión no va a Claude ni a ChatGPT. Por seguridad, no se completó." />;
    redirect(data.redirect_url);
  }
  if (!destinoPermitido(data.redirect_uri)) return <Mensaje titulo="Destino no permitido" texto="Esta solicitud no viene de Claude ni de ChatGPT. Si alguien te mandó este enlace, no lo uses." />;
  return (
    <Marco>
      <Consentimiento id={id} clienteId={data.client?.id ?? ""} cliente={asistenteDe(data.redirect_uri, data.client?.name)} destino={new URL(data.redirect_uri).host} correo={c.email ?? ""} hogar={c.hogar?.nombre ?? ""} rol={c.miembro.rol} puede={PUEDE[c.miembro.rol]} />
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="tz-screen" data-theme="light">
      <div className="tz-app solo"><main className="tz-main solo" style={{ gap: 20, minHeight: "100dvh", justifyContent: "center" }}>{children}</main></div>
    </div>
  );
}
function Mensaje({ titulo, texto }: { titulo: string; texto: string }) {
  return <Marco><section className="tz-card tz-glass tz-stack" style={{ gap: 8 }}><h1 className="text-title-lg">{titulo}</h1><p className="text-body tz-muted">{texto}</p></section></Marco>;
}
