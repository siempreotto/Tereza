"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/tz";
import { Field } from "@/components/tz/forms";
import { useAviso } from "@/components/hoy/Aviso";
import { agregarDuda, eliminarDuda, resolverDuda } from "@/lib/acciones/salud";
import { fFecha } from "@/lib/core/tiempo";

type Duda = { id: string; texto: string; creada_en: string; creada_por: string; source: string; resuelta_en_visita_id: string | null };

export function Dudas({ babyId, dudas, visitas, nombres, tz }: { babyId: string; dudas: Duda[]; visitas: { id: string; motivo: string | null; fecha: string }[]; nombres: Record<string, string>; tz: string }) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [texto, setTexto] = useState("");
  const pendientes = dudas.filter((q) => !q.resuelta_en_visita_id), resueltas = dudas.filter((q) => q.resuelta_en_visita_id);
  const visita = (id: string | null) => visitas.find((v) => v.id === id);
  const agregar = async () => {
    const r = await agregarDuda({ babyId, texto });
    if (!r.ok) return avisar(r.error);
    setTexto("");
    avisar("Guardé la duda", async () => { await eliminarDuda(r.data.id); router.refresh(); });
    router.refresh();
  };
  const marcar = async (q: Duda, visitaId: string | null) => {
    const r = await resolverDuda(q.id, visitaId);
    if (!r.ok) return avisar(r.error);
    avisar(visitaId ? "La marqué como resuelta" : "La regresé a pendientes", async () => { await resolverDuda(q.id, q.resuelta_en_visita_id); router.refresh(); });
    router.refresh();
  };
  return (
    <div className="tz-cols">
      <div className="tz-stack s24">
        <section className="tz-stack" aria-label="Pendientes">
          <h2 className="text-title">Pendientes</h2>
          {pendientes.length ? (
            <ul className="tz-list tz-glass" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {pendientes.map((q) => (
                <li key={q.id} className="tz-row" style={{ alignItems: "flex-start" }}>
                  <span className="grow"><span className="text-body">{q.texto}</span><span className="text-body-sm tz-muted">{nombres[q.creada_por] ?? "Alguien"}{q.source === "mcp" ? " desde Claude" : ""} · {fFecha(new Date(q.creada_en).getTime(), tz)}</span></span>
                  {visitas[0] ? <Button variant="ghost" onClick={() => marcar(q, visitas[0].id)}>Resuelta</Button> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-body tz-muted">No hay dudas pendientes.</p>}
          {visitas[0] && pendientes.length ? <p className="tz-help">«Resuelta» la asocia a la última visita ({visitas[0].motivo ?? "consulta"}).</p> : null}
        </section>
        {resueltas.length ? (
          <section className="tz-stack" aria-label="Resueltas">
            <h2 className="text-title">Resueltas</h2>
            <ul className="tz-list tz-glass" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {resueltas.map((q) => (
                <li key={q.id} className="tz-row" style={{ alignItems: "flex-start" }}>
                  <span className="grow"><span className="text-body">{q.texto}</span><span className="text-body-sm tz-muted">En: {visita(q.resuelta_en_visita_id)?.motivo ?? "una visita"}</span></span>
                  <Button variant="ghost" onClick={() => marcar(q, null)}>Volver a pendiente</Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <section className="tz-card lg tz-glass tz-stack s16" aria-label="Agregar duda">
        <h2 className="text-title">Agregar duda</h2>
        <Field label="Tu pregunta" id="q-t"><textarea id="q-t" className="tz-input area" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: ¿Cuándo empezamos con los sólidos?" /></Field>
        <Button variant="primary" size="lg" block disabled={!texto.trim()} onClick={agregar}>Agregar duda</Button>
      </section>
    </div>
  );
}
