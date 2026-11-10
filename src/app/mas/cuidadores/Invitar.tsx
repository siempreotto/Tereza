"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/tz";
import { Field, RolePicker, type RolMiembro } from "@/components/tz/forms";
import { crearInvitacion } from "@/lib/acciones/hogar";

export function Invitar() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<RolMiembro>("cuidador");
  const [enlace, setEnlace] = useState<{ url: string; email: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const crear = async () => {
    setOcupado(true);
    setError(null);
    setAviso(null);
    const r = await crearInvitacion({ email: correo, rol });
    setOcupado(false);
    if (!r.ok) return setError(r.error);
    setEnlace({ url: r.data.enlace, email: r.data.email });
    setCorreo("");
    router.refresh();
  };
  const compartir = async () => {
    if (!enlace) return;
    try {
      if (navigator.share) await navigator.share({ title: "Invitación a Tereza", text: `Te invito a Tereza. Entra con ${enlace.email}:`, url: enlace.url });
      else { await navigator.clipboard.writeText(enlace.url); setAviso("Copié el enlace. Pégalo en WhatsApp o en un correo."); }
    } catch { /* menú cerrado */ }
  };

  return (
    <section className="tz-card lg tz-glass tz-stack s16" aria-label="Invitar">
      <h2 className="text-title">Invitar a quien cuida</h2>
      <Field label="Correo" id="inv-mail" help="La persona tiene que entrar con este mismo correo.">
        <input id="inv-mail" type="email" inputMode="email" className="tz-input" placeholder="nombre@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} />
      </Field>
      <Field label="Rol"><RolePicker value={rol} onChange={setRol} /></Field>
      {error ? <p role="alert" className="text-body-sm c-danger">{error}</p> : null}
      <Button variant="primary" size="lg" block disabled={!/.+@.+\..+/.test(correo) || ocupado} onClick={crear}>{ocupado ? "Creando…" : "Crear invitación"}</Button>
      {enlace ? (
        <div className="tz-alert info" role="status">
          <div className="tz-stack s8" style={{ minWidth: 0 }}>
            <p className="text-body-strong tz-alert-title">Invitación lista para {enlace.email}</p>
            <p className="text-body-sm" style={{ wordBreak: "break-all" }}>{enlace.url}</p>
            <Button variant="glass" onClick={compartir}>Compartir enlace</Button>
            {aviso ? <p className="text-body-sm">{aviso}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
