"use client";
import { useState } from "react";
import type { Evento } from "@/lib/core/eventos";
import { predecir, type Hogar } from "@/lib/core/sueno";
import { fDuracion, fHora, MIN } from "@/lib/core/tiempo";

export function Prediccion({ eventos, bebe, ajustes, ahora }: { eventos: Evento[]; bebe: { fechaNacimiento: string; semanasGestacion: number | null; nombre: string }; ajustes: Hogar; ahora: number }) {
  const [porQue, setPorQue] = useState(false);
  const p = predecir(eventos, bebe, ahora, ajustes);
  if (p.estado === "durmiendo") return null;
  if (p.estado === "sin_prediccion") {
    return (
      <div className="tz-card tz-glass tz-stack s8">
        <span className="text-label tz-muted">Próxima siesta</span>
        <p className="text-body">{p.razon}</p>
      </div>
    );
  }
  const tz = ajustes.tz;
  const span = p.hasta - p.ultimoDespertar;
  const pct = (x: number) => Math.max(0, Math.min(100, ((x - p.ultimoDespertar) / (span + 40 * MIN)) * 100));
  const CONF = { alta: "alta", media: "media", baja: "baja" } as const;
  return (
    <section className="tz-card lg tz-glass tz-stack s16" aria-label="Estimación de la próxima siesta">
      <div className="tz-h between top">
        <div className="tz-stack s4">
          <span className="text-label tz-muted">{p.tipo === "siesta" ? "Próxima siesta" : "Hora de dormir"} · estimación</span>
          <p className="text-title-lg tz-num">entre {fHora(p.desde, tz)} y {fHora(p.hasta, tz)}</p>
        </div>
        <span className="tz-tag primary">Confianza {CONF[p.confianza]}</span>
      </div>
      <div className="tz-stack s8" aria-hidden>
        <div style={{ position: "relative", height: 12, borderRadius: 999, background: "var(--track)" }}>
          <div style={{ position: "absolute", left: 0, width: `${pct(ahora)}%`, top: 0, bottom: 0, borderRadius: 999, background: "var(--cat-sleep-soft)", boxShadow: "inset 0 0 0 1.5px var(--cat-sleep)" }} />
          <div style={{ position: "absolute", left: `${pct(p.desde)}%`, width: `${pct(p.hasta) - pct(p.desde)}%`, top: -4, bottom: -4, borderRadius: 999, background: "var(--primary)" }} />
          <div style={{ position: "absolute", left: `${pct(ahora)}%`, top: -8, bottom: -8, width: 2, marginLeft: -1, background: "var(--ink)", borderRadius: 2 }} />
        </div>
        <div className="tz-h between text-body-sm tz-muted tz-num"><span>Despertó {fHora(p.ultimoDespertar, tz)}</span><span className="tz-strong" style={{ color: "var(--ink)" }}>Ahora {fHora(ahora, tz)}</span></div>
      </div>
      <button type="button" className="tz-row tz-sunken" style={{ borderRadius: 18 }} aria-expanded={porQue} onClick={() => setPorQue(!porQue)}>
        <span className="grow text-body-strong">¿Por qué esta franja?</span>
        <span className="chev" aria-hidden style={{ transform: porQue ? "rotate(180deg)" : undefined }}>⌄</span>
      </button>
      {porQue ? (
        <div className="tz-stack s8">
          <p className="text-body">{p.base} La referencia por edad es de {fDuracion(p.rangoEdadMin[0])} a {fDuracion(p.rangoEdadMin[1])}{p.ajustadoAlRango ? ", y ajustamos el valor para quedar dentro de ella" : ""}.</p>
          {p.avisos.map((n) => <p key={n} className="text-body-sm c-warning">{n}</p>)}
          <p className="text-body-sm tz-muted">Estimación basada en la edad de {bebe.nombre} y en sus últimos registros. Es una referencia práctica, no una regla.</p>
        </div>
      ) : null}
    </section>
  );
}
