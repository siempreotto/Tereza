"use client";
// Piezas de formulario de Tereza (de referencia/prototipo/ui.js), accesibles y con objetivos de 48 px o más.
import type { CSSProperties, ReactNode } from "react";

export function Field({ label, id, help, children }: { label?: string; id?: string; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="tz-field">
      {label ? <label className="tz-lbl" htmlFor={id}>{label}</label> : null}
      {children}
      {help ? <span className="tz-help">{help}</span> : null}
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange, label, style }: { options: { v: T; l: string }[]; value: T; onChange: (v: T) => void; label: string; style?: CSSProperties }) {
  return (
    <div className="tz-seg" role="group" aria-label={label} style={style}>
      {options.map((o) => (
        <button key={o.v} type="button" className={value === o.v ? "on" : ""} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, unit, onDec, onInc, label }: { value: string | number; unit: string; onDec: () => void; onInc: () => void; label: string }) {
  return (
    <div className="tz-stepper">
      <button className="tz-iconbtn" type="button" aria-label={`Restar ${label}`} onClick={onDec}>−</button>
      <span className="val" aria-live="polite"><span className="text-title-lg tz-num">{value}</span><span className="text-body tz-muted">{unit}</span></span>
      <button className="tz-iconbtn" type="button" aria-label={`Sumar ${label}`} onClick={onInc}>+</button>
    </div>
  );
}

export type RolMiembro = "admin" | "cuidador" | "limitado";
export const ROL_NOMBRE: Record<RolMiembro, string> = { admin: "Admin", cuidador: "Cuidador", limitado: "Limitado" };
export const ROL_TEXTO: Record<RolMiembro, string> = {
  admin: "Todo, incluido invitar y quitar cuidadores",
  cuidador: "Registra y ve todo el historial y la salud",
  limitado: "Registra tomas, pañales y sueño; ve solo el día de hoy",
};

export function RolePicker({ value, onChange }: { value: RolMiembro; onChange: (r: RolMiembro) => void }) {
  return (
    <div className="tz-stack s8" role="radiogroup" aria-label="Rol">
      {(["admin", "cuidador", "limitado"] as const).map((r) => (
        <button key={r} type="button" role="radio" aria-checked={value === r} className={`tz-radio${value === r ? " on" : ""}`} onClick={() => onChange(r)} style={{ minHeight: 68 }}>
          <span className="dot" aria-hidden />
          <span className="grow tz-stack" style={{ gap: 0 }}>
            <span className="text-body-strong">{ROL_NOMBRE[r]}</span>
            <span className="text-body-sm tz-muted">{ROL_TEXTO[r]}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
