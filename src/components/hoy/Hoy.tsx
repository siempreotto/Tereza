"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Icon, LogCard, QuickActions, TimerRing, type Category } from "@/components/tz";
import { useAviso } from "./Aviso";
import { useTema } from "./Tema";
import { Hojas, type HojaAbierta } from "./Hojas";
import { Prediccion } from "./Prediccion";
import { cambiarLado, corregirEvento, eliminarEvento, registrarEvento, restaurarEvento, terminarTimer } from "@/lib/acciones/eventos";
import { COMO, LUGAR, describir, ms, segundosPecho, textoGuardado, TIPOS_TOMA, type Evento, type Payload } from "@/lib/core/eventos";
import { alarmaPocosPanales } from "@/lib/core/alarmas";
import { esNoche, suenoDelDia } from "@/lib/core/sueno";
import { etiquetaDia, fDuracion, fFecha, fHace, fHora, fMinSeg, fReloj, inicioDia, MIN } from "@/lib/core/tiempo";
import { edadTexto } from "@/lib/core/edad";
import type { Ajustes } from "@/lib/datos/hoy";

export type Bebe = { id: string; nombre: string; fecha_nacimiento: string; semanas_gestacion: number | null; sexo: string };
export type Props = {
  bebe: Bebe;
  ajustes: Ajustes;
  eventos: Evento[];
  nombres: Record<string, string>;
  tratamientos: { id: string; nombre: string; indicacion: string }[];
  rol: "admin" | "cuidador" | "limitado";
  yo: { id: string; nombre: string };
  hojaInicial?: HojaAbierta | null;
};

const CAT: Record<string, Category> = { sleep: "sleep", feed: "feed", diaper: "diaper", meds: "meds" };

export function Hoy(p: Props) {
  const router = useRouter();
  const { avisar } = useAviso();
  const { noche, alternar } = useTema();
  const [ahora, setAhora] = useState(() => Date.now());
  const [hoja, setHoja] = useState<HojaAbierta | null>(p.hojaInicial ?? null);
  // Estado local optimista; se resincroniza cuando el servidor manda eventos nuevos.
  const [eventos, setEventos] = useState(p.eventos);
  const [base, setBase] = useState(p.eventos);
  if (p.eventos !== base) { setBase(p.eventos); setEventos(p.eventos); }
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // El botón «+» de la barra avisa qué hoja abrir.
  useEffect(() => {
    const h = (e: Event) => {
      const tipo = (e as CustomEvent<string>).detail;
      const mapa: Record<string, HojaAbierta> = { sueno: { tipo: "sueno" }, toma: { tipo: "toma" }, panal: { tipo: "panal" }, medicamento: { tipo: "medicamento" }, temperatura: { tipo: "temperatura" }, nota: { tipo: "nota" } };
      if (mapa[tipo]) setHoja(mapa[tipo]);
    };
    window.addEventListener("tereza:registrar", h);
    return () => window.removeEventListener("tereza:registrar", h);
  }, []);

  const { ajustes: a, bebe } = p;
  const tz = a.tz;
  const limitado = p.rol === "limitado";
  const opts = useMemo(() => ({ tz, unidadVolumen: a.unidadVolumen, ahora, esNoche: esNoche(a), nombreMedicamento: (id: string) => p.tratamientos.find((t) => t.id === id)?.nombre }), [tz, a, ahora, p.tratamientos]);
  const hoy = inicioDia(ahora, tz);
  const vivos = eventos.filter((e) => !e.eliminado_en);
  const porInicioDesc = (x: Evento, y: Evento) => ms(y.started_at) - ms(x.started_at);
  const suenoAhora = vivos.find((e) => e.tipo === "sueno" && !e.ended_at);
  const pechoAhora = vivos.find((e) => e.tipo === "toma_pecho" && !e.ended_at);
  const ultimoSueno = vivos.filter((e) => e.tipo === "sueno" && e.ended_at).sort((x, y) => ms(y.ended_at!) - ms(x.ended_at!))[0];
  const ultimaToma = vivos.filter((e) => TIPOS_TOMA.includes(e.tipo)).sort(porInicioDesc)[0];
  const ultimoPanal = vivos.filter((e) => e.tipo === "panal").sort(porInicioDesc)[0];
  const sd = suenoDelDia(vivos, hoy, ahora, a);
  const deHoy = vivos.filter((e) => ms(e.started_at) >= hoy || (!e.ended_at && (e.tipo === "sueno" || e.tipo === "toma_pecho"))).sort(porInicioDesc);
  const alarmaPanales = a.alarmasActivas && !limitado ? alarmaPocosPanales(vivos, hoy, ahora, tz) : null;

  // Optimista: aplica el cambio local, luego confirma con el servidor y refresca.
  const aplicar = useCallback((fn: (l: Evento[]) => Evento[]) => setEventos((l) => fn(l)), []);
  const refrescar = useCallback(() => router.refresh(), [router]);

  const registrar = useCallback(async (input: Parameters<typeof registrarEvento>[0], mensaje?: string) => {
    const r = await registrarEvento({ ...input, babyId: bebe.id });
    if (!r.ok) { avisar(r.error); return null; }
    const ev = r.data.evento;
    if (r.data.yaExistia) {
      avisar(`Ya hay ${ev.tipo === "sueno" ? "un sueño" : "una toma"} en curso desde las ${fHora(ms(ev.started_at), tz)}. No lo dupliqué.`);
      aplicar((l) => (l.some((x) => x.id === ev.id) ? l : [ev, ...l]));
      return ev;
    }
    aplicar((l) => [ev, ...l]);
    avisar(mensaje ?? textoGuardado(ev, opts), async () => {
      aplicar((l) => l.filter((x) => x.id !== ev.id));
      const d = await eliminarEvento(ev.id);
      if (!d.ok) { avisar(d.error); refrescar(); }
    });
    refrescar();
    return ev;
  }, [bebe.id, avisar, aplicar, opts, tz, refrescar]);

  const iniciarSueno = () => registrar({ babyId: bebe.id, tipo: "sueno", startedAt: new Date(ahora).toISOString(), endedAt: null, payload: { lugar: "cuna", como_se_durmio: "solo" } }, `Empezó el sueño a las ${fHora(ahora, tz)}`);

  const desperto = async () => {
    if (!suenoAhora) return;
    const fin = new Date(ahora).toISOString();
    const antes = suenoAhora;
    aplicar((l) => l.map((x) => (x.id === antes.id ? { ...x, ended_at: fin } : x)));
    const r = await terminarTimer({ babyId: bebe.id, tipo: "sueno", fin });
    if (!r.ok) { avisar(r.error); refrescar(); return; }
    const ev = r.data.evento;
    aplicar((l) => l.map((x) => (x.id === ev.id ? ev : x)));
    avisar(`Despertó. Durmió ${fDuracion(r.data.duracionMin)}`, async () => {
      const u = await corregirEvento({ eventId: ev.id, expectedVersion: ev.version, endedAt: null });
      if (!u.ok) avisar(u.error); else aplicar((l) => l.map((x) => (x.id === ev.id ? u.data.evento : x)));
      refrescar();
    });
    refrescar();
  };

  const lado = async (l: "izq" | "der" | null | undefined) => {
    const r = await cambiarLado({ babyId: bebe.id, lado: l });
    if (!r.ok) { avisar(r.error); return; }
    aplicar((list) => list.map((x) => (x.id === r.data.evento.id ? r.data.evento : x)));
  };

  const terminarPecho = async () => {
    if (!pechoAhora) return;
    const r = await terminarTimer({ babyId: bebe.id, tipo: "toma_pecho" });
    if (!r.ok) { avisar(r.error); return; }
    const ev = r.data.evento;
    aplicar((l) => l.map((x) => (x.id === ev.id ? ev : x)));
    avisar("Guardé la toma de pecho", async () => {
      const u = await corregirEvento({ eventId: ev.id, expectedVersion: ev.version, endedAt: null });
      if (!u.ok) avisar(u.error); else aplicar((l) => l.map((x) => (x.id === ev.id ? u.data.evento : x)));
      refrescar();
    });
    refrescar();
  };

  const eliminar = async (ev: Evento) => {
    aplicar((l) => l.map((x) => (x.id === ev.id ? { ...x, eliminado_en: new Date().toISOString() } : x)));
    const r = await eliminarEvento(ev.id);
    if (!r.ok) { avisar(r.error); refrescar(); return; }
    avisar("Eliminé el registro", async () => {
      const u = await restaurarEvento(ev.id);
      if (!u.ok) avisar(u.error); else aplicar((l) => l.map((x) => (x.id === ev.id ? u.data.evento : x)));
      refrescar();
    });
    refrescar();
  };

  const rapido = (k: Category) => {
    if (k === "sleep") return suenoAhora ? desperto() : iniciarSueno();
    setHoja(k === "feed" ? { tipo: "toma" } : { tipo: "panal" });
  };

  let hero: React.ReactNode, dock: React.ReactNode;
  if (pechoAhora) {
    const pp = pechoAhora.payload as Payload<"toma_pecho">;
    const s = segundosPecho(pp, true, ahora);
    const tile = (side: "izq" | "der", label: string, secs: number) => (
      <button type="button" className={`tz-big${pp.lado_activo === side ? " on" : ""}`} aria-pressed={pp.lado_activo === side} onClick={() => lado(side)}>
        <span className="text-label">{label}</span>
        <span className="text-title-lg tz-num">{fMinSeg(secs)}</span>
        {pp.lado_activo === side ? <span className="tz-live text-label tz-cat-feed"><span className="tz-live-dot" aria-hidden />En curso</span> : <span className="text-body-sm tz-muted">{pp.lado_activo ? "Tocar para cambiar" : "En pausa"}</span>}
      </button>
    );
    hero = (
      <section className="tz-hero tz-glass" aria-label="Toma de pecho en curso">
        <div className="tz-hero-state">
          <span className="tz-kicker text-label c-feed"><Icon name="bottle" size={16} />Toma de pecho</span>
          <p className="text-timer" role="timer">{fReloj(s.total)}</p>
          <p className="text-body tz-muted">Empezó a las {fHora(ms(pechoAhora.started_at), tz)} con el {pp.lado_inicial === "izq" ? "izquierdo" : "derecho"}.</p>
        </div>
        <div className="tz-grid2">{tile("izq", "Izquierdo", s.izq)}{tile("der", "Derecho", s.der)}</div>
      </section>
    );
    dock = (
      <div className="tz-dock">
        <div className="tz-grid2">
          <Button variant="glass" onClick={() => lado(pp.lado_activo === "izq" ? "der" : "izq")}>Cambiar a {pp.lado_activo === "izq" ? "derecho" : "izquierdo"}</Button>
          <Button variant="glass" icon={pp.lado_activo ? "pause" : "play"} onClick={() => lado(pp.lado_activo ? null : undefined)}>{pp.lado_activo ? "Pausar" : "Reanudar"}</Button>
        </div>
        <Button variant="primary" size="lg" icon="check" block onClick={terminarPecho}>Terminar toma</Button>
      </div>
    );
  } else if (suenoAhora) {
    const el = (ahora - ms(suenoAhora.started_at)) / 1000;
    const sp = suenoAhora.payload as Payload<"sueno">;
    const lt = ultimaToma ? describir(ultimaToma, opts) : null;
    hero = (
      <section className="tz-hero tz-glass" aria-label="Estado actual" style={{ alignItems: "center", textAlign: "center", paddingTop: 28 }}>
        <TimerRing category="sleep" size={232} progress={Math.min(1, el / 5400)} time={fReloj(el)} label="Durmiendo" caption={`desde ${fHora(ms(suenoAhora.started_at), tz)}`} />
        <p className="text-body tz-muted">{opts.esNoche(ms(suenoAhora.started_at)) ? "Noche" : "Siesta"} · {LUGAR[sp.lugar ?? "cuna"]}{sp.como_se_durmio ? `, ${COMO[sp.como_se_durmio]}` : ""}</p>
        <div className="tz-hero-facts" style={{ width: "calc(100% + 40px)", textAlign: "left" }}>
          <div><span className="text-label tz-muted">Dormido hoy</span><span className="text-body-strong tz-num">{fDuracion(sd.totalMin)}</span><span className="text-body-sm tz-muted">desde las 12 a.m.</span></div>
          <div><span className="text-label tz-muted">Última toma</span><span className="text-body-strong tz-num">{ultimaToma ? fHora(ms(ultimaToma.started_at), tz) : "—"}</span><span className="text-body-sm tz-muted">{lt ? lt.titulo : "Sin registro"}</span></div>
        </div>
      </section>
    );
    dock = (
      <div className="tz-dock">
        <Button variant="primary" size="lg" icon="sun" block onClick={desperto}>Despertó</Button>
        {limitado ? null : <Button variant="glass" block onClick={() => setHoja({ tipo: "detalle", evento: suenoAhora })}>Cambiar inicio o detalles</Button>}
      </div>
    );
  } else {
    const lt = ultimaToma ? describir(ultimaToma, opts) : null;
    const lp = ultimoPanal ? describir(ultimoPanal, opts) : null;
    hero = vivos.length ? (
      <section className="tz-hero tz-glass" aria-label="Estado actual">
        <div className="tz-hero-state">
          <span className="tz-kicker text-label c-sleep"><Icon name="sun" size={16} />Despierta</span>
          <p className="text-display tz-num">{ultimoSueno?.ended_at ? fHace(ms(ultimoSueno.ended_at), ahora) : "sin sueño registrado"}</p>
          {ultimoSueno?.ended_at ? <p className="text-body tz-muted">Se despertó a las {fHora(ms(ultimoSueno.ended_at), tz)} de {opts.esNoche(ms(ultimoSueno.started_at)) ? "la noche" : `una siesta de ${fDuracion((ms(ultimoSueno.ended_at) - ms(ultimoSueno.started_at)) / MIN)}`}.</p> : null}
        </div>
        <div className="tz-hero-facts three">
          <div><span className="text-label tz-muted">Última toma</span><span className="text-body-strong tz-num">{ultimaToma ? fHace(ms(ultimaToma.started_at), ahora) : "—"}</span><span className="text-body-sm tz-muted">{lt ? `${lt.titulo.replace("Toma de pecho", "Pecho")} · ${fHora(ms(ultimaToma!.started_at), tz)}` : "Sin registro"}</span></div>
          <div><span className="text-label tz-muted">Último pañal</span><span className="text-body-strong tz-num">{ultimoPanal ? fHace(ms(ultimoPanal.started_at), ahora) : "—"}</span><span className="text-body-sm tz-muted">{lp ? lp.detalle : "Sin registro"}</span></div>
          <div><span className="text-label tz-muted">Sueño hoy</span><span className="text-body-strong tz-num">{fDuracion(sd.totalMin)}</span><span className="text-body-sm tz-muted">{sd.siestas} {sd.siestas === 1 ? "siesta" : "siestas"}</span></div>
        </div>
      </section>
    ) : (
      <section className="tz-hero tz-glass" style={{ gap: 8 }}>
        <span className="tz-kicker text-label tz-muted">Primer día con Tereza</span>
        <p className="text-title-lg">¿Qué está haciendo {bebe.nombre} ahora?</p>
        <p className="text-body tz-muted">Empieza por ahí. Un toque guarda la hora; los detalles pueden esperar.</p>
      </section>
    );
    dock = <div className="tz-dock"><QuickActions categories={["sleep", "feed", "diaper"]} labels={{ sleep: "Iniciar sueño", feed: "Toma", diaper: "Pañal" }} onSelect={rapido} /></div>;
  }

  return (
    <main className="tz-main docked">
      <div className="tz-top">
        <span className="tz-baby">
          <span className="tz-avatar">{bebe.nombre.charAt(0)}</span>
          <span className="text-body-strong">{bebe.nombre}</span>
          <span className="text-body-sm tz-muted">{edadTexto(bebe.fecha_nacimiento, new Date(ahora), bebe.semanas_gestacion)}</span>
        </span>
        <div className="tz-top-actions">
          {limitado ? <span className="tz-tag">{p.yo.nombre}</span> : <span className="text-body-sm tz-muted tz-num">{fHora(ahora, tz)}</span>}
          <button className="tz-iconbtn" type="button" aria-label={noche ? "Cambiar a modo día" : "Cambiar a modo noche"} onClick={alternar}><Icon name={noche ? "sun" : "moon"} /></button>
        </div>
      </div>
      <div className="tz-cols">
        <div className="tz-stack s16">
          {hero}
          {!pechoAhora && !suenoAhora && vivos.length && !limitado ? <Prediccion eventos={vivos} bebe={{ fechaNacimiento: bebe.fecha_nacimiento, semanasGestacion: bebe.semanas_gestacion, nombre: bebe.nombre }} ajustes={a} ahora={ahora} /> : null}
          {alarmaPanales ? (
            <div className="tz-alert" role="note">
              <div className="tz-stack s4"><p className="text-body-strong tz-alert-title">{alarmaPanales.titulo}</p><p className="text-body-sm">{alarmaPanales.texto}</p></div>
            </div>
          ) : null}
          {limitado ? <div className="tz-banner"><p className="text-body-sm">Puedes registrar tomas, pañales y sueño, y ver lo de hoy. Para salud o días anteriores, pregúntale a quien administra el hogar.</p></div> : null}
          {dock}
        </div>
        <section className="tz-stack" aria-label="Registros de hoy">
          <div className="tz-sec"><h2 className="text-title">Hoy</h2><span className="text-body-sm tz-muted">{fFecha(ahora, tz)}</span></div>
          {deHoy.length ? (
            <div className="tz-list tz-glass">
              {deHoy.slice(0, limitado ? 20 : 8).map((e) => {
                const d = describir(e, opts);
                const quien = p.nombres[e.logged_by] ?? "";
                const cat = CAT[d.cat];
                const ago = d.enCurso ? null : ahora - ms(e.started_at) < 6 * 3_600_000 ? fHace(ms(e.started_at), ahora) : etiquetaDia(ms(e.started_at), ahora, tz);
                const detalle = d.detalle + (e.source === "mcp" ? ` · ${quien} desde Claude` : "");
                return cat ? (
                  <LogCard key={e.id} category={cat} title={d.titulo} detail={detalle} time={fHora(ms(e.started_at), tz)} ago={ago} running={d.enCurso} onClick={limitado ? undefined : () => setHoja({ tipo: "detalle", evento: e })} />
                ) : (
                  <button key={e.id} type="button" className="tz-logcard tz-glass is-action" onClick={limitado ? undefined : () => setHoja({ tipo: "detalle", evento: e })}>
                    <span className={`tz-icchip ${d.cat === "temp" ? "temp" : ""}`} aria-hidden>{d.cat === "temp" ? "🌡" : "✎"}</span>
                    <span className="tz-logcard-main"><span className="text-body-strong tz-ink">{d.titulo}</span><span className="text-body-sm tz-muted">{detalle}</span></span>
                    <span className="tz-logcard-meta"><span className="text-body-strong tz-ink tz-num">{fHora(ms(e.started_at), tz)}</span>{ago ? <span className="text-body-sm tz-muted">{ago}</span> : null}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="tz-sunken tz-stack s8" style={{ padding: 20, alignItems: "flex-start" }}>
              <p className="text-body">Lo que registres hoy aparecerá aquí, en orden.</p>
            </div>
          )}
        </section>
      </div>
      <Hojas hoja={hoja} cerrar={() => setHoja(null)} registrar={registrar} eliminar={eliminar} ajustes={a} ahora={ahora} eventos={vivos} bebe={bebe} tratamientos={p.tratamientos} limitado={limitado} nombres={p.nombres} alCorregir={(ev) => { aplicar((l) => l.map((x) => (x.id === ev.id ? ev : x))); refrescar(); }} />
    </main>
  );
}
