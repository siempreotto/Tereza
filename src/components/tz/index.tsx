// Componentes del sistema de diseño Tereza, portados de referencia/design/bundle.js.
// Los colores de categoría solo van en íconos, trazos y puntos (nunca como fondo de texto suelto).
import type { ButtonHTMLAttributes, ReactNode } from "react";

const ICONS = {
  moon: ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"],
  sun: ["M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", "M12 2.5v2", "M12 19.5v2", "M2.5 12h2", "M19.5 12h2", "M5.3 5.3l1.4 1.4", "M17.3 17.3l1.4 1.4", "M5.3 18.7l1.4-1.4", "M17.3 6.7l1.4-1.4"],
  bottle: ["M8 9h8v10a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V9Z", "M7 7h10v2H7Z", "M10 7V5.5a2 2 0 0 1 4 0V7", "M8 13h3", "M8 16.5h3"],
  diaper: ["M3 6h18v4c0 5-4 8.5-9 8.5S3 15 3 10V6Z", "M3 9.5h18", "M8.5 18c.6-2.6 1.9-4 3.5-4s2.9 1.4 3.5 4"],
  growth: ["M4 4v16h16", "M8 15.5l3.5-4.5 3 2.5L19 8", "M15.5 8H19v3.5"],
  pill: ["M10.5 20.5l10-10a4.95 4.95 0 0 0-7-7l-10 10a4.95 4.95 0 0 0 7 7Z", "M8.5 8.5l7 7"],
  stethoscope: ["M5 3.5H4v5.5a5 5 0 0 0 10 0V3.5h-1", "M9 14v1.5a5 5 0 0 0 10 0V13", "M21 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"],
  plus: ["M12 5v14", "M5 12h14"],
  home: ["M4 11l8-7 8 7", "M6 9.5V20h12V9.5", "M10 20v-5h4v5"],
  clock: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", "M12 7v5l3.5 2"],
  chart: ["M5 20v-8", "M12 20V5", "M19 20v-11"],
  user: ["M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", "M4.5 20.5a7.5 7.5 0 0 1 15 0"],
  bell: ["M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z", "M10 20.5a2 2 0 0 0 4 0"],
  play: ["M8 5.5v13l10-6.5-10-6.5Z"],
  pause: ["M9 5.5v13", "M15 5.5v13"],
  "chevron-right": ["M9 6l6 6-6 6"],
  "chevron-left": ["M15 6l-6 6 6 6"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
} as const;

export type IconName = keyof typeof ICONS;

export const CATEGORIES = {
  sleep: { label: "Sueño", icon: "moon" },
  feed: { label: "Toma", icon: "bottle" },
  diaper: { label: "Pañal", icon: "diaper" },
  growth: { label: "Crecimiento", icon: "growth" },
  meds: { label: "Medicamento", icon: "pill" },
  doctor: { label: "Pediatra", icon: "stethoscope" },
} as const satisfies Record<string, { label: string; icon: IconName }>;

export type Category = keyof typeof CATEGORIES;
const CATEGORY_ORDER: Category[] = ["sleep", "feed", "diaper", "growth", "meds", "doctor"];

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Icon({ name, size = 24, strokeWidth = 1.75, label, className }: { name: IconName; size?: number; strokeWidth?: number; label?: string; className?: string }) {
  return (
    <svg
      className={cx("tz-icon", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function CategoryIcon({ category, size = "md", label, className }: { category: Category; size?: "sm" | "md" | "lg"; label?: string; className?: string }) {
  const px = size === "lg" ? 26 : size === "sm" ? 16 : 22;
  return (
    <span
      className={cx("tz-caticon", `tz-cat-${category}`, `tz-caticon-${size}`, className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Icon name={CATEGORIES[category].icon} size={px} />
    </span>
  );
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: "primary" | "glass" | "ghost" | "danger";
  size?: "md" | "lg";
  icon?: IconName;
  block?: boolean;
  children?: ReactNode;
};

export function Button({ variant = "primary", size = "md", icon, block, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} {...rest} className={cx("tz-btn", `tz-btn-${variant}`, `tz-btn-${size}`, block && "tz-btn-block", "text-button", className)}>
      {icon ? <Icon name={icon} size={size === "lg" ? 22 : 20} /> : null}
      {children != null ? <span>{children}</span> : null}
    </button>
  );
}

export function Chip({ selected, category, className, children, ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & { selected?: boolean; category?: Category }) {
  return (
    <button type="button" {...rest} aria-pressed={!!selected} className={cx("tz-chip", "text-button", selected && "is-selected", className)}>
      {category ? <span className={cx("tz-chip-dot", `tz-cat-${category}`)} aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
}

export function LogCard({ category, title, detail, time, ago, running, onClick, className }: { category: Category; title?: string; detail?: string; time?: string; ago?: string | null; running?: boolean; onClick?: () => void; className?: string }) {
  const body = (
    <>
      <CategoryIcon category={category} />
      <span className="tz-logcard-main">
        <span className="text-body-strong tz-ink">{title ?? CATEGORIES[category].label}</span>
        {detail ? <span className="text-body-sm tz-muted">{detail}</span> : null}
      </span>
      <span className="tz-logcard-meta">
        {running ? (
          <span className={cx("tz-live", "text-label", `tz-cat-${category}`)}>
            <span className="tz-live-dot" aria-hidden />
            En curso
          </span>
        ) : time ? (
          <span className="text-body-strong tz-ink tz-num">{time}</span>
        ) : null}
        {ago ? <span className="text-body-sm tz-muted">{ago}</span> : null}
      </span>
    </>
  );
  const cls = cx("tz-logcard", "tz-glass", onClick && "is-action", className);
  return onClick ? (
    <button type="button" className={cls} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function TimerRing({ category = "sleep", size = 232, progress = 0, running, label, time = "00:00", caption, onToggle, className }: { category?: Category; size?: number; progress?: number; running?: boolean; label?: string; time?: string; caption?: string; onToggle?: () => void; className?: string }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const prog = Math.max(0, Math.min(1, progress));
  return (
    <div className={cx("tz-timer", `tz-cat-${category}`, className)} style={{ width: size, height: size }}>
      <svg className="tz-timer-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="tz-timer-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="tz-timer-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - prog)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="tz-timer-center">
        <span className="tz-timer-label text-label">
          <Icon name={CATEGORIES[category].icon} size={16} />
          {label ?? CATEGORIES[category].label}
        </span>
        <span className="text-timer tz-ink tz-num" role="timer" aria-live="off">
          {time}
        </span>
        {caption ? <span className="text-body-sm tz-muted">{caption}</span> : null}
        {onToggle ? (
          <button type="button" className="tz-timer-toggle" onClick={onToggle} aria-label={running ? "Pausar" : "Reanudar"}>
            <Icon name={running ? "pause" : "play"} size={20} strokeWidth={2} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export type DayStripDay = { weekday: string; date: string; marks?: Category[]; today?: boolean; ariaLabel?: string };

export function DayStrip({ days, selected, onSelect, label = "Días", className }: { days: DayStripDay[]; selected?: number; onSelect?: (i: number) => void; label?: string; className?: string }) {
  return (
    <div className={cx("tz-daystrip", className)} role="group" aria-label={label}>
      {days.map((d, i) => (
        <button
          key={`${d.weekday}-${d.date}`}
          type="button"
          className={cx("tz-day", i === selected && "is-selected", d.today && "is-today")}
          aria-pressed={i === selected}
          aria-label={d.ariaLabel}
          onClick={onSelect ? () => onSelect(i) : undefined}
        >
          <span className="text-caption tz-day-wd">{d.weekday}</span>
          <span className="text-body-strong tz-num">{d.date}</span>
          <span className="tz-day-marks" aria-hidden>
            {(d.marks ?? []).slice(0, 3).map((m) => (
              <span key={m} className={cx("tz-day-mark", `tz-cat-${m}`)} />
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}

export function StatCard({ label, value, unit, category, progress, caption, badge, badgeTone = "success", className }: { label: string; value: string; unit?: string; category?: Category; progress?: number; caption?: string | null; badge?: string | null; badgeTone?: "success" | "warning" | "danger"; className?: string }) {
  const prog = progress == null ? null : Math.max(0, Math.min(1, progress));
  return (
    <div className={cx("tz-stat", "tz-glass", category && `tz-cat-${category}`, className)}>
      <div className="tz-stat-head">
        <span className="text-label tz-muted">{label}</span>
        {category ? <CategoryIcon category={category} size="sm" /> : null}
      </div>
      <div className="tz-stat-value">
        <span className="text-title-lg tz-ink tz-num">{value}</span>
        {unit ? <span className="text-body tz-muted">{unit}</span> : null}
      </div>
      {prog != null ? (
        <div className="tz-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(prog * 100)} aria-label={label}>
          <span className="tz-bar-fill" style={{ width: `${prog * 100}%` }} />
        </div>
      ) : null}
      {caption ? <span className="text-body-sm tz-muted">{caption}</span> : null}
      {badge ? (
        <span className={cx("tz-badge", "text-label", `tz-badge-${badgeTone}`)}>
          <Icon name="check" size={14} strokeWidth={2.25} />
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export function QuickActions({ categories = CATEGORY_ORDER, labels, onSelect, className }: { categories?: Category[]; labels?: Partial<Record<Category, string>>; onSelect?: (c: Category) => void; className?: string }) {
  return (
    <div className={cx("tz-quick", className)}>
      {categories.map((key) => (
        <button key={key} type="button" className="tz-quick-btn tz-glass" onClick={onSelect ? () => onSelect(key) : undefined}>
          <CategoryIcon category={key} size="lg" />
          <span className="text-body-strong tz-ink">{labels?.[key] ?? CATEGORIES[key].label}</span>
        </button>
      ))}
    </div>
  );
}

export type NavItem = { key: string; label: string; icon: IconName };

export function BottomNav({ items, active, onSelect, onAdd, addLabel = "Registrar", className }: { items: NavItem[]; active?: string; onSelect?: (key: string) => void; onAdd?: () => void; addLabel?: string; className?: string }) {
  const half = Math.ceil(items.length / 2);
  const item = (it: NavItem) => (
    <button
      key={it.key}
      type="button"
      className={cx("tz-nav-item", it.key === active && "is-active")}
      aria-current={it.key === active ? "page" : undefined}
      onClick={onSelect ? () => onSelect(it.key) : undefined}
    >
      <Icon name={it.icon} size={22} />
      <span className="text-caption">{it.label}</span>
    </button>
  );
  return (
    <nav className={cx("tz-nav", className)} aria-label="Principal">
      {items.slice(0, half).map(item)}
      <button type="button" className="tz-fab" onClick={onAdd} aria-label={addLabel}>
        <Icon name="plus" size={26} strokeWidth={2.25} />
      </button>
      {items.slice(half).map(item)}
    </nav>
  );
}
