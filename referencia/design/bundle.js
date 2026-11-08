/* @ds-bundle: {"format":4,"namespace":"Tereza","components":[{"name":"Icon"},{"name":"CategoryIcon"},{"name":"Button"},{"name":"Chip"},{"name":"LogCard"},{"name":"TimerRing"},{"name":"DayStrip"},{"name":"StatCard"},{"name":"QuickActions"},{"name":"BottomNav"}]} */
(function () {
  "use strict";
  var React = window.React;
  var h = React.createElement;

  var ICONS = {"moon":["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"],"sun":["M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z","M12 2.5v2","M12 19.5v2","M2.5 12h2","M19.5 12h2","M5.3 5.3l1.4 1.4","M17.3 17.3l1.4 1.4","M5.3 18.7l1.4-1.4","M17.3 6.7l1.4-1.4"],"bottle":["M8 9h8v10a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V9Z","M7 7h10v2H7Z","M10 7V5.5a2 2 0 0 1 4 0V7","M8 13h3","M8 16.5h3"],"diaper":["M3 6h18v4c0 5-4 8.5-9 8.5S3 15 3 10V6Z","M3 9.5h18","M8.5 18c.6-2.6 1.9-4 3.5-4s2.9 1.4 3.5 4"],"growth":["M4 4v16h16","M8 15.5l3.5-4.5 3 2.5L19 8","M15.5 8H19v3.5"],"pill":["M10.5 20.5l10-10a4.95 4.95 0 0 0-7-7l-10 10a4.95 4.95 0 0 0 7 7Z","M8.5 8.5l7 7"],"stethoscope":["M5 3.5H4v5.5a5 5 0 0 0 10 0V3.5h-1","M9 14v1.5a5 5 0 0 0 10 0V13","M21 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"],"plus":["M12 5v14","M5 12h14"],"home":["M4 11l8-7 8 7","M6 9.5V20h12V9.5","M10 20v-5h4v5"],"clock":["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z","M12 7v5l3.5 2"],"chart":["M5 20v-8","M12 20V5","M19 20v-11"],"user":["M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z","M4.5 20.5a7.5 7.5 0 0 1 15 0"],"bell":["M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z","M10 20.5a2 2 0 0 0 4 0"],"play":["M8 5.5v13l10-6.5-10-6.5Z"],"pause":["M9 5.5v13","M15 5.5v13"],"chevron-right":["M9 6l6 6-6 6"],"chevron-left":["M15 6l-6 6 6 6"],"check":["M5 12.5l4.5 4.5L19 7.5"]};

  var CATEGORIES = {
    sleep:  { label: "Sueño",       icon: "moon" },
    feed:   { label: "Toma",        icon: "bottle" },
    diaper: { label: "Pañal",       icon: "diaper" },
    growth: { label: "Crecimiento", icon: "growth" },
    meds:   { label: "Medicamento", icon: "pill" },
    doctor: { label: "Pediatra",    icon: "stethoscope" }
  };
  var CATEGORY_ORDER = ["sleep", "feed", "diaper", "growth", "meds", "doctor"];

  function cx() {
    return Array.prototype.filter.call(arguments, Boolean).join(" ");
  }
  function omit(obj, keys) {
    var out = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) out[k] = obj[k];
    return out;
  }
  function cat(key) {
    return CATEGORIES[key] ? key : "sleep";
  }

  /* Icon — línea 24×24, hereda color con currentColor */
  function Icon(p) {
    var d = ICONS[p.name] || [];
    var s = p.size || 24;
    return h("svg", {
      className: cx("tz-icon", p.className),
      width: s, height: s, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", strokeWidth: p.strokeWidth || 1.75,
      strokeLinecap: "round", strokeLinejoin: "round",
      role: p.label ? "img" : undefined,
      "aria-label": p.label || undefined,
      "aria-hidden": p.label ? undefined : true,
      focusable: "false"
    }, d.map(function (path, i) { return h("path", { key: i, d: path }); }));
  }

  /* CategoryIcon — ícono de categoría sobre su tinte */
  function CategoryIcon(p) {
    var key = cat(p.category);
    var size = p.size || "md";
    var px = size === "lg" ? 26 : size === "sm" ? 16 : 22;
    return h("span", {
      className: cx("tz-caticon", "tz-cat-" + key, "tz-caticon-" + size, p.className),
      role: p.label ? "img" : undefined,
      "aria-label": p.label || undefined,
      "aria-hidden": p.label ? undefined : true
    }, h(Icon, { name: CATEGORIES[key].icon, size: px }));
  }

  /* Button */
  function Button(p) {
    var variant = p.variant || "primary";
    var size = p.size || "md";
    var rest = omit(p, ["variant", "size", "icon", "block", "className", "children", "type"]);
    return h("button", Object.assign({ type: p.type || "button" }, rest, {
      className: cx("tz-btn", "tz-btn-" + variant, "tz-btn-" + size, p.block && "tz-btn-block", "text-button", p.className)
    }), p.icon ? h(Icon, { name: p.icon, size: size === "lg" ? 22 : 20 }) : null,
       p.children != null ? h("span", null, p.children) : null);
  }

  /* Chip — filtro de selección */
  function Chip(p) {
    var rest = omit(p, ["selected", "category", "className", "children"]);
    return h("button", Object.assign({ type: "button" }, rest, {
      "aria-pressed": !!p.selected,
      className: cx("tz-chip", "text-button", p.selected && "is-selected", p.className)
    }), p.category ? h("span", { className: cx("tz-chip-dot", "tz-cat-" + cat(p.category)), "aria-hidden": true }) : null,
       h("span", null, p.children));
  }

  /* LogCard — una fila del historial */
  function LogCard(p) {
    var key = cat(p.category);
    var Tag = p.onClick ? "button" : "div";
    var rest = omit(p, ["category", "title", "detail", "time", "ago", "className", "running"]);
    return h(Tag, Object.assign({}, rest, {
      type: Tag === "button" ? "button" : undefined,
      className: cx("tz-logcard", "tz-glass", p.onClick && "is-action", p.className)
    }),
      h(CategoryIcon, { category: key }),
      h("span", { className: "tz-logcard-main" },
        h("span", { className: "text-body-strong tz-ink" }, p.title || CATEGORIES[key].label),
        p.detail ? h("span", { className: "text-body-sm tz-muted" }, p.detail) : null),
      h("span", { className: "tz-logcard-meta" },
        p.running ? h("span", { className: cx("tz-live", "text-label", "tz-cat-" + key) }, h("span", { className: "tz-live-dot", "aria-hidden": true }), "En curso")
                  : (p.time ? h("span", { className: "text-body-strong tz-ink tz-num" }, p.time) : null),
        p.ago ? h("span", { className: "text-body-sm tz-muted" }, p.ago) : null)
    );
  }

  /* TimerRing — temporizador circular de sueño o toma */
  function TimerRing(p) {
    var key = cat(p.category || "sleep");
    var size = p.size || 232;
    var stroke = 14;
    var r = (size - stroke) / 2;
    var circ = 2 * Math.PI * r;
    var prog = Math.max(0, Math.min(1, p.progress == null ? 0 : p.progress));
    var running = !!p.running;
    return h("div", { className: cx("tz-timer", "tz-cat-" + key, p.className), style: { width: size, height: size } },
      h("svg", { className: "tz-timer-svg", width: size, height: size, viewBox: "0 0 " + size + " " + size, "aria-hidden": true },
        h("circle", { className: "tz-timer-track", cx: size / 2, cy: size / 2, r: r, strokeWidth: stroke, fill: "none" }),
        h("circle", { className: "tz-timer-progress", cx: size / 2, cy: size / 2, r: r, strokeWidth: stroke, fill: "none",
          strokeLinecap: "round", strokeDasharray: circ, strokeDashoffset: circ * (1 - prog),
          transform: "rotate(-90 " + size / 2 + " " + size / 2 + ")" })),
      h("div", { className: "tz-timer-center" },
        h("span", { className: "tz-timer-label text-label" }, h(Icon, { name: CATEGORIES[key].icon, size: 16 }), p.label || CATEGORIES[key].label),
        h("span", { className: "text-timer tz-ink tz-num", role: "timer", "aria-live": "off" }, p.time || "00:00"),
        p.caption ? h("span", { className: "text-body-sm tz-muted" }, p.caption) : null,
        p.onToggle ? h("button", {
          type: "button", className: "tz-timer-toggle", onClick: p.onToggle,
          "aria-label": running ? "Pausar" : "Reanudar"
        }, h(Icon, { name: running ? "pause" : "play", size: 20, strokeWidth: 2 })) : null)
    );
  }

  /* DayStrip — tira de días de la semana */
  function DayStrip(p) {
    var days = p.days || [];
    return h("div", { className: cx("tz-daystrip", p.className), role: "group", "aria-label": p.label || "Días" },
      days.map(function (d, i) {
        var sel = i === p.selected;
        return h("button", {
          key: i, type: "button", className: cx("tz-day", sel && "is-selected", d.today && "is-today"),
          "aria-pressed": sel, "aria-label": d.ariaLabel,
          onClick: p.onSelect ? function () { p.onSelect(i); } : undefined
        },
          h("span", { className: "text-caption tz-day-wd" }, d.weekday),
          h("span", { className: "text-body-strong tz-num" }, d.date),
          h("span", { className: "tz-day-marks", "aria-hidden": true },
            (d.marks || []).slice(0, 3).map(function (m, j) {
              return h("span", { key: j, className: cx("tz-day-mark", "tz-cat-" + cat(m)) });
            })));
      }));
  }

  /* StatCard — una cifra del día */
  function StatCard(p) {
    var key = p.category ? cat(p.category) : null;
    var prog = p.progress == null ? null : Math.max(0, Math.min(1, p.progress));
    return h("div", { className: cx("tz-stat", "tz-glass", key && "tz-cat-" + key, p.className) },
      h("div", { className: "tz-stat-head" },
        h("span", { className: "text-label tz-muted" }, p.label),
        key ? h(CategoryIcon, { category: key, size: "sm" }) : null),
      h("div", { className: "tz-stat-value" },
        h("span", { className: "text-title-lg tz-ink tz-num" }, p.value),
        p.unit ? h("span", { className: "text-body tz-muted" }, p.unit) : null),
      prog != null ? h("div", {
        className: "tz-bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100,
        "aria-valuenow": Math.round(prog * 100), "aria-label": p.label
      }, h("span", { className: "tz-bar-fill", style: { width: (prog * 100) + "%" } })) : null,
      p.caption ? h("span", { className: "text-body-sm tz-muted" }, p.caption) : null,
      p.badge ? h("span", { className: cx("tz-badge", "text-label", "tz-badge-" + (p.badgeTone || "success")) },
        h(Icon, { name: "check", size: 14, strokeWidth: 2.25 }), p.badge) : null
    );
  }

  /* QuickActions — rejilla para registrar en un toque */
  function QuickActions(p) {
    var cats = p.categories || CATEGORY_ORDER;
    return h("div", { className: cx("tz-quick", p.className) },
      cats.map(function (k) {
        var key = cat(k);
        return h("button", {
          key: key, type: "button", className: "tz-quick-btn tz-glass",
          onClick: p.onSelect ? function () { p.onSelect(key); } : undefined
        }, h(CategoryIcon, { category: key, size: "lg" }),
           h("span", { className: "text-body-strong tz-ink" }, (p.labels && p.labels[key]) || CATEGORIES[key].label));
      }));
  }

  /* BottomNav — barra flotante con botón + */
  function BottomNav(p) {
    var items = p.items || [
      { key: "inicio", label: "Inicio", icon: "home" },
      { key: "historial", label: "Historial", icon: "clock" },
      { key: "tendencias", label: "Tendencias", icon: "chart" },
      { key: "perfil", label: "Bebé", icon: "user" }
    ];
    var half = Math.ceil(items.length / 2);
    function item(it) {
      var active = it.key === p.active;
      return h("button", {
        key: it.key, type: "button", className: cx("tz-nav-item", active && "is-active"),
        "aria-current": active ? "page" : undefined,
        onClick: p.onSelect ? function () { p.onSelect(it.key); } : undefined
      }, h(Icon, { name: it.icon, size: 22 }), h("span", { className: "text-caption" }, it.label));
    }
    return h("nav", { className: cx("tz-nav", p.className), "aria-label": "Principal" },
      items.slice(0, half).map(item),
      h("button", { type: "button", className: "tz-fab", onClick: p.onAdd, "aria-label": p.addLabel || "Registrar" },
        h(Icon, { name: "plus", size: 26, strokeWidth: 2.25 })),
      items.slice(half).map(item));
  }

  var api = {
    Icon: Icon, CategoryIcon: CategoryIcon, Button: Button, Chip: Chip, LogCard: LogCard,
    TimerRing: TimerRing, DayStrip: DayStrip, StatCard: StatCard, QuickActions: QuickActions, BottomNav: BottomNav,
    CATEGORIES: CATEGORIES, ICON_NAMES: Object.keys(ICONS)
  };
  window.Tereza = window.Tereza || {};
  Object.assign(window.Tereza, api);
})();
