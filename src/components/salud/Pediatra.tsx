"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, CategoryIcon } from "@/components/tz";
import { Field } from "@/components/tz/forms";
import { useAviso } from "@/components/hoy/Aviso";
import { agregarAdjunto, crearVisita, enlaceAdjunto, fijarCita } from "@/lib/acciones/salud";
import { supabaseBrowser } from "@/lib/supabase/client";
import { desdeLocal, fechaISO, fFecha, fHora, partes } from "@/lib/core/tiempo";

type Visita = { id: string; fecha: string; pediatra: string | null; motivo: string | null; notas: string | null; vacunas: string[]; adjuntos: string[] };
type Cita = { fecha: string; titulo: string | null; pediatra: string | null } | null;
type Duda = { id: string; texto: string };

const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];

export function Pediatra({ babyId, hogarId, visitas, cita, dudas, tz }: { babyId: string; hogarId: string; visitas: Visita[]; cita: Cita; dudas: Duda[]; tz: string }) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [hoyISO] = useState(() => fechaISO(Date.now(), tz));
  // Nueva visita
  const [fecha, setFecha] = useState(hoyISO), [motivo, setMotivo] = useState(cita?.titulo ?? ""), [doc, setDoc] = useState(cita?.pediatra ?? "");
  const [notas, setNotas] = useState(""), [vacunas, setVacunas] = useState(""), [resueltas, setResueltas] = useState<string[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // Próxima cita
  const citaP = cita ? partes(new Date(cita.fecha).getTime(), tz) : null;
  const [cFecha, setCFecha] = useState(cita ? fechaISO(new Date(cita.fecha).getTime(), tz) : "");
  const [cHora, setCHora] = useState(citaP ? `${String(citaP.hora).padStart(2, "0")}:${String(citaP.minuto).padStart(2, "0")}` : "09:00");
  const [cTitulo, setCTitulo] = useState(cita?.titulo ?? ""), [cDoc, setCDoc] = useState(cita?.pediatra ?? "");

  const subir = async (visitaId: string, f: File) => {
    if (!TIPOS.includes(f.type)) return avisar("Solo se pueden adjuntar PDF o fotos (JPG, PNG, HEIC, WebP).");
    if (f.size > 10 * 1024 * 1024) return avisar("El archivo pesa más de 10 MB. Intenta con una foto más liviana.");
    const limpio = f.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
    const ruta = `${hogarId}/${visitaId}/${crypto.randomUUID()}-${limpio}`;
    const { error } = await supabaseBrowser().storage.from("visitas").upload(ruta, f, { contentType: f.type, upsert: false });
    if (error) return avisar("No pudimos subir el adjunto. Revisa tu conexión y vuelve a intentarlo.");
    const r = await agregarAdjunto(visitaId, ruta);
    if (!r.ok) return avisar(r.error);
  };

  const guardarVisita = async () => {
    setOcupado(true);
    const [y, m, d] = fecha.split("-").map(Number);
    const r = await crearVisita({ babyId, fecha: new Date(desdeLocal(tz, y, m, d, 12)).toISOString(), motivo, pediatra: doc || null, notas: notas || null, vacunas: vacunas.split(/[,\n]/).map((v) => v.trim()).filter(Boolean), dudasResueltas: resueltas });
    if (!r.ok) { setOcupado(false); return avisar(r.error); }
    if (archivo) await subir(r.data.id, archivo);
    setOcupado(false);
    avisar("Guardé la visita");
    setMotivo(""); setNotas(""); setVacunas(""); setResueltas([]); setArchivo(null);
    router.refresh();
  };

  const guardarCita = async (borrar = false) => {
    const [y, m, d] = (cFecha || hoyISO).split("-").map(Number);
    const [hh, mm] = cHora.split(":").map(Number);
    const r = await fijarCita({ babyId, fecha: borrar ? null : new Date(desdeLocal(tz, y, m, d, hh, mm)).toISOString(), titulo: cTitulo || null, pediatra: cDoc || null });
    if (!r.ok) return avisar(r.error);
    avisar(borrar ? "Quité la próxima cita" : `Guardé la cita del ${fFecha(desdeLocal(tz, y, m, d, hh, mm), tz).toLowerCase()}`);
    router.refresh();
  };

  const abrir = async (ruta: string) => {
    const r = await enlaceAdjunto(ruta);
    if (!r.ok) return avisar(r.error);
    window.open(r.data.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="tz-cols">
      <div className="tz-stack s24">
        <section className="tz-card lg tz-glass tz-stack s16" aria-label="Próxima cita">
          <h2 className="text-title">Próxima cita</h2>
          {cita ? <p className="text-body">{cita.titulo ?? "Consulta"} · {fFecha(new Date(cita.fecha).getTime(), tz)}, {fHora(new Date(cita.fecha).getTime(), tz)}{cita.pediatra ? ` · ${cita.pediatra}` : ""}</p> : <p className="text-body tz-muted">Sin cita programada.</p>}
          <div className="tz-grid2">
            <Field label="Fecha" id="c-f"><input id="c-f" type="date" className="tz-input" min={hoyISO} value={cFecha} onChange={(e) => setCFecha(e.target.value)} /></Field>
            <Field label="Hora" id="c-h"><input id="c-h" type="time" className="tz-input" value={cHora} onChange={(e) => setCHora(e.target.value)} /></Field>
          </div>
          <div className="tz-grid2">
            <Field label="Motivo" id="c-t"><input id="c-t" className="tz-input" placeholder="Ej.: control de 6 meses" value={cTitulo} onChange={(e) => setCTitulo(e.target.value)} /></Field>
            <Field label="Pediatra" id="c-d"><input id="c-d" className="tz-input" value={cDoc} onChange={(e) => setCDoc(e.target.value)} /></Field>
          </div>
          <div className="tz-h s8">
            <Button variant="primary" disabled={!cFecha} onClick={() => guardarCita()}>Guardar cita</Button>
            {cita ? <Button variant="ghost" onClick={() => guardarCita(true)}>Quitar cita</Button> : null}
          </div>
        </section>
        <section className="tz-stack" aria-label="Visitas">
          <h2 className="text-title">Visitas</h2>
          {visitas.length ? visitas.map((v) => (
            <article key={v.id} className="tz-card lg tz-glass tz-stack s8">
              <div className="tz-h top"><CategoryIcon category="doctor" /><div className="tz-stack s4 grow"><h3 className="text-body-strong">{v.motivo ?? "Consulta"}</h3><p className="text-body-sm tz-muted">{fFecha(new Date(v.fecha).getTime(), tz)}{v.pediatra ? ` · ${v.pediatra}` : ""}</p></div></div>
              {v.notas ? <p className="text-body">{v.notas}</p> : null}
              {v.vacunas.length ? <div className="tz-chips">{v.vacunas.map((x) => <span key={x} className="tz-tag doctor">{x}</span>)}</div> : null}
              {v.adjuntos.length ? <div className="tz-stack s4">{v.adjuntos.map((a) => <button key={a} type="button" className="tz-link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left" }} onClick={() => abrir(a)}>Ver adjunto: {a.split("/").pop()!.replace(/^[0-9a-f-]{36}-/, "")}</button>)}</div> : null}
              <label className="tz-link" style={{ cursor: "pointer" }}>Agregar adjunto<input type="file" accept={TIPOS.join(",")} hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await subir(v.id, f); avisar("Adjunté el archivo"); router.refresh(); } }} /></label>
            </article>
          )) : <p className="text-body tz-muted">Aún no hay visitas registradas.</p>}
        </section>
      </div>
      <section className="tz-card lg tz-glass tz-stack s16" aria-label="Nueva visita">
        <h2 className="text-title">Nueva visita</h2>
        <div className="tz-grid2">
          <Field label="Fecha" id="v-f"><input id="v-f" type="date" className="tz-input" max={hoyISO} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
          <Field label="Motivo" id="v-m"><input id="v-m" className="tz-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: control de 6 meses" /></Field>
        </div>
        <Field label="Pediatra" id="v-d"><input id="v-d" className="tz-input" value={doc} onChange={(e) => setDoc(e.target.value)} /></Field>
        <Field label="Notas de la consulta" id="v-n"><textarea id="v-n" className="tz-input area" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Lo que dijo la pediatra" /></Field>
        <Field label="Vacunas aplicadas (separadas por coma)" id="v-v"><input id="v-v" className="tz-input" value={vacunas} onChange={(e) => setVacunas(e.target.value)} placeholder="Ej.: Pentavalente 3.ª dosis" /></Field>
        {dudas.length ? (
          <Field label="Dudas resueltas en esta visita">
            <div className="tz-list tz-sunken">
              {dudas.map((q) => (
                <button key={q.id} type="button" className="tz-row" role="checkbox" aria-checked={resueltas.includes(q.id)} onClick={() => setResueltas((r) => (r.includes(q.id) ? r.filter((x) => x !== q.id) : [...r, q.id]))}>
                  <span className={`tz-check${resueltas.includes(q.id) ? " on" : ""}`} aria-hidden>{resueltas.includes(q.id) ? "✓" : null}</span><span className="grow text-body">{q.texto}</span>
                </button>
              ))}
            </div>
          </Field>
        ) : null}
        <Field label="Adjunto (opcional)" id="v-a" help="PDF o foto de la receta, hasta 10 MB. Solo lo ven admin y cuidadores."><input id="v-a" type="file" className="tz-input" accept={TIPOS.join(",")} onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} /></Field>
        <Button variant="primary" size="lg" block disabled={ocupado || !motivo.trim()} onClick={guardarVisita}>{ocupado ? "Guardando…" : "Guardar visita"}</Button>
      </section>
    </div>
  );
}
