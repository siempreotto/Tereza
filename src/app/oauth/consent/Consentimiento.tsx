"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const ROL = { admin: "administras el hogar", cuidador: "eres cuidador", limitado: "tienes acceso limitado" } as const;

// Aprobar o rechazar que el asistente (Claude o ChatGPT) use Tereza a nombre de esta persona, con los permisos de su rol.
export function Consentimiento({ id, clienteId, cliente, destino, correo, hogar, rol, puede }: { id: string; clienteId: string; cliente: string; destino: string; correo: string; hogar: string; rol: keyof typeof ROL; puede: string[] }) {
  const [ocupado, setOcupado] = useState<"si" | "no" | null>(null);
  const [error, setError] = useState("");
  async function decidir(k: "si" | "no") {
    setOcupado(k); setError("");
    const sb = supabaseBrowser();
    const o = sb.auth.oauth;
    // Si antes se había revocado este cliente, volver a permitirlo quita el bloqueo.
    if (k === "si" && clienteId) await sb.from("mcp_revocados").delete().eq("client_id", clienteId);
    const { data, error: e } = k === "si" ? await o.approveAuthorization(id, { skipBrowserRedirect: true }) : await o.denyAuthorization(id, { skipBrowserRedirect: true });
    if (e || !data?.redirect_url) { setOcupado(null); setError("No se pudo completar. La solicitud pudo haber vencido: vuelve a conectar desde tu asistente."); return; }
    window.location.href = data.redirect_url;
  }
  return (
    <section className="tz-card tz-glass tz-stack" style={{ gap: 16, maxWidth: 480, width: "100%", margin: "0 auto" }} aria-labelledby="c-t">
      <p className="tz-logo">Tereza</p>
      <h1 id="c-t" className="text-title-lg">Conectar {cliente} con Tereza</h1>
      <p className="text-body">{cliente} podrá usar Tereza a tu nombre ({correo}) en «{hogar}», donde {ROL[rol]}.</p>
      <p className="text-body-sm">El acceso se entrega a <strong>{destino}</strong>.</p>
      <ul className="tz-stack" style={{ gap: 8, paddingLeft: 20, margin: 0 }}>
        {puede.map((p) => <li key={p} className="text-body">{p}</li>)}
      </ul>
      <p className="text-body-sm tz-muted">Con medicamentos solo registra: nunca sugiere ni calcula dosis. Cada registro queda marcado «desde un asistente». Puedes revocarlo cuando quieras en Más › Conexión con asistentes.</p>
      {error ? <p role="alert" className="text-body-sm" style={{ color: "var(--danger)" }}>{error}</p> : null}
      <div className="tz-h s8">
        <button type="button" className="tz-btn tz-btn-glass text-button" style={{ flex: 1 }} disabled={!!ocupado} onClick={() => decidir("no")}>{ocupado === "no" ? "Cancelando…" : "No permitir"}</button>
        <button type="button" className="tz-btn tz-btn-primary text-button" style={{ flex: 1 }} disabled={!!ocupado} onClick={() => decidir("si")}>{ocupado === "si" ? "Conectando…" : "Permitir"}</button>
      </div>
    </section>
  );
}
