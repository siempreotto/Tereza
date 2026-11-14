"use client";
import { useState } from "react";
import { cuentaRegresiva, nombreBloque, type Bloque, type PlanDia as Plan } from "@/lib/core/planDia";
import { DIA, fDuracion, fHora, inicioDia, MIN } from "@/lib/core/tiempo";

type PlanOk = Extract<Plan, { estado: "ok" }>;

const FUENTE: Record<Bloque["fuente"], string> = { registro: "registrado", registros: "por sus registros", edad: "referencia por edad", horario: "tu horario" };

/** Reloj de 24 h (medianoche arriba) con la noche, las siestas (reales sólidas, estimadas punteadas) y la hora actual. */
function Reloj({ plan, ahora, tz }: { plan: PlanOk; ahora: number; tz: string }) {
  const D = inicioDia(ahora, tz);
  const R = 92, C = 110, ancho = 16;
  const ang = (t: number) => ((((t - D) / DIA) * 360 - 90) * Math.PI) / 180;
  const pt = (t: number, r = R) => [C + r * Math.cos(ang(t)), C + r * Math.sin(ang(t))] as const;
  const arco = (a: number, b: number) => {
    const ini = Math.max(D, Math.min(a, D + DIA - MIN)), fin = Math.max(ini + MIN, Math.min(b, D + DIA - MIN));
    const [x1, y1] = pt(ini), [x2, y2] = pt(fin);
    return `M ${x1} ${y1} A ${R} ${R} 0 ${fin - ini > DIA / 2 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const desp = plan.bloques.find((b) => b.tipo === "despertar")!;
  const dormir = plan.bloques.find((b) => b.tipo === "dormir")!;
  const segs: { d: string; real: boolean }[] = [
    { d: arco(D, desp.hora), real: desp.estado === "hecho" },
    ...plan.bloques.filter((b) => b.tipo === "siesta").map((b) => ({ d: arco(b.hora, b.fin ?? b.hora + 60 * MIN), real: b.estado !== "estimado" })),
    { d: arco(dormir.hora, D + DIA), real: dormir.estado !== "estimado" },
  ];
  const [nx, ny] = pt(ahora, R);
  const marcas = [0, 6, 12, 18].map((h) => {
    const [x, y] = pt(D + h * 3_600_000, R - 22);
    return <text key={h} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="tz-num" style={{ fontSize: 11, fill: "var(--ink-muted)", opacity: 0.7 }}>{h === 0 ? "12 a.m." : h === 12 ? "12 p.m." : h === 6 ? "6" : "18"}</text>;
  });
  return (
    <svg viewBox="0 0 220 220" width="100%" style={{ maxWidth: 240, display: "block", margin: "0 auto" }} aria-hidden>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--track)" strokeWidth={ancho} />
      {segs.map((s, i) => (
        <path key={i} d={s.d} fill="none" stroke={s.real ? "var(--cat-sleep)" : "var(--cat-sleep-soft)"} strokeWidth={ancho} strokeLinecap="round" strokeDasharray={s.real ? undefined : "2 6"} style={s.real ? undefined : { stroke: "var(--cat-sleep)", opacity: 0.55 }} />
      ))}
      {marcas}
      <circle cx={nx} cy={ny} r={7} fill="var(--primary)" stroke="var(--surface)" strokeWidth={3} />
    </svg>
  );
}

export function PlanDia({ plan, ahora, tz, nombre }: { plan: Plan; ahora: number; tz: string; nombre: string }) {
  const [porQue, setPorQue] = useState(false);
  if (plan.estado !== "ok") {
    return <div className="tz-card tz-glass tz-stack s8"><span className="text-label tz-muted">Plan de hoy</span><p className="text-body">{plan.razon}</p></div>;
  }
  const cr = cuentaRegresiva(plan, ahora, tz);
  return (
    <section className="tz-card lg tz-glass tz-stack s16" aria-labelledby="plan-t">
      <div className="tz-h between top">
        <div className="tz-stack s4">
          <h2 id="plan-t" className="text-label tz-muted">Plan de hoy · estimación</h2>
          {cr ? <p className="text-title-lg tz-num">{cr.titulo}</p> : <p className="text-title-lg">Día completo</p>}
          {cr?.detalle ? <p className="text-body tz-muted tz-num">{cr.detalle}</p> : null}
        </div>
        <span className="tz-tag primary">Confianza {plan.confianza}</span>
      </div>
      <Reloj plan={plan} ahora={ahora} tz={tz} />
      <ol className="tz-plan" aria-label="Bloques del día">
        {plan.bloques.map((b, i) => {
          const sig = plan.siguiente === b;
          const horas = b.estado === "estimado"
            ? b.tipo === "despertar" ? `cerca de las ${fHora(b.hora, tz)}` : `entre ${fHora(b.desde, tz)} y ${fHora(b.hasta, tz)}`
            : b.tipo === "siesta" && b.fin ? `${fHora(b.desde, tz)} – ${b.estado === "en_curso" ? "ahora" : fHora(b.fin, tz)}` : fHora(b.hora, tz);
          return (
            <li key={i} className={`tz-plan-item${sig ? " on" : ""}${b.estado === "hecho" ? " hecho" : ""}`} aria-current={sig ? "step" : undefined}>
              <span className="tz-plan-dot" aria-hidden>{b.estado === "hecho" ? "✓" : ""}</span>
              <span className="grow tz-stack" style={{ gap: 0 }}>
                <span className="text-body-strong">{nombreBloque(b, plan.siestas)}{b.estado === "en_curso" ? " · en curso" : ""}</span>
                <span className="text-body-sm tz-muted tz-num">{horas}{b.tipo === "siesta" && b.duracionMin && b.estado !== "hecho" ? ` · ≈ ${fDuracion(b.duracionMin)}` : b.tipo === "siesta" && b.duracionMin ? ` · ${fDuracion(b.duracionMin)}` : ""}</span>
              </span>
              <span className="text-body-sm tz-muted">{FUENTE[b.fuente]}</span>
            </li>
          );
        })}
      </ol>
      {plan.avisos.map((a) => <p key={a} className="text-body-sm c-warning">{a}</p>)}
      <button type="button" className="tz-row tz-sunken" style={{ borderRadius: 18 }} aria-expanded={porQue} onClick={() => setPorQue(!porQue)}>
        <span className="grow text-body-strong">¿Cómo se calcula?</span>
        <span className="chev" aria-hidden style={{ transform: porQue ? "rotate(180deg)" : undefined }}>⌄</span>
      </button>
      {porQue ? (
        <div className="tz-stack s8">
          <p className="text-body">
            {plan.fuenteSiestas === "horario" ? `Usa tu horario fijo de ${plan.siestas} siesta${plan.siestas === 1 ? "" : "s"}.` : plan.fuenteSiestas === "registros" ? `En sus últimos días hizo ${plan.siestas} siesta${plan.siestas === 1 ? "" : "s"}; el plan sigue sus registros.` : `${plan.referencia.texto}. Cuando registres unos días, el plan se ajusta a ${nombre}.`}
          </p>
          {plan.bloques.filter((b) => b.estado !== "hecho").map((b, i) => <p key={i} className="text-body-sm"><strong>{nombreBloque(b, plan.siestas)}:</strong> {b.porQue}</p>)}
          <p className="text-body-sm tz-muted">{plan.nota} Es una referencia práctica, no una regla. Puedes fijar tu propio horario en Más › Ajustes.</p>
        </div>
      ) : null}
    </section>
  );
}
