"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarCuenta } from "@/lib/acciones/cuenta";
import { vaciarCola } from "@/lib/cola";

export function EliminarCuenta() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  if (!abierto) return <button type="button" className="tz-btn tz-btn-ghost text-button" style={{ color: "var(--danger)", alignSelf: "flex-start" }} onClick={() => setAbierto(true)}>Eliminar mi cuenta</button>;
  async function confirmar() {
    setOcupado(true); setError("");
    const r = await eliminarCuenta({ confirmacion: texto });
    if (!r.ok) { setOcupado(false); setError(r.error); return; }
    vaciarCola();
    try { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); } catch { /* sin caché */ }
    router.replace("/entrar");
    router.refresh();
  }
  return (
    <div className="tz-stack" style={{ gap: 8 }}>
      <label className="tz-lbl" htmlFor="del-c">Escribe ELIMINAR para confirmar</label>
      <input id="del-c" className="tz-input" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" />
      {error ? <p role="alert" className="text-body-sm" style={{ color: "var(--danger)" }}>{error}</p> : null}
      <div className="tz-h s8">
        <button type="button" className="tz-btn tz-btn-ghost text-button" onClick={() => { setAbierto(false); setTexto(""); setError(""); }} disabled={ocupado}>Cancelar</button>
        <button type="button" className="tz-btn tz-btn-glass text-button" style={{ color: "var(--danger)" }} disabled={ocupado || texto.trim().toUpperCase() !== "ELIMINAR"} onClick={confirmar}>{ocupado ? "Eliminando…" : "Eliminar para siempre"}</button>
      </div>
    </div>
  );
}
