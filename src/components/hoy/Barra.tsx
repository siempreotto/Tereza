"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BottomNav, Button, Icon, type NavItem } from "@/components/tz";
import { CategoryIcon } from "@/components/tz";
import { edadTexto } from "@/lib/core/edad";

const NAV: NavItem[] = [
  { key: "hoy", label: "Hoy", icon: "home" },
  { key: "diario", label: "Diario", icon: "clock" },
  { key: "salud", label: "Salud", icon: "stethoscope" },
  { key: "mas", label: "Más", icon: "chart" },
];
const RUTAS: Record<string, string> = { hoy: "/", diario: "/diario", salud: "/salud-bebe", mas: "/mas" };
const LIMITADO = ["hoy", "mas"];

/** Barra inferior (móvil) y lateral (escritorio). El botón + abre el menú de registro (evento global). */
export function Barra({ activa, rol, bebe, yo }: { activa: string; rol: "admin" | "cuidador" | "limitado"; bebe: { nombre: string; fecha_nacimiento: string; semanas_gestacion: number | null }; yo: string }) {
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const items = rol === "limitado" ? NAV.filter((n) => LIMITADO.includes(n.key)) : NAV;
  const ir = (k: string) => { const r = RUTAS[k]; if (r && r !== path) router.push(r); };
  const abrir = () => setMenu(true);
  const elegir = (tipo: string) => { setMenu(false); window.dispatchEvent(new CustomEvent("tereza:registrar", { detail: tipo })); };
  const opciones = [
    { k: "sueno", l: "Sueño", cat: "sleep" as const }, { k: "toma", l: "Toma", cat: "feed" as const }, { k: "panal", l: "Pañal", cat: "diaper" as const },
    ...(rol === "limitado" ? [] : [{ k: "medicamento", l: "Medicamento", cat: "meds" as const }, { k: "temperatura", l: "Temperatura o síntoma", cat: "doctor" as const }, { k: "nota", l: "Nota", cat: "growth" as const }]),
  ];
  return (
    <>
      <aside className="tz-side">
        <p className="tz-logo">Tereza</p>
        <span className="tz-baby"><span className="tz-avatar">{bebe.nombre.charAt(0)}</span><span className="tz-stack" style={{ gap: 0, textAlign: "left" }}><span className="text-body-strong">{bebe.nombre}</span><span className="text-body-sm tz-muted">{edadTexto(bebe.fecha_nacimiento, new Date(), bebe.semanas_gestacion)}</span></span></span>
        <Button variant="primary" icon="plus" block onClick={abrir}>Registrar</Button>
        <nav className="tz-side-nav" aria-label="Principal">
          {items.map((n) => (
            <button key={n.key} type="button" className={`tz-side-link${activa === n.key ? " on" : ""}`} aria-current={activa === n.key ? "page" : undefined} style={{ background: activa === n.key ? undefined : "transparent", border: 0, cursor: "pointer", width: "100%" }} onClick={() => ir(n.key)}>
              <Icon name={n.icon} size={22} />{n.label}
            </button>
          ))}
        </nav>
        <div className="tz-side-foot"><span className="tz-avatar sm">{yo.charAt(0)}</span><span className="text-body-sm">{yo}</span></div>
      </aside>
      <div className="tz-bottom"><BottomNav items={items} active={activa} addLabel="Registrar" onSelect={ir} onAdd={abrir} /></div>
      {menu ? (
        <>
          <div className="tz-scrim" onClick={() => setMenu(false)} />
          <section className="tz-sheet" role="dialog" aria-modal="true" aria-label="Registrar">
            <span className="tz-grab" aria-hidden />
            <div className="tz-sheet-head"><h2 className="text-title-lg">Registrar</h2><button className="tz-iconbtn plain" type="button" aria-label="Cerrar" onClick={() => setMenu(false)}>×</button></div>
            <div className="tz-grid2">
              {opciones.map((o) => (
                <button key={o.k} type="button" className="tz-big" style={{ minHeight: 88 }} onClick={() => elegir(o.k)}><CategoryIcon category={o.cat} /><span>{o.l}</span></button>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
