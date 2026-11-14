"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Revoca el permiso en Supabase (borra sesiones y refresh tokens) y bloquea de inmediato los tokens vigentes.
export function Revocar({ clienteId, nombre }: { clienteId: string; nombre: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"" | "confirmar" | "ocupado" | "error">("");
  async function revocar() {
    setEstado("ocupado");
    const sb = supabaseBrowser();
    const { error: e1 } = await sb.from("mcp_revocados").upsert({ client_id: clienteId });
    const { error: e2 } = await sb.auth.oauth.revokeGrant({ clientId: clienteId });
    if (e1 && e2) { setEstado("error"); return; }
    router.refresh();
  }
  if (estado === "confirmar" || estado === "ocupado") {
    return (
      <span className="tz-h s8">
        <button type="button" className="tz-btn tz-btn-ghost text-button" onClick={() => setEstado("")} disabled={estado === "ocupado"}>Cancelar</button>
        <button type="button" className="tz-btn tz-btn-glass text-button" style={{ color: "var(--danger)" }} onClick={revocar} disabled={estado === "ocupado"} aria-label={`Confirmar revocar ${nombre}`}>{estado === "ocupado" ? "Revocando…" : "Sí, revocar"}</button>
      </span>
    );
  }
  return (
    <span className="tz-h s8">
      {estado === "error" ? <span role="alert" className="text-body-sm" style={{ color: "var(--danger)" }}>No se pudo</span> : null}
      <button type="button" className="tz-btn tz-btn-glass text-button" onClick={() => setEstado("confirmar")} aria-label={`Revocar ${nombre}`}>Revocar</button>
    </span>
  );
}
