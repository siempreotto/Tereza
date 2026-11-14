"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, CategoryIcon } from "@/components/tz";
import { Field } from "@/components/tz/forms";
import { useAviso } from "@/components/hoy/Aviso";
import { crearTratamiento, terminarTratamiento } from "@/lib/acciones/salud";
import { etiquetaDia, fHora } from "@/lib/core/tiempo";
import { VIA } from "@/lib/core/eventos";

type Tratamiento = { id: string; nombre: string; indicacion_textual: string; prescrito_por: string | null; inicio: string; fin: string | null; activo: boolean };
type Adm = { id: string; started_at: string; payload: { medication_id: string; cantidad_textual: string; via?: string }; logged_by: string; source: string };

export function Medicamentos({ babyId, tratamientos, administraciones, nombres, tz }: { babyId: string; tratamientos: Tratamiento[]; administraciones: Adm[]; nombres: Record<string, string>; tz: string }) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [nombre, setNombre] = useState(""), [ind, setInd] = useState(""), [por, setPor] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const activos = tratamientos.filter((t) => t.activo), pasados = tratamientos.filter((t) => !t.activo);
  const nombreDe = (id: string) => tratamientos.find((t) => t.id === id)?.nombre ?? "Medicamento";
  const [ahora] = useState(() => Date.now());
  const crear = async () => {
    setOcupado(true);
    const r = await crearTratamiento({ babyId, nombre, indicacion: ind, prescritoPor: por || null });
    setOcupado(false);
    if (!r.ok) return avisar(r.error);
    avisar(`Agregué el tratamiento ${nombre.trim()}`, async () => { await terminarTratamiento(r.data.id); router.refresh(); });
    setNombre(""); setInd(""); setPor("");
    router.refresh();
  };
  const terminar = async (t: Tratamiento) => {
    const r = await terminarTratamiento(t.id);
    if (!r.ok) return avisar(r.error);
    avisar(`Terminé el tratamiento ${t.nombre}`, async () => { await terminarTratamiento(t.id, true); router.refresh(); });
    router.refresh();
  };
  return (
    <div className="tz-cols">
      <div className="tz-stack s24">
        <section className="tz-stack" aria-label="Tratamientos activos">
          <h2 className="text-title">Activos</h2>
          {activos.length ? (
            <ul className="tz-list tz-glass" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {activos.map((t) => (
                <li key={t.id} className="tz-row">
                  <CategoryIcon category="meds" />
                  <span className="grow"><span className="text-body-strong">{t.nombre}</span><span className="text-body-sm tz-muted">Indicación: «{t.indicacion_textual}»{t.prescrito_por ? ` · ${t.prescrito_por}` : ""}</span></span>
                  <Button variant="ghost" onClick={() => terminar(t)}>Terminar</Button>
                </li>
              ))}
            </ul>
          ) : <p className="text-body tz-muted">No hay tratamientos activos.</p>}
          <Link className="tz-link" href="/?registrar=medicamento">Registrar una dosis</Link>
        </section>
        <section className="tz-stack" aria-label="Historial de administraciones">
          <h2 className="text-title">Historial</h2>
          {administraciones.length ? (
            <ul className="tz-list tz-glass" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {administraciones.map((a) => (
                <li key={a.id} className="tz-row">
                  <span className="grow"><span className="text-body-strong">{nombreDe(a.payload.medication_id)}</span><span className="text-body-sm tz-muted">{a.payload.cantidad_textual}{a.payload.via ? ` · ${VIA[a.payload.via] ?? a.payload.via}` : ""} · {nombres[a.logged_by] ?? "Alguien"}{a.source === "mcp" ? " desde Claude" : ""}</span></span>
                  <span className="end"><span className="text-body-strong tz-num">{fHora(new Date(a.started_at).getTime(), tz)}</span><span className="text-body-sm tz-muted">{etiquetaDia(new Date(a.started_at).getTime(), ahora, tz)}</span></span>
                </li>
              ))}
            </ul>
          ) : <p className="text-body tz-muted">Aún no hay dosis registradas.</p>}
          {pasados.length ? <p className="text-body-sm tz-muted">Terminados: {pasados.map((t) => t.nombre).join(", ")}.</p> : null}
        </section>
      </div>
      <section className="tz-card lg tz-glass tz-stack s16" aria-label="Nuevo tratamiento">
        <h2 className="text-title">Nuevo tratamiento</h2>
        <Field label="Nombre" id="t-n"><input id="t-n" className="tz-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Como aparece en la caja" /></Field>
        <Field label="Indicación, tal como la escribió el médico" id="t-i"><textarea id="t-i" className="tz-input area" value={ind} onChange={(e) => setInd(e.target.value)} placeholder="Copia el texto de la receta" /></Field>
        <Field label="Indicado por (opcional)" id="t-p"><input id="t-p" className="tz-input" value={por} onChange={(e) => setPor(e.target.value)} placeholder="Ej.: Dra. Herrera" /></Field>
        <div className="tz-alert neutral"><p className="text-body-sm">Guardamos el texto tal cual. Tereza no interpreta ni calcula dosis. Si tienes dudas sobre la cantidad, consulta a tu pediatra o farmacéutico y revisa la etiqueta.</p></div>
        <Button variant="primary" size="lg" block disabled={ocupado || !nombre.trim() || !ind.trim()} onClick={crear}>Agregar tratamiento</Button>
      </section>
    </div>
  );
}
