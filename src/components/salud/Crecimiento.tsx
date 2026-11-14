"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/tz";
import { Field, Seg } from "@/components/tz/forms";
import { useAviso } from "@/components/hoy/Aviso";
import { registrarMedida, eliminarMedida } from "@/lib/acciones/salud";
import { curvas, edadDias, percentil, textoPercentil, type Indicador } from "@/lib/core/crecimiento";
import { fFecha, desdeLocal, fechaISO } from "@/lib/core/tiempo";
import { fLongitud, fLongitudAlt, fPeso, fPesoAlt, lbOzAGramos, longitudAMm, type UnidadLongitud, type UnidadPeso } from "@/lib/core/unidades";
import type { Bebe } from "@/components/hoy/Hoy";

type Medida = { id: string; medido_en: string; peso_g: number | null; longitud_mm: number | null; perimetro_cefalico_mm: number | null; origen: string };
const NOMBRE: Record<Indicador, string> = { peso: "Peso", longitud: "Longitud", perimetro: "Perímetro cefálico" };

function Grafica({ ind, bebe, medidas }: { ind: Indicador; bebe: Bebe; medidas: Medida[] }) {
  const sexo = bebe.sexo as "M" | "F";
  const valor = (m: Medida) => (ind === "peso" ? (m.peso_g ?? 0) / 1000 : ind === "longitud" ? (m.longitud_mm ?? 0) / 10 : (m.perimetro_cefalico_mm ?? 0) / 10);
  const pts = medidas.filter((m) => valor(m) > 0).map((m) => ({ x: edadDias(bebe.fecha_nacimiento, new Date(m.medido_en).getTime(), bebe.semanas_gestacion), y: valor(m) })).filter((p) => p.x <= 731);
  const maxX = Math.min(731, Math.max(183, ...pts.map((p) => p.x + 60)));
  const xs = Array.from({ length: 41 }, (_, i) => (i / 40) * maxX);
  const cs = xs.map((x) => curvas(ind, sexo, x)!);
  const minY = Math.min(...cs.map((c) => c.p3), ...pts.map((p) => p.y)) * 0.95, maxY = Math.max(...cs.map((c) => c.p97), ...pts.map((p) => p.y)) * 1.03;
  const W = 340, H = 220, L = 34, B = 22;
  const px = (x: number) => L + (x / maxX) * (W - L - 8), py = (y: number) => H - B - ((y - minY) / (maxY - minY)) * (H - B - 8);
  const linea = (k: "p3" | "p15" | "p50" | "p85" | "p97") => xs.map((x, i) => `${i ? "L" : "M"}${px(x).toFixed(1)},${py(cs[i][k]).toFixed(1)}`).join(" ");
  const banda = `${linea("p15")} ${[...xs].reverse().map((x, i) => `L${px(x).toFixed(1)},${py(cs[xs.length - 1 - i].p85).toFixed(1)}`).join(" ")} Z`;
  const meses = Array.from({ length: Math.floor(maxX / 30.4375) + 1 }, (_, i) => i).filter((m) => m % (maxX > 400 ? 3 : 1) === 0);
  const unidad = ind === "peso" ? "kg" : "cm";
  return (
    <figure className="tz-card lg tz-glass tz-growth" style={{ margin: 0 }}>
      <figcaption className="text-title" style={{ marginBottom: 8 }}>{NOMBRE[ind]} para la edad</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${NOMBRE[ind]}: ${pts.length} medidas sobre las curvas P3 a P97 de la OMS`}>
        {meses.map((m) => <g key={m}><line className="grid" x1={px(m * 30.4375)} x2={px(m * 30.4375)} y1={8} y2={H - B} /><text className="lbl" x={px(m * 30.4375)} y={H - 6} textAnchor="middle">{m}</text></g>)}
        <path className="band" d={banda} />
        {(["p3", "p97"] as const).map((k) => <path key={k} className="pl" d={linea(k)} />)}
        <path className="p50" d={linea("p50")} />
        <text className="lbl" x={W - 4} y={py(cs.at(-1)!.p97) - 4} textAnchor="end">P97</text>
        <text className="lbl" x={W - 4} y={py(cs.at(-1)!.p50) - 4} textAnchor="end">P50</text>
        <text className="lbl" x={W - 4} y={py(cs.at(-1)!.p3) + 12} textAnchor="end">P3</text>
        <text className="lbl" x={4} y={14}>{unidad}</text>
        {pts.length > 1 ? <path className="me" d={pts.map((p, i) => `${i ? "L" : "M"}${px(p.x)},${py(p.y)}`).join(" ")} /> : null}
        {pts.map((p, i) => <circle key={i} className="pt" cx={px(p.x)} cy={py(p.y)} r={5} />)}
      </svg>
      <p className="text-body-sm tz-muted">Meses de edad{bebe.semanas_gestacion && bebe.semanas_gestacion < 37 ? " corregida" : ""}. Banda: P15 a P85.</p>
    </figure>
  );
}

export function Crecimiento({ bebe, medidas, unidades, tz }: { bebe: Bebe; medidas: Medida[]; unidades: { peso: UnidadPeso; longitud: UnidadLongitud }; tz: string }) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [ind, setInd] = useState<Indicador>("peso");
  const [hoyISO] = useState(() => fechaISO(Date.now(), tz));
  const [fecha, setFecha] = useState(hoyISO);
  const [origen, setOrigen] = useState<"casa" | "consulta">("consulta");
  const [lb, setLb] = useState(""), [oz, setOz] = useState(""), [kg, setKg] = useState("");
  const [lon, setLon] = useState(""), [per, setPer] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const n = (s: string) => Number(s.replace(",", "."));
  const pesoG = unidades.peso === "lb" ? (lb || oz ? lbOzAGramos(n(lb || "0"), n(oz || "0")) : null) : kg ? Math.round(n(kg) * 1000) : null;
  const longitudMm = lon ? longitudAMm(n(lon), unidades.longitud) : null;
  const perimetroMm = per ? longitudAMm(n(per), unidades.longitud) : null;
  const guardar = async () => {
    setOcupado(true);
    const [y, m, d] = fecha.split("-").map(Number);
    const r = await registrarMedida({ babyId: bebe.id, medidoEn: new Date(desdeLocal(tz, y, m, d, 12)).toISOString(), pesoG, longitudMm, perimetroMm, origen });
    setOcupado(false);
    if (!r.ok) return avisar(r.error);
    const partes = [pesoG ? `${fPeso(pesoG, unidades.peso)} (${r.data.percentiles.peso})` : null, longitudMm ? `${fLongitud(longitudMm, unidades.longitud)} (${r.data.percentiles.longitud})` : null, perimetroMm ? `cabeza ${fLongitud(perimetroMm, unidades.longitud)} (${r.data.percentiles.perimetro})` : null].filter(Boolean);
    avisar(`Guardé: ${partes.join(", ")}`, async () => { const e = await eliminarMedida(r.data.id); if (!e.ok) avisar(e.error); router.refresh(); });
    setLb(""); setOz(""); setKg(""); setLon(""); setPer("");
    router.refresh();
  };
  const sexo = bebe.sexo as "M" | "F";
  return (
    <div className="tz-cols">
      <div className="tz-stack s16">
        <Seg label="Indicador" value={ind} onChange={setInd} options={[{ v: "peso", l: "Peso" }, { v: "longitud", l: "Longitud" }, { v: "perimetro", l: "Cabeza" }]} />
        <Grafica ind={ind} bebe={bebe} medidas={medidas} />
        {medidas.length ? (
          <div className="tz-card tz-glass" style={{ overflowX: "auto" }}>
            <table className="tz-table">
              <thead><tr><th>Fecha</th><th>Peso</th><th>Longitud</th><th>Cabeza</th></tr></thead>
              <tbody>
                {[...medidas].reverse().map((m) => {
                  const dias = edadDias(bebe.fecha_nacimiento, new Date(m.medido_en).getTime(), bebe.semanas_gestacion);
                  return (
                    <tr key={m.id}>
                      <td>{fFecha(new Date(m.medido_en).getTime(), tz)}<br /><span className="text-body-sm tz-muted">{m.origen}</span></td>
                      <td>{m.peso_g ? <>{fPeso(m.peso_g, unidades.peso)}<br /><span className="text-body-sm tz-muted">{textoPercentil(percentil("peso", sexo, dias, m.peso_g / 1000))}</span></> : "—"}</td>
                      <td>{m.longitud_mm ? <>{fLongitud(m.longitud_mm, unidades.longitud)}<br /><span className="text-body-sm tz-muted">{textoPercentil(percentil("longitud", sexo, dias, m.longitud_mm / 10))}</span></> : "—"}</td>
                      <td>{m.perimetro_cefalico_mm ? fLongitud(m.perimetro_cefalico_mm, unidades.longitud) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-body tz-muted">Aún no hay medidas. La primera puede ser la del nacimiento.</p>}
      </div>
      <section className="tz-card lg tz-glass tz-stack s16" aria-label="Registrar medida">
        <h2 className="text-title">Registrar medida</h2>
        <div className="tz-grid2">
          <Field label="Fecha" id="m-f"><input id="m-f" type="date" className="tz-input" max={hoyISO} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
          <Field label="Dónde"><Seg label="Origen" value={origen} onChange={setOrigen} options={[{ v: "casa", l: "Casa" }, { v: "consulta", l: "Consulta" }]} /></Field>
        </div>
        {unidades.peso === "lb" ? (
          <Field label="Peso" help={pesoG ? `= ${fPesoAlt(pesoG, "lb")}` : "Libras y onzas, como lo dice la báscula: 15 lb 8 oz."}>
            <div className="tz-grid2">
              <input aria-label="Libras" className="tz-input tz-num" inputMode="numeric" placeholder="lb" value={lb} onChange={(e) => setLb(e.target.value.replace(/[^\d]/g, ""))} />
              <input aria-label="Onzas" className="tz-input tz-num" inputMode="decimal" placeholder="oz" value={oz} onChange={(e) => setOz(e.target.value.replace(/[^\d.,]/g, ""))} />
            </div>
          </Field>
        ) : (
          <Field label="Peso (kg)" id="m-kg" help={pesoG ? `= ${fPesoAlt(pesoG, "kg")}` : undefined}><input id="m-kg" className="tz-input tz-num" inputMode="decimal" placeholder="Ej.: 7.05" value={kg} onChange={(e) => setKg(e.target.value)} /></Field>
        )}
        <div className="tz-grid2">
          <Field label={`Longitud (${unidades.longitud})`} id="m-l" help={longitudMm ? `= ${fLongitudAlt(longitudMm, unidades.longitud)}` : "Opcional"}><input id="m-l" className="tz-input tz-num" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} /></Field>
          <Field label={`Cabeza (${unidades.longitud})`} id="m-p" help={perimetroMm ? `= ${fLongitudAlt(perimetroMm, unidades.longitud)}` : "Opcional"}><input id="m-p" className="tz-input tz-num" inputMode="decimal" value={per} onChange={(e) => setPer(e.target.value)} /></Field>
        </div>
        {unidades.peso === "lb" && oz && n(oz) >= 16 ? <p role="alert" className="text-body-sm c-danger">Las onzas van de 0 a 15. Revisa el peso.</p> : null}
        <Button variant="primary" size="lg" block disabled={ocupado || !(pesoG || longitudMm || perimetroMm) || (unidades.peso === "lb" && n(oz || "0") >= 16)} onClick={guardar}>Guardar medida</Button>
        <p className="tz-help">Te mostramos el percentil de la OMS para su edad. Es una comparación, no un diagnóstico.</p>
      </section>
    </div>
  );
}
