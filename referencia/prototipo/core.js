/* Tereza · prototipo — utilidades, datos de ejemplo y estado */
(function () {
  'use strict';
  const MIN = 60000, HOUR = 3600000, DAY = 86400000;
  const pad = n => String(n).padStart(2, '0');
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const DIAS_C = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  function fTime(ms) {
    const d = new Date(ms); let h = d.getHours(); const m = d.getMinutes();
    const ap = h < 12 ? 'a.m.' : 'p.m.'; h = h % 12 || 12;
    return h + ':' + pad(m) + ' ' + ap;
  }
  function fDur(min) {
    min = Math.max(0, Math.round(min)); const h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + ' min';
    return m ? h + ' h ' + m + ' min' : h + ' h';
  }
  function fAgo(ms, now) { const m = (now - ms) / MIN; return m < 1 ? 'ahora' : 'hace ' + fDur(m); }
  function fClock(sec) { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return pad(h) + ':' + pad(m) + ':' + pad(s); }
  function fMS(sec) { sec = Math.max(0, Math.floor(sec)); return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); }
  function fDate(ms) { const d = new Date(ms); return cap(DIAS[d.getDay()]) + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; }
  function fDateY(ms) { const d = new Date(ms); return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function fShort(ms) { const d = new Date(ms); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); }
  function dayStart(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function addDays(ms, n) { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); }
  function at(dayMs, h, m) { const d = new Date(dayMs); d.setHours(h, m || 0, 0, 0); return d.getTime(); }
  function dayLabel(ms, now) {
    const a = dayStart(ms), b = dayStart(now);
    if (a === b) return 'Hoy';
    if (a === addDays(b, -1)) return 'Ayer';
    const d = new Date(ms); return cap(DIAS[d.getDay()]).slice(0, 3) + ' ' + d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3);
  }
  function toTimeInput(ms) { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fromTimeInput(baseMs, v) { const [h, m] = (v || '0:0').split(':').map(Number); return at(baseMs, h, m); }
  function toDateInput(ms) { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromDateInput(v) { const [y, mo, d] = v.split('-').map(Number); return new Date(y, mo - 1, d, 12).getTime(); }
  const num = (v, d) => { const f = Math.pow(10, d || 0); return String(Math.round(v * f) / f); };

  /* Unidades: se guarda en métrico, se muestra en la unidad de la familia */
  const ML_OZ = 29.5735, G_LB = 453.592, MM_IN = 25.4;
  const U = {
    vol(ml, u) { return u === 'oz' ? num(Math.round(ml / ML_OZ * 2) / 2, 1) + ' oz' : Math.round(ml) + ' ml'; },
    volNum(ml, u) { return u === 'oz' ? Math.round(ml / ML_OZ * 2) / 2 : Math.round(ml / 5) * 5; },
    volToMl(v, u) { return u === 'oz' ? v * ML_OZ : v; },
    weight(g, u) { return u === 'lb' ? num(g / G_LB, 1) + ' lb' : num(g / 1000, 2) + ' kg'; },
    weightAlt(g, u) { return u === 'lb' ? num(g / 1000, 2) + ' kg' : num(g / G_LB, 1) + ' lb'; },
    len(mm, u) { return u === 'in' ? num(mm / MM_IN, 1) + ' in' : num(mm / 10, 1) + ' cm'; },
    lenAlt(mm, u) { return u === 'in' ? num(mm / 10, 1) + ' cm' : num(mm / MM_IN, 1) + ' in'; }
  };

  /* Edad */
  function ageParts(birth, now) {
    const b = new Date(birth), n = new Date(now);
    let months = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
    let ref = new Date(b); ref.setMonth(b.getMonth() + months);
    if (ref > n) { months--; ref = new Date(b); ref.setMonth(b.getMonth() + months); }
    const days = Math.floor((n - ref) / DAY);
    return { months, days, totalDays: Math.floor((now - birth) / DAY) };
  }
  function ageText(birth, now) {
    const a = ageParts(birth, now);
    if (a.months < 1) return a.totalDays + ' días';
    return a.months + (a.months === 1 ? ' mes' : ' meses');
  }
  function ageMonthsFloat(birth, now) { return (now - birth) / (DAY * 30.4375); }

  /* Curvas OMS aproximadas (niñas y niños) para el prototipo. En la app real van las tablas oficiales. */
  const Z = [-1.88, -1.04, 0, 1.04, 1.88];
  const WHO = {
    F: {
      weight: [[2.4, 3.2, 4.0, 4.6, 5.1, 5.5, 5.8, 6.1, 6.3, 6.6, 6.8, 7.0, 7.1], [2.8, 3.6, 4.5, 5.1, 5.6, 6.1, 6.4, 6.7, 7.0, 7.3, 7.5, 7.7, 7.9], [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9], [3.7, 4.8, 5.8, 6.6, 7.3, 7.8, 8.2, 8.6, 9.0, 9.3, 9.6, 9.9, 10.1], [4.2, 5.4, 6.5, 7.4, 8.1, 8.7, 9.2, 9.6, 10.0, 10.4, 10.7, 11.0, 11.3]],
      length: { med: [49.1, 53.7, 57.1, 59.8, 62.1, 64.0, 65.7, 67.3, 68.7, 70.1, 71.5, 72.8, 74.0], sd: [1.9, 1.95, 2.0, 2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5] },
      head: { med: [33.9, 36.5, 38.3, 39.5, 40.6, 41.5, 42.2, 42.8, 43.4, 43.8, 44.2, 44.6, 44.9], sd: [1.2, 1.2, 1.2, 1.2, 1.25, 1.25, 1.25, 1.25, 1.3, 1.3, 1.3, 1.3, 1.3] }
    },
    M: {
      weight: [[2.5, 3.4, 4.4, 5.1, 5.6, 6.1, 6.4, 6.7, 7.0, 7.2, 7.5, 7.7, 7.8], [2.9, 3.9, 4.9, 5.6, 6.2, 6.7, 7.1, 7.4, 7.7, 7.9, 8.2, 8.4, 8.6], [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6], [3.9, 5.1, 6.3, 7.2, 7.9, 8.4, 8.9, 9.3, 9.6, 10.0, 10.3, 10.5, 10.8], [4.3, 5.7, 7.0, 7.9, 8.6, 9.2, 9.7, 10.2, 10.5, 10.9, 11.2, 11.5, 11.8]],
      length: { med: [49.9, 54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 69.2, 70.6, 72.0, 73.3, 74.5, 75.7], sd: [1.9, 1.95, 2.0, 2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5] },
      head: { med: [34.5, 37.3, 39.1, 40.5, 41.6, 42.6, 43.3, 44.0, 44.5, 45.0, 45.4, 45.8, 46.1], sd: [1.25, 1.2, 1.2, 1.2, 1.2, 1.25, 1.25, 1.25, 1.25, 1.3, 1.3, 1.3, 1.3] }
    }
  };
  function curves(sex, metric) {
    const t = WHO[sex === 'M' ? 'M' : 'F'][metric];
    if (metric === 'weight') return t; // kg, 5 curvas
    return Z.map(z => t.med.map((m, i) => +(m + z * t.sd[i]).toFixed(2))); // cm
  }
  function valAt(curve, mo) { const i = Math.max(0, Math.min(11.999, mo)); const a = Math.floor(i); return curve[a] + (curve[a + 1] - curve[a]) * (i - a); }
  function phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2); let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  function percentile(sex, metric, mo, value) {
    if (mo > 12.5) return null;
    const cs = curves(sex, metric).map(c => valAt(c, mo));
    let z;
    if (value <= cs[0]) z = Z[0] - (cs[0] - value) / (cs[1] - cs[0]) * (Z[1] - Z[0]);
    else if (value >= cs[4]) z = Z[4] + (value - cs[4]) / (cs[4] - cs[3]) * (Z[4] - Z[3]);
    else { for (let i = 0; i < 4; i++) if (value <= cs[i + 1]) { z = Z[i] + (value - cs[i]) / (cs[i + 1] - cs[i]) * (Z[i + 1] - Z[i]); break; } }
    const p = Math.round(phi(z) * 100);
    return Math.max(1, Math.min(99, p));
  }
  function pText(p) { if (p == null) return 'sin percentil'; if (p <= 2) return 'menor al percentil 3'; if (p >= 98) return 'mayor al percentil 97'; return 'percentil ' + p; }

  /* Referencias de sueño por edad (AASM/AAP; NSF orientativa antes de 4 meses) */
  function sleepRef(mo) {
    if (mo < 4) return { min: 14, max: 17, label: 'Referencia orientativa por edad: 14 a 17 h' };
    if (mo < 12) return { min: 12, max: 16, label: 'Referencia por edad: 12 a 16 h' };
    return { min: 11, max: 14, label: 'Referencia por edad: 11 a 14 h' };
  }
  /* Ventanas de vigilia (heurística editable) en minutos */
  function wakeRange(mo) {
    if (mo < 1.85) return null;
    if (mo < 3) return [60, 90]; if (mo < 4) return [75, 120]; if (mo < 5) return [90, 150];
    if (mo < 7) return [120, 180]; if (mo < 9) return [150, 210]; if (mo < 13) return [180, 240]; return [240, 360];
  }

  /* Generador determinista para los datos de ejemplo */
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  let idc = 0; const uid = p => (p || 'e') + Date.now().toString(36) + (idc++).toString(36);

  function seedState(now, opts) {
    opts = opts || {};
    const r = rng(20261107);
    const j = (a) => Math.round((r() * 2 - 1) * a);
    const birth = dayStart(now) - 157 * DAY + 12 * HOUR;
    const ev = [];
    const add = (o) => { if (o.start <= now) ev.push(Object.assign({ id: uid(), end: null, payload: {}, notes: '', by: 'andrea', source: 'web', deleted: null }, o)); };
    const ozml = oz => Math.round(oz * ML_OZ);
    for (let k = -9; k <= 0; k++) {
      const D = addDays(dayStart(now), k);
      const wake = at(D, 6, 15 + j(12));
      const prevBed = at(addDays(D, -1), 19, 25 + j(10));
      const nightFeed = at(D, 2, 50 + j(15));
      // sueño de noche (desde la noche anterior)
      add({ type: 'sueno', start: prevBed, end: nightFeed, payload: { lugar: 'cuna', como: 'pecho' } });
      add({ type: 'toma_pecho', start: nightFeed, end: nightFeed + 14 * MIN, payload: { lado_inicial: 'der', segIzq: 6 * 60, segDer: 8 * 60 } });
      add({ type: 'sueno', start: nightFeed + 18 * MIN, end: wake, payload: { lugar: 'cuna', como: 'pecho' } });
      add({ type: 'toma_pecho', start: wake + 5 * MIN, end: wake + 23 * MIN, payload: { lado_inicial: 'izq', segIzq: 10 * 60, segDer: 8 * 60 } });
      add({ type: 'panal', start: wake + 30 * MIN, payload: { mojado: true, sucio: true } });
      add({ type: 'medicamento', start: at(D, 7, j(8)), payload: { medId: 'm1', nombre: 'Vitamina D en gotas', cantidad: '1 gota', via: 'Oral' } });
      const n1 = wake + (105 + j(10)) * MIN, n1e = n1 + (55 + j(10)) * MIN;
      add({ type: 'sueno', start: n1, end: n1e, payload: { lugar: 'cuna', como: 'sola' } });
      add({ type: 'toma_biberon', start: n1e + 10 * MIN, payload: { contenido: 'materna', volumen_ml: ozml(4), sobrante_ml: ozml(0.5) }, by: 'diego', source: 'mcp' });
      add({ type: 'panal', start: n1e + 25 * MIN, payload: { mojado: true, sucio: false } });
      const n2 = n1e + (130 + j(10)) * MIN, n2e = n2 + (85 + j(12)) * MIN;
      add({ type: 'sueno', start: n2, end: n2e, payload: { lugar: k % 3 === 0 ? 'carriola' : 'cuna', como: 'arrullo' } });
      add({ type: 'toma_pecho', start: n2e + 10 * MIN, end: n2e + 25 * MIN, payload: { lado_inicial: 'izq', segIzq: 9 * 60, segDer: 6 * 60 } });
      add({ type: 'panal', start: n2e + 45 * MIN, payload: { mojado: true, sucio: false }, by: k % 2 ? 'carmen' : 'andrea' });
      const n3 = n2e + (150 + j(10)) * MIN, n3e = n3 + (40 + j(5)) * MIN;
      add({ type: 'sueno', start: n3, end: n3e, payload: { lugar: 'brazos', como: 'arrullo' } });
      add({ type: 'toma_biberon', start: n3e + 20 * MIN, payload: { contenido: 'formula', volumen_ml: ozml(3.5), sobrante_ml: 0 }, by: 'diego', source: 'mcp' });
      add({ type: 'panal', start: n3e + 60 * MIN, payload: { mojado: true, sucio: k % 2 === 0 } });
      add({ type: 'toma_pecho', start: at(D, 19, 5), end: at(D, 19, 23), payload: { lado_inicial: 'der', segIzq: 8 * 60, segDer: 10 * 60 } });
      add({ type: 'panal', start: at(D, 19, 15), payload: { mojado: true, sucio: false } });
    }
    // Convertir lo que está "en curso" ahora en temporizadores activos; quitar lo futuro
    const evts = ev.filter(e => e.start <= now).map(e => {
      if (e.end && e.end > now) {
        if (e.type === 'sueno') return Object.assign({}, e, { end: null });
        return null;
      }
      return e;
    }).filter(Boolean);
    evts.push({ id: uid(), type: 'nota', start: addDays(now, -2) - 3 * HOUR, end: null, payload: { texto: 'Se rió a carcajadas cuando la abuela le cantó.' }, notes: '', by: 'carmen', source: 'web', deleted: null });
    evts.push({ id: uid(), type: 'temperatura', start: birth + 122 * DAY + 21 * HOUR, end: null, payload: { valor_c: 37.8, metodo: 'axilar' }, notes: 'Después de las vacunas', by: 'diego', source: 'web', deleted: null });
    evts.push({ id: uid(), type: 'medicamento', start: birth + 122 * DAY + 16.5 * HOUR, end: null, payload: { medId: 'm2', nombre: 'Acetaminofén en gotas', cantidad: '0.6 ml', via: 'Oral' }, notes: '', by: 'diego', source: 'web', deleted: null });

    const v4 = birth + 122 * DAY, v2 = birth + 61 * DAY, vs = birth + 37 * DAY, v0 = birth + 7 * DAY;
    const visits = [
      { id: 'v4', date: v4, title: 'Control de 4 meses', doctor: 'Dra. Mónica Herrera', notes: 'Va muy bien. Seguir con lactancia y vitamina D. Hablar de sólidos en el control de 6 meses.', vaccines: ['Pentavalente · 2.ª dosis', 'Polio · 2.ª dosis', 'Rotavirus · 2.ª dosis', 'Neumococo · 2.ª dosis'], attachments: ['Receta del control de 4 meses (PDF)'] },
      { id: 'v2', date: v2, title: 'Control de 2 meses', doctor: 'Dra. Mónica Herrera', notes: 'Crecimiento adecuado. Primera dosis de vacunas.', vaccines: ['Pentavalente · 1.ª dosis', 'Polio · 1.ª dosis', 'Rotavirus · 1.ª dosis', 'Neumococo · 1.ª dosis'], attachments: [] },
      { id: 'vs', date: vs, title: 'Consulta por congestión', doctor: 'Dra. Mónica Herrera', notes: 'Sin medicamentos. Lavados nasales con suero.', vaccines: [], attachments: [] },
      { id: 'v0', date: v0, title: 'Control de recién nacida', doctor: 'Dra. Mónica Herrera', notes: 'Primera visita. Lactancia bien establecida.', vaccines: [], attachments: [] }
    ];
    const measurements = [
      { id: 'w0', at: birth, weightG: 3250, lengthMm: 495, headMm: 340, origin: 'hospital' },
      { id: 'w1', at: v0, weightG: 3380, lengthMm: null, headMm: null, origin: 'consulta' },
      { id: 'w2', at: v2, weightG: 5200, lengthMm: 572, headMm: 383, origin: 'consulta' },
      { id: 'w3', at: v4, weightG: 6400, lengthMm: 620, headMm: 405, origin: 'consulta' },
      { id: 'w4', at: dayStart(now) - 6 * DAY + 9 * HOUR, weightG: 6900, lengthMm: null, headMm: null, origin: 'casa' }
    ];
    const next = new Date(birth); next.setMonth(next.getMonth() + 6); next.setHours(9, 30, 0, 0);
    return {
      v: 1,
      onboarded: !!opts.onboarded,
      household: { name: 'Casa de Lucía', tz: 'America/Guatemala', units: { vol: 'oz', weight: 'lb', len: 'in' }, night: 'auto', nightFrom: '19:00', nightTo: '06:00' },
      baby: { name: 'Lucía', birth, preterm: false, weeks: 39, sex: 'F' },
      me: 'andrea',
      members: [
        { id: 'andrea', name: 'Andrea', role: 'admin', claude: true, lastClaude: now - 30 * MIN },
        { id: 'diego', name: 'Diego', role: 'cuidador', claude: true, lastClaude: now - 20 * HOUR },
        { id: 'carmen', name: 'Abuela Carmen', role: 'limitado', claude: false }
      ],
      invites: [{ email: 'rosa.l@correo.com', role: 'limitado', at: now - 2 * DAY }],
      events: evts,
      measurements,
      meds: [
        { id: 'm1', name: 'Vitamina D en gotas', indication: '1 gota al día', by: 'Dra. Mónica Herrera', start: birth + 7 * DAY, active: true },
        { id: 'm2', name: 'Acetaminofén en gotas', indication: '0.6 ml si hay fiebre después de las vacunas', by: 'Dra. Mónica Herrera', start: v4, active: false }
      ],
      visits,
      nextAppt: { date: next.getTime(), title: 'Control de 6 meses', doctor: 'Dra. Mónica Herrera' },
      questions: [
        { id: 'q1', text: '¿Cuándo y cómo empezar con los sólidos?', by: 'andrea', at: now - 3 * DAY, resolved: null },
        { id: 'q2', text: 'Se despierta más de noche desde hace dos semanas. ¿Es esperable a esta edad?', by: 'diego', at: now - 2 * DAY, source: 'mcp', resolved: null },
        { id: 'q3', text: '¿Puede usar bloqueador solar?', by: 'andrea', at: now - DAY, resolved: null },
        { id: 'q4', text: '¿Cuánta vitamina D le damos?', by: 'andrea', at: v4 - 5 * DAY, resolved: 'v4' },
        { id: 'q5', text: '¿Es normal que puje al hacer popó?', by: 'diego', at: v4 - 3 * DAY, resolved: 'v4' }
      ],
      notif: { nap: true, bed: true, quiet: true, lead: 15, who: { andrea: true, diego: true, carmen: false } },
      windows: { mode: 'auto', custom: [105, 135, 150, 165], bedtime: '19:15' },
      sim: { offline: false }
    };
  }
  function emptyState(now, base) {
    const s = seedState(now, { onboarded: true });
    s.events = []; s.measurements = []; s.visits = []; s.questions = []; s.meds = [];
    s.invites = [];
    if (base) { s.household = base.household; s.baby = base.baby; }
    return s;
  }

  /* Descripción de eventos */
  const LUGAR = { cuna: 'cuna', brazos: 'brazos', carriola: 'carriola', auto: 'auto', otro: 'otro lugar' };
  const COMO = { sola: 'se durmió sola', arrullo: 'con arrullo', pecho: 'con pecho', biberon: 'con biberón' };
  const CONT = { materna: 'leche materna', formula: 'fórmula', mixta: 'mixta' };
  function isNight(ms) { const h = new Date(ms).getHours(); return h >= 18 || h < 5; }
  function evInfo(e, units, now) {
    const p = e.payload || {};
    switch (e.type) {
      case 'sueno': {
        const end = e.end || now; const d = fDur((end - e.start) / MIN);
        return { cat: 'sleep', title: isNight(e.start) ? 'Noche' : 'Siesta', detail: (e.end ? d : 'En curso') + (p.lugar ? ' · ' + LUGAR[p.lugar] : ''), running: !e.end };
      }
      case 'toma_pecho': {
        const live = breastSecs(e, now);
        return { cat: 'feed', title: 'Toma de pecho', detail: 'Izq. ' + Math.round(live.izq / 60) + ' min · Der. ' + Math.round(live.der / 60) + ' min', running: !e.end };
      }
      case 'toma_biberon': return { cat: 'feed', title: 'Biberón', detail: U.vol(p.volumen_ml || 0, units.vol) + ' de ' + (CONT[p.contenido] || 'leche') + (p.sobrante_ml ? ' · sobró ' + U.vol(p.sobrante_ml, units.vol) : '') };
      case 'toma_solidos': return { cat: 'feed', title: 'Sólidos', detail: (p.alimentos || 'Sin detalle') + (p.cantidad ? ' · ' + p.cantidad : '') };
      case 'extraccion': return { cat: 'feed', title: 'Extracción', detail: 'Izq. ' + U.vol(p.izq_ml || 0, units.vol) + ' · Der. ' + U.vol(p.der_ml || 0, units.vol) };
      case 'panal': return { cat: 'diaper', title: 'Pañal', detail: p.mojado && p.sucio ? 'Mojado y sucio' : p.sucio ? 'Sucio' : 'Mojado' };
      case 'medicamento': return { cat: 'meds', title: p.nombre || 'Medicamento', detail: (p.cantidad || '') + (p.via ? ' · ' + p.via : '') };
      case 'temperatura': return { cat: 'temp', title: 'Temperatura', detail: num(p.valor_c, 1) + ' °C · ' + (p.metodo || '') };
      case 'sintoma': return { cat: 'temp', title: 'Síntoma', detail: p.descripcion || '' };
      case 'nota': return { cat: 'note', title: 'Nota', detail: p.texto || '' };
      default: return { cat: 'note', title: e.type, detail: '' };
    }
  }
  function breastSecs(e, now) {
    const p = e.payload || {}; let izq = p.segIzq || 0, der = p.segDer || 0;
    if (!e.end && p.active && p.since) { const extra = (now - p.since) / 1000; if (p.active === 'izq') izq += extra; else der += extra; }
    return { izq, der, total: izq + der };
  }
  function savedText(e, units) {
    const i = evInfo(e, units, Date.now());
    return 'Guardé: ' + i.title.toLowerCase() + (i.detail && e.type !== 'sueno' ? ', ' + i.detail.toLowerCase() : '') + ', ' + fTime(e.start);
  }

  /* Métricas */
  function overlap(a1, a2, b1, b2) { return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1)); }
  function daySleep(events, D, now) {
    const D2 = D + DAY; let total = 0, night = 0, naps = 0, napMin = 0;
    events.forEach(e => {
      if (e.type !== 'sueno' || e.deleted) return;
      const end = e.end || now; const o = overlap(e.start, end, D, D2);
      if (!o) return; total += o;
      if (isNight(e.start)) night += o; else { napMin += o; if (e.start >= D) naps++; }
    });
    return { total: total / MIN, night: night / MIN, nap: napMin / MIN, naps };
  }
  function periodStats(events, from, to, now) {
    let days = 0, sleep = 0, night = 0, nap = 0, naps = 0;
    for (let d = from; d < to; d = addDays(d, 1)) {
      if (!events.some(e => !e.deleted && e.start >= d && e.start < d + DAY)) continue;
      days++; const s = daySleep(events, d, now); sleep += s.total; night += s.night; nap += s.nap; naps += s.naps;
    }
    days = Math.max(1, days);
    const inR = events.filter(e => !e.deleted && e.start >= from && e.start < (to > from ? to : from + DAY));
    const pecho = inR.filter(e => e.type === 'toma_pecho' && e.end);
    const bib = inR.filter(e => e.type === 'toma_biberon');
    const pan = inR.filter(e => e.type === 'panal');
    const wake = inR.filter(e => e.type === 'sueno' && isNight(e.start) && new Date(e.start).getHours() < 5).length;
    const avg = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
    return {
      days, sleep: sleep / days, night: night / days, nap: nap / days, naps: naps / days,
      feeds: (pecho.length + bib.length + inR.filter(e => e.type === 'toma_solidos').length) / days,
      pecho: pecho.length / days, pechoMin: avg(pecho.map(e => (e.end - e.start) / MIN)),
      bib: bib.length / days, bibMl: avg(bib.map(e => e.payload.volumen_ml || 0)),
      wet: pan.filter(e => e.payload.mojado).length / days, dirty: pan.filter(e => e.payload.sucio).length / days,
      nightWakes: wake / days
    };
  }

  /* Predicción de próxima siesta (Fase 2): heurística transparente */
  function predict(state, now) {
    const ev = state.events.filter(e => !e.deleted);
    const mo = ageMonthsFloat(state.baby.birth, now);
    const range = wakeRange(mo);
    if (!range) return { none: true, reason: 'Antes de las 8 semanas solo registramos; no estimamos.' };
    const sleeps = ev.filter(e => e.type === 'sueno').sort((a, b) => a.start - b.start);
    const active = sleeps.find(s => !s.end);
    if (active) return { sleeping: true };
    const last = sleeps.filter(s => s.end).pop();
    if (!last) return { none: true, reason: 'Faltan registros de sueño para estimar.' };
    const today = dayStart(now);
    const napsToday = sleeps.filter(s => s.start >= today && !isNight(s.start)).length;
    const pos = Math.min(napsToday, 3); // 0..2 siesta, 3 noche
    const bedtime = (state.windows.bedtime || '19:15').split(':').map(Number);
    const bedMs = at(today, bedtime[0], bedtime[1]);
    let windowMin, basis, conf = 'media', n = 0;
    if (state.windows.mode === 'custom') {
      windowMin = state.windows.custom[pos]; basis = 'Usa las ventanas que configuraste.'; conf = 'media';
    } else {
      const samples = [];
      for (let k = 1; k <= 7; k++) {
        const D = addDays(today, -k);
        const dn = sleeps.filter(s => s.start >= D && s.start < D + DAY && !isNight(s.start) && s.end && (s.end - s.start) >= 30 * MIN);
        const wakeUp = sleeps.filter(s => s.end && s.end >= D && s.end < D + 9 * HOUR && isNight(s.start)).pop();
        const chain = [wakeUp].concat(dn);
        const target = pos < 3 ? dn[pos] : sleeps.find(s => isNight(s.start) && s.start >= D + 17 * HOUR && s.start < D + DAY);
        const prev = pos < 3 ? chain[pos] : dn[dn.length - 1];
        if (target && prev && prev.end) samples.push({ w: (target.start - prev.end) / MIN, weight: 8 - k });
      }
      n = samples.length;
      if (!n) { windowMin = (range[0] + range[1]) / 2; basis = 'Sin suficientes registros: usamos el punto medio de la referencia por edad.'; conf = 'baja'; }
      else {
        samples.sort((a, b) => a.w - b.w);
        const totalW = samples.reduce((s, x) => s + x.weight, 0); let acc = 0; windowMin = samples[0].w;
        for (const s of samples) { acc += s.weight; if (acc >= totalW / 2) { windowMin = s.w; break; } }
        const spread = samples[samples.length - 1].w - samples[0].w;
        conf = n >= 5 && spread < 45 ? 'alta' : n >= 3 ? 'media' : 'baja';
        basis = 'Mediana ponderada de sus últimos ' + n + ' días, antes de la ' + (pos < 3 ? (pos + 1) + '.ª siesta' : 'hora de dormir') + ': ' + fDur(windowMin) + '.';
      }
    }
    const clamped = Math.max(range[0], Math.min(range[1], windowMin));
    let center = last.end + clamped * MIN;
    let kind = pos < 3 ? 'Próxima siesta' : 'Hora de dormir';
    if (pos >= 3 || center > bedMs - 30 * MIN) { kind = 'Hora de dormir'; center = Math.round((center + bedMs) / 2); }
    const lastShort = (last.end - last.start) < 30 * MIN && !isNight(last.start);
    if (lastShort && conf !== 'baja') conf = conf === 'alta' ? 'media' : 'baja';
    const sick = ev.some(e => (e.type === 'temperatura' && e.payload.valor_c >= 38 || e.type === 'sintoma') && now - e.start < DAY);
    if (sick) conf = 'baja';
    return {
      kind, from: center - 15 * MIN, to: center + 15 * MIN, conf, basis, range, clamped: clamped !== windowMin, lastEnd: last.end,
      notes: [lastShort ? 'La última siesta fue corta (menos de 30 min), así que confiamos menos.' : null, sick ? 'Hoy hay fiebre o síntomas registrados; el día puede ser atípico.' : null].filter(Boolean),
      custom: state.windows.mode === 'custom'
    };
  }

  /* Señales de alarma (umbrales por validar con un pediatra) */
  function tempAlarm(state, valor, now, excludeId) {
    if (valor < 38) return null;
    const mo = ageMonthsFloat(state.baby.birth, now);
    if (mo < 3) return { title: 'Fiebre en menor de 3 meses', text: 'Con 38 °C o más a esta edad, llama a tu pediatra o busca atención médica ahora.' };
    const prior = state.events.filter(e => !e.deleted && e.id !== excludeId && e.type === 'temperatura' && e.payload.valor_c >= 38 && now - e.start < DAY);
    if (prior.length) return { title: 'Es otra temperatura alta en 24 horas', text: 'Si sigue alta, si la notas muy decaída o le cuesta respirar, llama a tu pediatra o busca atención médica.' };
    return { title: 'Temperatura de 38 °C o más', text: 'Vuelve a tomarla más tarde. Si se mantiene, si la notas decaída o le cuesta respirar, llama a tu pediatra.' };
  }

  /* Estado persistente (solo en este navegador) */
  const KEY = 'tereza-prototipo-v1';
  function load() { try { const raw = localStorage.getItem(KEY); if (!raw) return null; const s = JSON.parse(raw); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* sin almacenamiento: seguimos en memoria */ } }

  window.TZ = {
    MIN, HOUR, DAY, pad, cap, DIAS, DIAS_C, MESES, fTime, fDur, fAgo, fClock, fMS, fDate, fDateY, fShort, dayStart, addDays, at, dayLabel,
    toTimeInput, fromTimeInput, toDateInput, fromDateInput, num, U, ML_OZ, G_LB, MM_IN,
    ageParts, ageText, ageMonthsFloat, curves, valAt, percentile, pText, sleepRef, wakeRange,
    uid, seedState, emptyState, evInfo, breastSecs, savedText, isNight, daySleep, periodStats, predict, tempAlarm, load, save,
    LUGAR, COMO, CONT
  };
})();
