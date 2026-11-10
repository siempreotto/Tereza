"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/tz";
import { Field } from "@/components/tz/forms";
import { aceptarInvitacion } from "@/lib/acciones/hogar";

export function AceptarForm({ token, nombreSugerido }: { token: string; nombreSugerido: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreSugerido);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const aceptar = async () => {
    setOcupado(true);
    setError(null);
    const r = await aceptarInvitacion({ token, nombre });
    if (!r.ok) {
      setOcupado(false);
      return setError(r.error);
    }
    router.replace("/");
    router.refresh();
  };
  return (
    <div className="tz-stack" style={{ marginTop: "auto" }}>
      <Field label="¿Cómo te llamas?" id="inv-n" help="Así te verán los demás cuidadores.">
        <input id="inv-n" className="tz-input" autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Field>
      {error ? <p role="alert" className="text-body-sm c-danger">{error}</p> : null}
      <Button variant="primary" size="lg" block disabled={!nombre.trim() || ocupado} onClick={aceptar}>{ocupado ? "Uniéndote…" : "Aceptar invitación"}</Button>
    </div>
  );
}
