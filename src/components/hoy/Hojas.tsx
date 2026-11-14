"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button, CategoryIcon, Chip, type Category } from "@/components/tz";
import { Field, Seg, Stepper } from "@/components/tz/forms";
import { useAviso } from "./Aviso";
import type { registrarEvento } from "@/lib/acciones/eventos";
import { corregirEvento } from "@/lib/acciones/eventos";
import { alarmaTemperatura, AVISO_SINTOMAS } from "@/lib/core/alarmas";
import { describir, ms, type Evento, type Payload } from "@/lib/core/eventos";
import { edadMeses, esNoche } from "@/lib/core/sueno";
import { DIA, enHora, fDuracion, fHora, inicioDia, MIN, partes } from "@/lib/core/tiempo";
import { fVolumen, volumenAMl, volumenEnUnidad } from "@/lib/core/unidades";
import type { Ajustes } from "@/lib/datos/hoy";
import type { Bebe } from "./Hoy";

export type HojaAbierta =
  | { tipo: "agregar" }
  | { tipo: "sueno" }
  | { tipo: "toma"; pestana?: "pecho" | "biberon" | "solidos" | "extraccion" }
  | { tipo: "panal" }
  | { tipo: "medicamento" }
  | { tipo: "temperatura" }
  | { tipo: "nota" }
  | { tipo: "detalle"; evento: Evento };

type Registrar = (input: Parameters<typeof registrarEvento>[0], mensaje?: string) => Promise<Evento | null>;

type Props = {
  hoja: HojaAbierta | null;
  cerrar: () => void;
  registrar: Registrar;
  eliminar: (e: Evento) => Promise<void>;
  alCorregir: (e: Evento) => void;
  ajustes: Ajustes;
  ahora: number;
  eventos: Evento[];
  bebe: Bebe;
  tratamientos: { id: string; nombre: string; indicacion: string }[];
  limitado: boolean;
  nombres: Record<string, string>;
};

const iso = (n: number) => new Date(n).toISOString();

/** Hora "HH:MM" ↔ instante dentro del día local de `base`. Si la hora queda en el futuro, se toma del día anterior. */
function TimeInput({ id, label, value, onChange, tz, ahora }: { id: string; label: string; value: number; onChange: (n: number) => void; tz: string; ahora: number }) {
  const p = partes(value, tz);
  const v = `${String(p.hora).padStart(2, "0")}:${String(p.minuto).padStart(2, "0")}`;
  return (
    <input id={id} className="tz-input tz-num" type="time" value={v} aria-label={label} onChange={(e) => {
      if (!e.target.value) return;
      let n = enHora(inicioDia(value, tz), e.target.value, tz);
      if (n > ahora + 5 * MIN) n -= DIA;
      onChange(n);
    }} />
  );
}

export function Hojas(p: Props) {
  const { hoja, cerrar } = p;
  useEffect(() => {
    if (!hoja) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [hoja, cerrar]);
  if (!hoja) return null;
  switch (hoja.tipo) {
    case "sueno": return <HojaSueno {...p} />;
    case "toma": return <HojaToma {...p} pestana={hoja.pestana} />;
    case "panal": return <HojaPanal {...p} />;
    case "medicamento": return <HojaMedicamento {...p} />;
    case "temperatura": return <HojaTemperatura {...p} />;
    case "nota": return <HojaNota {...p} />;
    case "detalle": return <HojaDetalle {...p} evento={hoja.evento} />;
    case "agregar": return null;
  }
}

function Sheet({ titulo, cat, onClose, children, label }: { titulo?: string; cat?: Category | "temp" | "note"; onClose: () => void; children: ReactNode; label?: string }) {
  return (
    <>
      <div className="tz-scrim" onClick={onClose} />
      <section className="tz-sheet" role="dialog" aria-modal="true" aria-label={label ?? titulo}>
        <span className="tz-grab" aria-hidden />
        {titulo ? (
          <div className="tz-sheet-head">
            <div className="tz-h">
              {cat === "temp" ? <span className="tz-icchip temp" aria-hidden>🌡</span> : cat === "note" ? <span className="tz-icchip" aria-hidden>✎</span> : cat ? <CategoryIcon category={cat} /> : null}
              <h2 className={titulo.length > 18 ? "text-title" : "text-title-lg"}>{titulo}</h2>
            </div>
            <button className="tz-iconbtn plain" type="button" aria-label="Cerrar" onClick={onClose}>×</button>
          </div>
        ) : null}
        {children}
      </section>
    </>
  );
}

function Chips<T extends string>({ options, value, onChange }: { options: { v: T; l: string }[]; value: T | null | undefined; onChange: (v: T | null) => void }) {
  return <div className="tz-chips">{options.map((o) => <Chip key={o.v} selected={value === o.v} onClick={() => onChange(value === o.v ? null : o.v)}>{o.l}</Chip>)}</div>;
}

const LUGARES = [{ v: "cuna", l: "Cuna" }, { v: "brazos", l: "Brazos" }, { v: "carriola", l: "Carriola" }, { v: "auto", l: "Auto" }, { v: "otro", l: "Otro" }] as const;
const COMOS = [{ v: "solo", l: "Solo" }, { v: "arrullo", l: "Arrullo" }, { v: "pecho", l: "Pecho" }, { v: "biberon", l: "Biberón" }] as const;

function HojaSueno({ cerrar, registrar, ahora, ajustes: a, eventos }: Props) {
  const [modo, setModo] = useState<"ahora" | "pasado">("ahora");
  const [inicio, setInicio] = useState(ahora - 90 * MIN);
  const [fin, setFin] = useState(ahora - 10 * MIN);
  const [lugar, setLugar] = useState<Payload<"sueno">["lugar"]>("cuna");
  const [como, setComo] = useState<Payload<"sueno">["como_se_durmio"]>("solo");
  const activo = eventos.find((e) => e.tipo === "sueno" && !e.ended_at);
  const dur = (fin - inicio) / MIN;
  const guardar = async () => {
    if (modo === "ahora") await registrar({ babyId: "", tipo: "sueno", startedAt: iso(ahora), endedAt: null, payload: { lugar, como_se_durmio: como } }, `Empezó el sueño a las ${fHora(ahora, a.tz)}`);
    else await registrar({ babyId: "", tipo: "sueno", startedAt: iso(inicio), endedAt: iso(fin < inicio ? fin + DIA : fin), payload: { lugar, como_se_durmio: como } });
    cerrar();
  };
  return (
    <Sheet titulo="Sueño" cat="sleep" onClose={cerrar}>
      <Seg label="Tipo de registro" value={modo} onChange={setModo} options={[{ v: "ahora", l: "Empezar ahora" }, { v: "pasado", l: "Uno que ya pasó" }]} />
      {modo === "ahora" && activo ? <div className="tz-alert info" role="note"><div className="tz-stack s4"><p className="text-body-strong tz-alert-title">Ya hay un sueño en curso</p><p className="text-body-sm">Empezó a las {fHora(ms(activo.started_at), a.tz)}. Si guardas, verás ese mismo; no se duplica.</p></div></div> : null}
      {modo === "pasado" ? (
        <div className="tz-stack s8">
          <div className="tz-timefield">
            <Field label="Se durmió" id="sl-ini"><TimeInput id="sl-ini" label="Se durmió" value={inicio} onChange={setInicio} tz={a.tz} ahora={ahora} /></Field>
            <Field label="Despertó" id="sl-fin"><TimeInput id="sl-fin" label="Despertó" value={fin} onChange={setFin} tz={a.tz} ahora={ahora} /></Field>
          </div>
          <p className="tz-help tz-num">{dur > 0 ? `Duración ${fDuracion(dur)}` : `Termina al día siguiente · ${fDuracion(dur + 1440)}`}</p>
        </div>
      ) : null}
      <Field label="Dónde durmió"><Chips options={[...LUGARES]} value={lugar} onChange={(v) => setLugar(v ?? "cuna")} /></Field>
      <Field label="Cómo se durmió"><Chips options={[...COMOS]} value={como} onChange={(v) => setComo(v ?? "solo")} /></Field>
      <div className="tz-sheet-actions"><Button variant="primary" size="lg" block onClick={guardar}>{modo === "ahora" ? "Iniciar sueño" : "Guardar sueño"}</Button></div>
    </Sheet>
  );
}

function HojaToma({ cerrar, registrar, ahora, ajustes: a, eventos, pestana }: Props & { pestana?: "pecho" | "biberon" | "solidos" | "extraccion" }) {
  const u = a.unidadVolumen;
  const paso = u === "oz" ? 0.5 : 10;
  const [tab, setTab] = useState<"pecho" | "biberon" | "solidos" | "extraccion">(pestana ?? "biberon");
  const [lado, setLado] = useState<"izq" | "der">("izq");
  const [modo, setModo] = useState<"ahora" | "pasado">("ahora");
  const [minI, setMinI] = useState(10), [minD, setMinD] = useState(8);
  const [cont, setCont] = useState<Payload<"toma_biberon">["contenido"]>("materna");
  const [vol, setVol] = useState(u === "oz" ? 4 : 120);
  const [sobro, setSobro] = useState(0);
  const [hora, setHora] = useState(ahora);
  const [alimentos, setAlimentos] = useState(""), [cantidad, setCantidad] = useState(""), [reaccion, setReaccion] = useState("");
  const [ei, setEi] = useState(u === "oz" ? 2 : 60), [ed, setEd] = useState(u === "oz" ? 2 : 60);
  const activo = eventos.find((e) => e.tipo === "toma_pecho" && !e.ended_at);
  const alt = (v: number) => (u === "oz" ? `${volumenAMl(v, "oz")} ml` : fVolumen(v, "oz"));
  const guardar = async () => {
    if (tab === "pecho") {
      if (modo === "ahora") await registrar({ babyId: "", tipo: "toma_pecho", startedAt: iso(ahora), endedAt: null, payload: { lado_inicial: lado, segundos_izq: 0, segundos_der: 0, lado_activo: lado, activo_desde: iso(ahora) } }, `Empezó la toma con el ${lado === "izq" ? "izquierdo" : "derecho"}`);
      else await registrar({ babyId: "", tipo: "toma_pecho", startedAt: iso(hora), endedAt: iso(hora + (minI + minD) * MIN), payload: { lado_inicial: lado, segundos_izq: minI * 60, segundos_der: minD * 60 } });
    } else if (tab === "biberon") await registrar({ babyId: "", tipo: "toma_biberon", startedAt: iso(hora), payload: { contenido: cont, volumen_ml: volumenAMl(vol, u), sobrante_ml: volumenAMl(sobro, u) } });
    else if (tab === "solidos") await registrar({ babyId: "", tipo: "toma_solidos", startedAt: iso(hora), payload: { alimentos: alimentos.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20), cantidad: cantidad || undefined, reaccion: reaccion || undefined } });
    else await registrar({ babyId: "", tipo: "extraccion", startedAt: iso(hora), endedAt: iso(hora), payload: { volumen_ml_izq: volumenAMl(ei, u), volumen_ml_der: volumenAMl(ed, u) } });
    cerrar();
  };
  const horaField = <Field label="Hora" id="fd-hora"><TimeInput id="fd-hora" label="Hora" value={hora} onChange={setHora} tz={a.tz} ahora={ahora} /></Field>;
  return (
    <Sheet titulo="Toma" cat="feed" onClose={cerrar}>
      <Seg label="Tipo de toma" value={tab} onChange={setTab} options={[{ v: "pecho", l: "Pecho" }, { v: "biberon", l: "Biberón" }, { v: "solidos", l: "Sólidos" }, { v: "extraccion", l: "Extracción" }]} />
      {tab === "pecho" ? (
        <>
          <Seg label="Momento" value={modo} onChange={setModo} options={[{ v: "ahora", l: "Empezar ahora" }, { v: "pasado", l: "Ya terminó" }]} />
          {modo === "ahora" && activo ? <div className="tz-alert info" role="note"><p className="text-body-sm">Ya hay una toma en curso desde las {fHora(ms(activo.started_at), a.tz)}. No se duplica.</p></div> : null}
          <Field label="Empieza con"><Seg label="Lado" value={lado} onChange={setLado} options={[{ v: "izq", l: "Izquierdo" }, { v: "der", l: "Derecho" }]} /></Field>
          {modo === "pasado" ? (
            <>
              <div className="tz-grid2">
                <Field label="Izquierdo"><Stepper label="un minuto" value={minI} unit="min" onDec={() => setMinI(Math.max(0, minI - 1))} onInc={() => setMinI(minI + 1)} /></Field>
                <Field label="Derecho"><Stepper label="un minuto" value={minD} unit="min" onDec={() => setMinD(Math.max(0, minD - 1))} onInc={() => setMinD(minD + 1)} /></Field>
              </div>
              {horaField}
            </>
          ) : <p className="tz-help">El temporizador queda en Hoy: puedes cambiar de lado, pausar y terminar con un toque.</p>}
        </>
      ) : null}
      {tab === "biberon" ? (
        <>
          <Field label="Qué tomó"><Chips options={[{ v: "materna", l: "Leche materna" }, { v: "formula", l: "Fórmula" }, { v: "mixta", l: "Mixta" }]} value={cont} onChange={(v) => setCont(v ?? "materna")} /></Field>
          <Field label="Cuánto le diste" help={alt(vol)}><Stepper label={u === "oz" ? "media onza" : "10 ml"} value={vol} unit={u} onDec={() => setVol(Math.max(0, vol - paso))} onInc={() => setVol(vol + paso)} /></Field>
          <div className="tz-grid2">
            <Field label="Sobró"><Stepper label="sobrante" value={sobro} unit={u} onDec={() => setSobro(Math.max(0, sobro - paso))} onInc={() => setSobro(Math.min(vol, sobro + paso))} /></Field>
            {horaField}
          </div>
        </>
      ) : null}
      {tab === "solidos" ? (
        <>
          <Field label="Qué comió (separa con comas)" id="fd-al"><input id="fd-al" className="tz-input" placeholder="Ej.: puré de ayote" value={alimentos} onChange={(e) => setAlimentos(e.target.value)} /></Field>
          <div className="tz-grid2">
            <Field label="Cantidad" id="fd-ct"><input id="fd-ct" className="tz-input" placeholder="Ej.: 3 cucharaditas" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Field>
            {horaField}
          </div>
          <Field label="¿Alguna reacción? (opcional)" id="fd-re"><input id="fd-re" className="tz-input" placeholder="Ej.: ninguna" value={reaccion} onChange={(e) => setReaccion(e.target.value)} /></Field>
        </>
      ) : null}
      {tab === "extraccion" ? (
        <>
          <div className="tz-grid2">
            <Field label="Izquierdo"><Stepper label="volumen izquierdo" value={ei} unit={u} onDec={() => setEi(Math.max(0, ei - paso))} onInc={() => setEi(ei + paso)} /></Field>
            <Field label="Derecho"><Stepper label="volumen derecho" value={ed} unit={u} onDec={() => setEd(Math.max(0, ed - paso))} onInc={() => setEd(ed + paso)} /></Field>
          </div>
          {horaField}
        </>
      ) : null}
      <div className="tz-sheet-actions"><Button variant="primary" size="lg" block disabled={tab === "solidos" && !alimentos.trim()} onClick={guardar}>{tab === "pecho" && modo === "ahora" ? "Empezar toma" : "Guardar toma"}</Button></div>
    </Sheet>
  );
}

function HojaPanal({ cerrar, registrar, ahora, ajustes: a }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<"mojado" | "sucio" | "ambos" | null>(null);
  const [color, setColor] = useState<Payload<"panal">["color"]>(null), [cons, setCons] = useState<Payload<"panal">["consistencia"]>(null);
  const [hora, setHora] = useState(ahora);
  const payload = (k: "mojado" | "sucio" | "ambos"): Payload<"panal"> => ({ mojado: k !== "sucio", sucio: k !== "mojado", color: color ?? undefined, consistencia: cons ?? undefined });
  const rapido = async (k: "mojado" | "sucio" | "ambos") => {
    if (abierto) return setTipo(k);
    await registrar({ babyId: "", tipo: "panal", startedAt: iso(ahora), payload: payload(k) });
    cerrar();
  };
  const guardar = async () => { await registrar({ babyId: "", tipo: "panal", startedAt: iso(hora), payload: payload(tipo ?? "mojado") }); cerrar(); };
  const tile = (k: "mojado" | "sucio" | "ambos", l: string) => <button key={k} type="button" className={`tz-big${abierto && tipo === k ? " on" : ""}`} aria-pressed={abierto ? tipo === k : undefined} onClick={() => rapido(k)}>{l}</button>;
  return (
    <Sheet titulo="Pañal" cat="diaper" onClose={cerrar}>
      <p className="text-body tz-muted">{abierto ? "Elige el tipo y completa lo que quieras." : `Un toque lo guarda con la hora de ahora (${fHora(ahora, a.tz)}).`}</p>
      <div className="tz-grid3">{tile("mojado", "Mojado")}{tile("sucio", "Sucio")}{tile("ambos", "Ambos")}</div>
      <div className="tz-sunken" style={{ borderRadius: 20 }}>
        <button className="tz-row" type="button" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
          <span className="grow"><span className="text-body-strong">Detalles opcionales</span><span className="text-body-sm tz-muted">Color, consistencia u otra hora</span></span>
        </button>
      </div>
      {abierto ? (
        <>
          <Field label="Color"><Chips options={[{ v: "amarillo", l: "Amarillo" }, { v: "verde", l: "Verde" }, { v: "cafe", l: "Café" }, { v: "otro", l: "Otro" }]} value={color} onChange={setColor} /></Field>
          <Field label="Consistencia"><Chips options={[{ v: "liquida", l: "Líquida" }, { v: "pastosa", l: "Pastosa" }, { v: "firme", l: "Firme" }]} value={cons} onChange={setCons} /></Field>
          <Field label="Hora" id="dp-hora"><TimeInput id="dp-hora" label="Hora" value={hora} onChange={setHora} tz={a.tz} ahora={ahora} /></Field>
          <div className="tz-sheet-actions"><Button variant="primary" size="lg" block disabled={!tipo} onClick={guardar}>Guardar pañal</Button></div>
        </>
      ) : null}
    </Sheet>
  );
}

function HojaMedicamento({ cerrar, registrar, ahora, ajustes: a, tratamientos }: Props) {
  const [medId, setMedId] = useState(tratamientos[0]?.id ?? "");
  const [cantidad, setCantidad] = useState(""), [via, setVia] = useState<Payload<"medicamento">["via"]>("oral");
  const [hora, setHora] = useState(ahora);
  const guardar = async () => {
    await registrar({ babyId: "", tipo: "medicamento", startedAt: iso(hora), payload: { medication_id: medId, cantidad_textual: cantidad.trim(), via } });
    cerrar();
  };
  return (
    <Sheet titulo="Medicamento" cat="meds" onClose={cerrar}>
      {tratamientos.length ? (
        <Field label="Tratamiento">
          <div className="tz-stack s8" role="radiogroup" aria-label="Tratamiento">
            {tratamientos.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={medId === m.id} className={`tz-radio${medId === m.id ? " on" : ""}`} onClick={() => setMedId(m.id)}>
                <span className="dot" aria-hidden /><span className="grow tz-stack" style={{ gap: 0 }}><span className="text-body-strong">{m.nombre}</span><span className="text-body-sm tz-muted">Indicación: «{m.indicacion}»</span></span>
              </button>
            ))}
          </div>
        </Field>
      ) : <div className="tz-alert neutral"><p className="text-body-sm">Aún no hay tratamientos. Agrega uno en Salud › Medicamentos (llega en el Hito 5) y luego registra aquí cada dosis.</p></div>}
      <Field label="Cantidad que se le dio, tal como la indicó tu pediatra" id="md-c"><input id="md-c" className="tz-input" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="Escríbela como viene en la receta" /></Field>
      <div className="tz-grid2">
        <Field label="Hora" id="md-h"><TimeInput id="md-h" label="Hora" value={hora} onChange={setHora} tz={a.tz} ahora={ahora} /></Field>
        <Field label="Vía" id="md-v"><select id="md-v" className="tz-input" value={via} onChange={(e) => setVia(e.target.value as Payload<"medicamento">["via"])}>{[["oral", "Oral"], ["topica", "Tópica"], ["inhalada", "Inhalada"], ["nasal", "Nasal"], ["otra", "Otra"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      </div>
      <div className="tz-alert neutral"><p className="text-body-sm">Tereza solo registra lo que se le dio. No calcula ni sugiere dosis. Si tienes dudas sobre la cantidad, consulta a tu pediatra o farmacéutico y revisa la etiqueta.</p></div>
      <div className="tz-sheet-actions"><Button variant="primary" size="lg" block disabled={!medId || !cantidad.trim()} onClick={guardar}>Guardar medicamento</Button></div>
    </Sheet>
  );
}

function HojaTemperatura({ cerrar, registrar, ahora, ajustes: a, eventos, bebe }: Props) {
  const [tab, setTab] = useState<"temp" | "sint">("temp");
  const [val, setVal] = useState(37.0), [met, setMet] = useState<Payload<"temperatura">["metodo"]>("axilar"), [nota, setNota] = useState("");
  const [desc, setDesc] = useState(""), [sev, setSev] = useState<Payload<"sintoma">["severidad"]>(null);
  const [hora, setHora] = useState(ahora);
  const alarma = tab === "temp" && a.alarmasActivas ? alarmaTemperatura(val, edadMeses(bebe.fecha_nacimiento, ahora, bebe.semanas_gestacion), eventos, ahora) : null;
  const guardar = async () => {
    if (tab === "temp") await registrar({ babyId: "", tipo: "temperatura", startedAt: iso(hora), payload: { valor_c: Math.round(val * 10) / 10, metodo: met }, notas: nota || null });
    else await registrar({ babyId: "", tipo: "sintoma", startedAt: iso(hora), payload: { descripcion: desc.trim(), severidad: sev ?? undefined } });
    cerrar();
  };
  return (
    <Sheet titulo="Temperatura y síntoma" cat="temp" onClose={cerrar}>
      <Seg label="Qué vas a registrar" value={tab} onChange={setTab} options={[{ v: "temp", l: "Temperatura" }, { v: "sint", l: "Síntoma" }]} />
      {tab === "temp" ? (
        <>
          <Stepper label="una décima" value={val.toFixed(1)} unit="°C" onDec={() => setVal(Math.max(34, Math.round((val - 0.1) * 10) / 10))} onInc={() => setVal(Math.min(42, Math.round((val + 0.1) * 10) / 10))} />
          <Field label="Cómo la tomaste"><Chips options={[{ v: "axilar", l: "Axilar" }, { v: "rectal", l: "Rectal" }, { v: "frente", l: "Frente" }, { v: "oido", l: "Oído" }]} value={met} onChange={(v) => setMet(v ?? "axilar")} /></Field>
          <div className="tz-grid2">
            <Field label="Hora" id="tp-h"><TimeInput id="tp-h" label="Hora" value={hora} onChange={setHora} tz={a.tz} ahora={ahora} /></Field>
            <Field label="Nota (opcional)" id="tp-n"><input id="tp-n" className="tz-input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: irritable" /></Field>
          </div>
          {alarma ? <div className="tz-alert" role="note"><div className="tz-stack s4"><p className="text-body-strong tz-alert-title">{alarma.titulo}</p><p className="text-body-sm">{alarma.texto}</p></div></div> : null}
        </>
      ) : (
        <>
          <Field label="Qué notaste" id="tp-d"><textarea id="tp-d" className="tz-input area" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej.: tos seca desde la tarde" /></Field>
          <Field label="Qué tan fuerte (opcional)"><Chips options={[{ v: "leve", l: "Leve" }, { v: "moderado", l: "Moderado" }, { v: "fuerte", l: "Fuerte" }]} value={sev} onChange={setSev} /></Field>
          <Field label="Hora" id="tp-h2"><TimeInput id="tp-h2" label="Hora" value={hora} onChange={setHora} tz={a.tz} ahora={ahora} /></Field>
          <p className="tz-help">{AVISO_SINTOMAS}</p>
        </>
      )}
      <div className="tz-sheet-actions"><Button variant="primary" size="lg" block disabled={tab === "sint" && !desc.trim()} onClick={guardar}>{tab === "temp" ? "Guardar temperatura" : "Guardar síntoma"}</Button></div>
    </Sheet>
  );
}

function HojaNota({ cerrar, registrar, ahora, ajustes: a }: Props) {
  const [texto, setTexto] = useState(""), [hora, setHora] = useState(ahora);
  const guardar = async () => { await registrar({ babyId: "", tipo: "nota", startedAt: iso(hora), payload: { texto: texto.trim() } }); cerrar(); };
  return (
    <Sheet titulo="Nota" cat="note" onClose={cerrar}>
      <Field label="Qué quieres recordar" id="nt-t"><textarea id="nt-t" className="tz-input area" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe aquí" /></Field>
      <Field label="Hora" id="nt-h"><TimeInput id="nt-h" label="Hora" value={hora} onChange={setHora} tz={a.tz} ahora={ahora} /></Field>
      <div className="tz-sheet-actions"><Button variant="primary" size="lg" block disabled={!texto.trim()} onClick={guardar}>Guardar nota</Button></div>
    </Sheet>
  );
}

/** Ver y editar un registro: horas, campos, quién lo registró y desde dónde; eliminar con deshacer. */
function HojaDetalle({ cerrar, evento: e0, ahora, ajustes: a, eliminar, alCorregir, nombres, tratamientos }: Props & { evento: Evento }) {
  const { avisar } = useAviso();
  const [inicio, setInicio] = useState(ms(e0.started_at));
  const [fin, setFin] = useState<number | null>(e0.ended_at ? ms(e0.ended_at) : null);
  const [payload, setPayload] = useState<Record<string, unknown>>({ ...(e0.payload as Record<string, unknown>) });
  const [notas, setNotas] = useState(e0.notas ?? "");
  const [conflicto, setConflicto] = useState<Evento | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const opts = { tz: a.tz, unidadVolumen: a.unidadVolumen, ahora, esNoche: esNoche(a), nombreMedicamento: (id: string) => tratamientos.find((t) => t.id === id)?.nombre };
  const d = describir(e0, opts);
  const set = (k: string, v: unknown) => setPayload((p) => ({ ...p, [k]: v }));
  const u = a.unidadVolumen, paso = u === "oz" ? 0.5 : 10;
  const quien = nombres[e0.logged_by] ?? "Alguien";
  const guardar = async () => {
    setOcupado(true);
    const r = await corregirEvento({ eventId: e0.id, expectedVersion: e0.version, startedAt: iso(inicio), endedAt: fin ? iso(fin) : e0.ended_at === null ? null : undefined, payload, notas: notas || null });
    setOcupado(false);
    if (!r.ok) {
      if ("conflicto" in r) return setConflicto(r.conflicto);
      return avisar(r.error);
    }
    alCorregir(r.data.evento);
    avisar("Guardé los cambios", async () => {
      const u2 = await corregirEvento({ eventId: e0.id, expectedVersion: r.data.evento.version, startedAt: e0.started_at, endedAt: e0.ended_at, payload: e0.payload, notas: e0.notas });
      if (u2.ok) alCorregir(u2.data.evento); else avisar(u2.error);
    });
    cerrar();
  };
  const cat = d.cat === "temp" || d.cat === "note" ? d.cat : (d.cat as Category);
  if (conflicto) {
    const dc = describir(conflicto, opts);
    return (
      <Sheet label="Elegir qué versión guardar" onClose={cerrar}>
        <div className="tz-stack s8">
          <h2 className="text-title-lg">{nombres[conflicto.logged_by] === quien ? "Alguien más" : "Otro cuidador"} también cambió este registro</h2>
          <p className="text-body tz-muted">Lo editaron mientras tú lo editabas. Elige cuál se queda; la otra queda en el historial del registro.</p>
        </div>
        <div className="tz-stack s8">
          <button className="tz-radio on" type="button" onClick={async () => { const r = await corregirEvento({ eventId: e0.id, expectedVersion: conflicto.version, startedAt: iso(inicio), endedAt: fin ? iso(fin) : undefined, payload, notas: notas || null }); if (r.ok) { alCorregir(r.data.evento); avisar("Guardé tu versión"); cerrar(); } else avisar(r.error); }}>
            <span className="dot" aria-hidden /><span className="grow tz-stack" style={{ gap: 0 }}><span className="text-body-strong">Tu versión</span><span className="text-body tz-num">{describir({ ...e0, started_at: iso(inicio), ended_at: fin ? iso(fin) : e0.ended_at, payload }, opts).detalle}</span></span>
          </button>
          <button className="tz-radio" type="button" onClick={() => { alCorregir(conflicto); avisar("Dejé la otra versión"); cerrar(); }}>
            <span className="dot" aria-hidden /><span className="grow tz-stack" style={{ gap: 0 }}><span className="text-body-strong">La otra versión</span><span className="text-body tz-num">{dc.detalle}</span></span>
          </button>
        </div>
        <Button variant="ghost" block onClick={cerrar}>Decidir después</Button>
      </Sheet>
    );
  }
  return (
    <Sheet titulo={d.titulo} cat={cat} onClose={cerrar}>
      <div className={e0.tipo === "sueno" || e0.tipo === "toma_pecho" ? "tz-timefield" : ""}>
        <Field label={e0.tipo === "sueno" ? "Se durmió" : "Hora"} id="ev-ini"><TimeInput id="ev-ini" label="Inicio" value={inicio} onChange={setInicio} tz={a.tz} ahora={ahora} /></Field>
        {e0.tipo === "sueno" || e0.tipo === "toma_pecho" ? (
          <Field label={e0.tipo === "sueno" ? "Despertó" : "Terminó"} id="ev-fin">{fin ? <TimeInput id="ev-fin" label="Fin" value={fin} onChange={(v) => setFin(v < inicio ? v + DIA : v)} tz={a.tz} ahora={ahora} /> : <span className="tz-input sunken">En curso</span>}</Field>
        ) : null}
      </div>
      {e0.tipo === "sueno" ? (
        <>
          <Field label="Dónde durmió"><Chips options={[...LUGARES]} value={payload.lugar as string} onChange={(v) => set("lugar", v ?? undefined)} /></Field>
          <Field label="Cómo se durmió"><Chips options={[...COMOS]} value={payload.como_se_durmio as string} onChange={(v) => set("como_se_durmio", v ?? undefined)} /></Field>
        </>
      ) : null}
      {e0.tipo === "toma_biberon" ? (
        <>
          <Field label="Qué tomó"><Chips options={[{ v: "materna", l: "Leche materna" }, { v: "formula", l: "Fórmula" }, { v: "mixta", l: "Mixta" }]} value={payload.contenido as string} onChange={(v) => set("contenido", v ?? "materna")} /></Field>
          <div className="tz-grid2">
            <Field label="Le diste"><Stepper label="volumen" value={volumenEnUnidad(Number(payload.volumen_ml ?? 0), u)} unit={u} onDec={() => set("volumen_ml", volumenAMl(Math.max(0, volumenEnUnidad(Number(payload.volumen_ml ?? 0), u) - paso), u))} onInc={() => set("volumen_ml", volumenAMl(volumenEnUnidad(Number(payload.volumen_ml ?? 0), u) + paso, u))} /></Field>
            <Field label="Sobró"><Stepper label="sobrante" value={volumenEnUnidad(Number(payload.sobrante_ml ?? 0), u)} unit={u} onDec={() => set("sobrante_ml", volumenAMl(Math.max(0, volumenEnUnidad(Number(payload.sobrante_ml ?? 0), u) - paso), u))} onInc={() => set("sobrante_ml", volumenAMl(volumenEnUnidad(Number(payload.sobrante_ml ?? 0), u) + paso, u))} /></Field>
          </div>
        </>
      ) : null}
      {e0.tipo === "toma_pecho" && fin ? (
        <div className="tz-grid2">
          <Field label="Izquierdo"><Stepper label="un minuto" value={Math.round(Number(payload.segundos_izq ?? 0) / 60)} unit="min" onDec={() => set("segundos_izq", Math.max(0, Number(payload.segundos_izq ?? 0) - 60))} onInc={() => set("segundos_izq", Number(payload.segundos_izq ?? 0) + 60)} /></Field>
          <Field label="Derecho"><Stepper label="un minuto" value={Math.round(Number(payload.segundos_der ?? 0) / 60)} unit="min" onDec={() => set("segundos_der", Math.max(0, Number(payload.segundos_der ?? 0) - 60))} onInc={() => set("segundos_der", Number(payload.segundos_der ?? 0) + 60)} /></Field>
        </div>
      ) : null}
      {e0.tipo === "panal" ? <Field label="Tipo"><Seg label="Tipo de pañal" value={payload.mojado && payload.sucio ? "ambos" : payload.sucio ? "sucio" : "mojado"} onChange={(v) => setPayload((p) => ({ ...p, mojado: v !== "sucio", sucio: v !== "mojado" }))} options={[{ v: "mojado", l: "Mojado" }, { v: "sucio", l: "Sucio" }, { v: "ambos", l: "Ambos" }]} /></Field> : null}
      {e0.tipo === "medicamento" ? <Field label="Cantidad, tal como la indicó tu pediatra" id="ev-q"><input id="ev-q" className="tz-input" value={String(payload.cantidad_textual ?? "")} onChange={(ev) => set("cantidad_textual", ev.target.value)} /></Field> : null}
      {e0.tipo === "temperatura" ? <Stepper label="una décima" value={Number(payload.valor_c).toFixed(1)} unit="°C" onDec={() => set("valor_c", Math.round((Number(payload.valor_c) - 0.1) * 10) / 10)} onInc={() => set("valor_c", Math.round((Number(payload.valor_c) + 0.1) * 10) / 10)} /> : null}
      {e0.tipo === "nota" ? <Field label="Nota" id="ev-nt"><textarea id="ev-nt" className="tz-input area" value={String(payload.texto ?? "")} onChange={(ev) => set("texto", ev.target.value)} /></Field> : <Field label="Nota (opcional)" id="ev-n"><textarea id="ev-n" className="tz-input area" value={notas} onChange={(ev) => setNotas(ev.target.value)} /></Field>}
      <div className="tz-sunken tz-stack s4" style={{ padding: 12 }}>
        <span className="text-body-strong">Registrado por {quien} {e0.source === "mcp" ? "desde Claude" : "desde la app"}</span>
        {e0.version > 1 ? <span className="text-body-sm tz-muted">Editado {e0.version - 1} {e0.version === 2 ? "vez" : "veces"}</span> : null}
      </div>
      <div className="tz-sheet-actions" style={{ flexDirection: "column" }}>
        <Button variant="primary" size="lg" block disabled={ocupado} onClick={guardar}>Guardar cambios</Button>
        <button className="tz-btn tz-btn-ghost text-button" type="button" style={{ color: "var(--danger)" }} onClick={async () => { cerrar(); await eliminar(e0); }}>Eliminar registro</button>
      </div>
    </Sheet>
  );
}

