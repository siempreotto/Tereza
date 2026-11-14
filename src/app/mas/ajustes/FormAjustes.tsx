"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/tz";
import { Field, Seg } from "@/components/tz/forms";
import { guardarAjustes } from "@/lib/acciones/ajustes";
import { useAviso } from "@/components/hoy/Aviso";
import type { Ajustes } from "@/lib/datos/hoy";
import type { PlanFijo } from "@/lib/core/sueno";

const ZONAS = ["America/Guatemala", "America/Mexico_City", "America/El_Salvador", "America/Tegucigalpa", "America/Managua", "America/Costa_Rica", "America/Panama", "America/Bogota", "America/Lima", "America/Santiago", "America/Argentina/Buenos_Aires", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/Madrid"];

/** Horario fijo inicial según la referencia por edad (despertar 6:30, siestas en el punto medio de cada ventana). */
function horarioInicial(siestas: number, ventana: [number, number] | undefined, horaDormir: string): PlanFijo {
  const hh = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const w = ventana ? Math.round((ventana[0] + ventana[1]) / 2 / 15) * 15 : 180;
  const lista: PlanFijo["siestas"] = [];
  let t = 6 * 60 + 30;
  for (let i = 0; i < siestas; i++) { t += i === 0 ? w : w + 30; lista.push({ inicio: hh(t), duracion_min: siestas === 1 ? 120 : 75 }); t += siestas === 1 ? 120 : 75; }
  return { despertar: "06:30", siestas: lista, dormir: horaDormir };
}

export function FormAjustes({ ajustes: a, admin, nombre, referencia }: { ajustes: Ajustes; admin: boolean; nombre: string; referencia: { texto: string; siestas: number; ventana: [number, number] } | null }) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [v, setV] = useState({
    unidad_volumen: a.unidadVolumen, unidad_peso: a.unidadPeso, unidad_longitud: a.unidadLongitud, zona_horaria: a.tz,
    noche_ui_modo: a.nocheUiModo, noche_ui_desde: a.nocheUiDesde, noche_ui_hasta: a.nocheUiHasta,
    sueno_noche_desde: a.nocheDesde, sueno_noche_hasta: a.nocheHasta, hora_dormir: a.horaDormir,
    plan_modo: a.planModo ?? "auto",
  });
  const [fijo, setFijo] = useState<PlanFijo>(a.planFijo ?? horarioInicial(referencia?.siestas ?? 2, referencia?.ventana, a.horaDormir));
  const [ocupado, setOcupado] = useState(false);
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((o) => ({ ...o, [k]: x }));
  const nSiestas = (n: number) => setFijo((f) => {
    const base = horarioInicial(n, referencia?.ventana, f.dormir);
    return { ...f, siestas: base.siestas.map((s, i) => f.siestas[i] ?? s) };
  });
  const guardar = async () => {
    setOcupado(true);
    const r = await guardarAjustes({ ...v, plan_fijo: v.plan_modo === "fijo" ? fijo : a.planFijo ?? null });
    setOcupado(false);
    if (!r.ok) { avisar(r.error); return; }
    avisar("Guardé los ajustes.");
    router.refresh();
  };
  const hora = (id: string, label: string, valor: string, cambiar: (x: string) => void) => (
    <Field label={label} id={id}><input id={id} className="tz-input tz-num" type="time" value={valor} disabled={!admin} onChange={(e) => e.target.value && cambiar(e.target.value)} /></Field>
  );
  return (
    <div className="tz-stack s16">
      <section className="tz-card tz-glass tz-stack s16" aria-labelledby="aj-plan">
        <h2 id="aj-plan" className="text-title">Siestas y horario</h2>
        <Seg label="Cómo se arma el plan del día" value={v.plan_modo} onChange={(x) => admin && set("plan_modo", x)} options={[{ v: "auto", l: "Automático" }, { v: "fijo", l: "Horario fijo" }]} />
        {v.plan_modo === "auto" ? (
          <p className="text-body">Tereza aprende de los registros de {nombre}: a qué hora despierta, cuántas siestas hace, cuánto duran y a qué hora se duerme. Mientras junta unos días, usa la referencia por edad.{referencia ? ` ${referencia.texto}.` : ""}</p>
        ) : (
          <div className="tz-stack s16">
            <p className="text-body">El plan sigue tu horario. Si un día despierta más tarde, las siestas y la hora de dormir se corren con ese despertar.</p>
            <Seg label="Siestas al día" value={String(fijo.siestas.length)} onChange={(x) => admin && nSiestas(Number(x))} options={[{ v: "0", l: "0" }, { v: "1", l: "1" }, { v: "2", l: "2" }, { v: "3", l: "3" }, { v: "4", l: "4" }]} />
            <div className="tz-timefield">{hora("aj-desp", "Despierta", fijo.despertar, (x) => setFijo((f) => ({ ...f, despertar: x })))}{hora("aj-dorm", "Se duerme", fijo.dormir, (x) => setFijo((f) => ({ ...f, dormir: x })))}</div>
            {fijo.siestas.map((s, i) => (
              <div key={i} className="tz-timefield">
                {hora(`aj-s${i}`, `Siesta ${i + 1}: empieza`, s.inicio, (x) => setFijo((f) => ({ ...f, siestas: f.siestas.map((y, j) => (j === i ? { ...y, inicio: x } : y)) })))}
                <Field label={`Siesta ${i + 1}: dura (min)`} id={`aj-d${i}`}><input id={`aj-d${i}`} className="tz-input tz-num" type="number" min={10} max={240} step={5} value={s.duracion_min} disabled={!admin} onChange={(e) => setFijo((f) => ({ ...f, siestas: f.siestas.map((y, j) => (j === i ? { ...y, duracion_min: Math.max(10, Math.min(240, Number(e.target.value) || 0)) } : y)) }))} /></Field>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="tz-card tz-glass tz-stack s16" aria-labelledby="aj-sueno">
        <h2 id="aj-sueno" className="text-title">Noche</h2>
        {hora("aj-hd", "Hora de dormir habitual", v.hora_dormir, (x) => set("hora_dormir", x))}
        <p className="text-body-sm tz-muted">Un sueño cuenta como noche si empieza entre estas horas:</p>
        <div className="tz-timefield">{hora("aj-nd", "Desde", v.sueno_noche_desde, (x) => set("sueno_noche_desde", x))}{hora("aj-nh", "Hasta", v.sueno_noche_hasta, (x) => set("sueno_noche_hasta", x))}</div>
      </section>

      <section className="tz-card tz-glass tz-stack s16" aria-labelledby="aj-pant">
        <h2 id="aj-pant" className="text-title">Pantalla y unidades</h2>
        <Seg label="Modo noche" value={v.noche_ui_modo} onChange={(x) => admin && set("noche_ui_modo", x)} options={[{ v: "auto", l: "Por horario" }, { v: "on", l: "Siempre" }, { v: "off", l: "Nunca" }]} />
        {v.noche_ui_modo === "auto" ? <div className="tz-timefield">{hora("aj-ud", "Modo noche desde", v.noche_ui_desde, (x) => set("noche_ui_desde", x))}{hora("aj-uh", "Hasta", v.noche_ui_hasta, (x) => set("noche_ui_hasta", x))}</div> : null}
        <Seg label="Volumen" value={v.unidad_volumen} onChange={(x) => admin && set("unidad_volumen", x)} options={[{ v: "oz", l: "oz" }, { v: "ml", l: "ml" }]} />
        <Seg label="Peso" value={v.unidad_peso} onChange={(x) => admin && set("unidad_peso", x)} options={[{ v: "lb", l: "lb y oz" }, { v: "kg", l: "kg" }]} />
        <Seg label="Longitud" value={v.unidad_longitud} onChange={(x) => admin && set("unidad_longitud", x)} options={[{ v: "in", l: "pulgadas" }, { v: "cm", l: "cm" }]} />
        <Field label="Zona horaria" id="aj-tz">
          <select id="aj-tz" className="tz-input" value={v.zona_horaria} disabled={!admin} onChange={(e) => set("zona_horaria", e.target.value)}>
            {(ZONAS.includes(v.zona_horaria) ? ZONAS : [v.zona_horaria, ...ZONAS]).map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
          </select>
        </Field>
      </section>
      {admin ? <Button variant="primary" size="lg" block onClick={guardar} disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar ajustes"}</Button> : null}
    </div>
  );
}
