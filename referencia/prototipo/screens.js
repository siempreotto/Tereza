/* Tereza · prototipo — pantallas */
(function () {
  'use strict';
  const { useState, useEffect, useMemo } = React;
  const T = window.Tereza, Z = window.TZ;
  const { html, useApp, Icon, Ic, CatIcon, EventRow, Seg, Chips, Field, Stepper, Switch, Check, TimeInput, Back, Alert, RolePicker, ROLE_N } = window.TZUI;

  const live = s => s.events.filter(e => !e.deleted);
  const byStartDesc = (a, b) => b.start - a.start;
  const isFeed = e => e.type === 'toma_pecho' || e.type === 'toma_biberon' || e.type === 'toma_solidos';

  function Top({ title, sub }) {
    const { s, now, nightOn, toggleNight, go, limited } = useApp();
    return html`<div className="tz-top">
      <button type="button" className="tz-baby m-only" onClick=${() => !limited && go('bebe')} style=${{ cursor: limited ? 'default' : 'pointer' }}>
        <span className="tz-avatar">${s.baby.name.charAt(0)}</span><span className="text-body-strong">${s.baby.name}</span><span className="text-body-sm tz-muted">${Z.ageText(s.baby.birth, now)}</span>
      </button>
      <h1 className="d-only text-title-lg">${title || 'Hoy, ' + Z.fDate(now).toLowerCase()}</h1>
      <div className="tz-top-actions">
        ${limited ? html`<span className="tz-tag">${Ic('lock', 16)}${((s.members.find(m => m.id === s.me) || {}).name || '').replace(/^Abuel[oa] /, '')}</span>` : html`<span className="text-body-sm tz-muted m-only tz-num">${sub || Z.fTime(now)}</span>`}
        <button className="tz-iconbtn" type="button" aria-label=${nightOn ? 'Cambiar a modo día' : 'Cambiar a modo noche'} onClick=${toggleNight}>${Icon(nightOn ? 'sun' : 'moon')}</button>
      </div>
    </div>`;
  }

  function PageHead({ back, backLabel, title, sub, action, always }) {
    return html`<div className="tz-pagehead">
      ${back ? html`<${Back} to=${back} label=${backLabel} always=${always} />` : null}
      <div className="tz-h between"><h1 className="text-title-lg">${title}</h1>${action || null}</div>
      ${sub ? html`<p className="text-body-sm tz-muted">${sub}</p>` : null}
    </div>`;
  }

  function OfflineBanner() {
    const { s } = useApp();
    if (!s.sim.offline) return null;
    const n = s.events.filter(e => e.pending && !e.deleted).length;
    return html`<div className="tz-banner" role="status">${Ic('cloudoff', 20)}<p className="text-body-sm grow"><strong>Sin conexión.</strong> Lo que registres se guarda en este teléfono y se envía al volver la señal.${n ? ' Por enviar: ' + n + '.' : ''}</p></div>`;
  }

  /* ---------------- Hoy ---------------- */
  function Prediction() {
    const { s, now, go } = useApp();
    const [why, setWhy] = useState(false);
    const p = Z.predict(s, now);
    if (p.sleeping) return null;
    if (p.none) return html`<div className="tz-card tz-glass tz-stack s8"><span className="text-label tz-muted">Próxima siesta</span><p className="text-body">${p.reason}</p></div>`;
    const span = p.to - p.lastEnd, pct = x => Math.max(0, Math.min(100, (x - p.lastEnd) / (span + 40 * Z.MIN) * 100));
    return html`<section className="tz-card lg tz-glass tz-stack s16" aria-label="Estimación de la próxima siesta">
      <div className="tz-h between top">
        <div className="tz-stack s4"><span className="text-label tz-muted">${p.kind} · estimación</span><p className="text-title-lg tz-num">entre ${Z.fTime(p.from)} y ${Z.fTime(p.to)}</p></div>
        <span className="tz-tag primary">Confianza ${p.conf}</span>
      </div>
      <div className="tz-stack s8" aria-hidden="true">
        <div style=${{ position: 'relative', height: '12px', borderRadius: '999px', background: 'var(--track)' }}>
          <div style=${{ position: 'absolute', left: 0, width: pct(now) + '%', top: 0, bottom: 0, borderRadius: '999px', background: 'var(--cat-sleep-soft)', boxShadow: 'inset 0 0 0 1.5px var(--cat-sleep)' }}></div>
          <div style=${{ position: 'absolute', left: pct(p.from) + '%', width: (pct(p.to) - pct(p.from)) + '%', top: '-4px', bottom: '-4px', borderRadius: '999px', background: 'var(--primary)' }}></div>
          <div style=${{ position: 'absolute', left: pct(now) + '%', top: '-8px', bottom: '-8px', width: '2px', marginLeft: '-1px', background: 'var(--ink)', borderRadius: '2px' }}></div>
        </div>
        <div className="tz-h between text-body-sm tz-muted tz-num"><span>Despertó ${Z.fTime(p.lastEnd)}</span><span className="tz-strong" style=${{ color: 'var(--ink)' }}>Ahora ${Z.fTime(now)}</span></div>
      </div>
      <button type="button" className="tz-row tz-sunken" style=${{ borderRadius: '18px' }} aria-expanded=${why} onClick=${() => setWhy(!why)}>
        ${Ic('info', 20, 'c-primary')}<span className="grow text-body-strong">¿Por qué esta franja?</span><span className="chev" style=${{ transform: why ? 'rotate(180deg)' : null }}>${Ic('chevdown')}</span>
      </button>
      ${why ? html`<div className="tz-stack s8">
        <p className="text-body">${p.basis} La referencia por edad es de ${Z.fDur(p.range[0])} a ${Z.fDur(p.range[1])}${p.clamped ? ', y ajustamos el valor para quedar dentro de ella' : ''}.</p>
        ${p.notes.map(n => html`<p key=${n} className="text-body-sm c-warning">${n}</p>`)}
        <p className="text-body-sm tz-muted">Estimación basada en la edad de ${s.baby.name} y en sus últimos registros. Es una referencia práctica, no una regla.</p>
        <button type="button" className="tz-link" style=${{ background: 'none', border: 0, padding: 0, cursor: 'pointer', minHeight: '36px' }} onClick=${() => go('ventanas')}>Ajustar ventanas de vigilia</button>
      </div>` : null}
    </section>`;
  }

  function Hoy() {
    const { s, now, openSheet, addEvent, update, toast, go, limited, loading } = useApp();
    const ev = live(s);
    const today = Z.dayStart(now);
    const sleepNow = ev.find(e => e.type === 'sueno' && !e.end);
    const breastNow = ev.find(e => e.type === 'toma_pecho' && !e.end);
    const lastSleep = ev.filter(e => e.type === 'sueno' && e.end).sort((a, b) => b.end - a.end)[0];
    const lastFeed = ev.filter(isFeed).sort(byStartDesc)[0];
    const lastDiaper = ev.filter(e => e.type === 'panal').sort(byStartDesc)[0];
    const ds = Z.daySleep(ev, today, now);
    const todayEv = ev.filter(e => e.start >= today || (!e.end && (e.type === 'sueno' || e.type === 'toma_pecho'))).sort(byStartDesc);
    const wet = ev.filter(e => e.type === 'panal' && e.payload.mojado && e.start >= today).length;
    const fewWet = new Date(now).getHours() >= 18 && wet < 4;
    const u = s.household.units;

    const endSleep = () => {
      const id = sleepNow.id, dur = (now - sleepNow.start) / Z.MIN;
      update(st => { st.events.find(e => e.id === id).end = now; });
      toast('Despertó. Durmió ' + Z.fDur(dur), () => update(st => { st.events.find(e => e.id === id).end = null; }));
    };
    const startSleep = () => addEvent({ type: 'sueno', start: now, end: null, payload: { lugar: 'cuna', como: 'sola' } }, 'Empezó el sueño a las ' + Z.fTime(now));
    const setSide = side => update(st => {
      const e = st.events.find(x => x.id === breastNow.id); const p = e.payload;
      if (p.active && p.since) { const extra = Math.round((now - p.since) / 1000); if (p.active === 'izq') p.segIzq += extra; else p.segDer += extra; }
      if (!side) p.lastSide = p.active;
      p.active = side; p.since = side ? now : null;
    });
    const endBreast = () => {
      const id = breastNow.id;
      update(st => { const e = st.events.find(x => x.id === id); const p = e.payload; if (p.active && p.since) { const extra = Math.round((now - p.since) / 1000); if (p.active === 'izq') p.segIzq += extra; else p.segDer += extra; } p.active = null; p.since = null; e.end = now; });
      toast('Guardé la toma de pecho', () => update(st => { const e = st.events.find(x => x.id === id); e.end = null; }));
    };
    const quick = k => { if (k === 'sleep') return sleepNow ? endSleep() : startSleep(); openSheet({ type: k === 'feed' ? 'toma' : 'panal' }); };

    if (loading) return html`<main className="tz-main docked" aria-busy="true">
      <div className="tz-top"><span className="tz-baby m-only"><span className="tz-avatar">${s.baby.name.charAt(0)}</span><span className="text-body-strong">${s.baby.name}</span></span><span className="text-body-sm tz-muted" role="status">Cargando el día…</span></div>
      <section className="tz-hero tz-glass" aria-hidden="true"><div className="tz-stack s8"><span className="tz-skel line" style=${{ width: '90px' }}></span><span className="tz-skel" style=${{ height: '36px', width: '78%' }}></span><span className="tz-skel line" style=${{ width: '60%' }}></span></div></section>
      <div className="tz-list tz-glass" aria-hidden="true">${[1, 2, 3].map(i => html`<div key=${i} className="tz-row"><span className="tz-skel" style=${{ width: '44px', height: '44px', borderRadius: '16px' }}></span><span className="grow"><span className="tz-skel line" style=${{ width: '50%' }}></span><span className="tz-skel line" style=${{ width: '70%', marginTop: '6px' }}></span></span></div>`)}</div>
    </main>`;

    let hero, dock;
    if (breastNow) {
      const b = Z.breastSecs(breastNow, now), p = breastNow.payload;
      const tile = (side, label, secs) => html`<button type="button" className=${'tz-big' + (p.active === side ? ' on' : '')} aria-pressed=${p.active === side} onClick=${() => setSide(side)}>
        <span className="text-label">${label}</span><span className="text-title-lg tz-num">${Z.fMS(secs)}</span>
        ${p.active === side ? html`<span className="tz-live text-label tz-cat-feed"><span className="tz-live-dot" aria-hidden="true"></span>En curso</span>` : html`<span className="text-body-sm tz-muted">${p.active ? 'Tocar para cambiar' : 'En pausa'}</span>`}
      </button>`;
      hero = html`<section className="tz-hero tz-glass" aria-label="Toma de pecho en curso">
        <div className="tz-hero-state"><span className="tz-kicker text-label c-feed">${Icon('bottle', 16)}Toma de pecho</span><p className="text-timer" role="timer">${Z.fClock(b.total)}</p><p className="text-body tz-muted">Empezó a las ${Z.fTime(breastNow.start)} con el ${p.lado_inicial === 'izq' ? 'izquierdo' : 'derecho'}.</p></div>
        <div className="tz-grid2">${tile('izq', 'Izquierdo', b.izq)}${tile('der', 'Derecho', b.der)}</div>
      </section>`;
      dock = html`<div className="tz-dock">
        <div className="tz-grid2">
          <button className="tz-btn tz-btn-glass text-button" type="button" onClick=${() => setSide(p.active === 'izq' ? 'der' : 'izq')}>${Ic('swap', 20)}<span>Cambiar a ${p.active === 'izq' ? 'derecho' : 'izquierdo'}</span></button>
          <${T.Button} variant="glass" icon=${p.active ? 'pause' : 'play'} onClick=${() => setSide(p.active ? null : (p.lastSide || p.lado_inicial))}>${p.active ? 'Pausar' : 'Reanudar'}<//>
        </div>
        <${T.Button} variant="primary" size="lg" icon="check" block=${true} onClick=${endBreast}>Terminar toma<//>
      </div>`;
    } else if (sleepNow) {
      const el = (now - sleepNow.start) / 1000;
      const lf = lastFeed ? Z.evInfo(lastFeed, u, now) : null;
      hero = html`<section className="tz-hero tz-glass" aria-label="Estado actual" style=${{ alignItems: 'center', textAlign: 'center', paddingTop: '28px' }}>
        <${T.TimerRing} category="sleep" size=${232} progress=${Math.min(1, el / 5400)} time=${Z.fClock(el)} label="Durmiendo" caption=${'desde ' + Z.fTime(sleepNow.start)} />
        <p className="text-body tz-muted">${Z.isNight(sleepNow.start) ? 'Noche' : 'Siesta'} · ${Z.LUGAR[sleepNow.payload.lugar] || 'cuna'}${sleepNow.payload.como ? ', ' + Z.COMO[sleepNow.payload.como] : ''}</p>
        <div className="tz-hero-facts" style=${{ width: 'calc(100% + 40px)', textAlign: 'left' }}>
          <div><span className="text-label tz-muted">Dormido hoy</span><span className="text-body-strong tz-num">${Z.fDur(ds.total)}</span><span className="text-body-sm tz-muted">desde las 12 a.m.</span></div>
          <div><span className="text-label tz-muted">Última toma</span><span className="text-body-strong tz-num">${lastFeed ? Z.fTime(lastFeed.start) : '—'}</span><span className="text-body-sm tz-muted">${lf ? lf.title : 'Sin registro'}</span></div>
        </div>
      </section>`;
      dock = html`<div className="tz-dock">
        <${T.Button} variant="primary" size="lg" icon="sun" block=${true} onClick=${endSleep}>Despertó<//>
        ${limited ? null : html`<div className="tz-grid2">
          <${T.Button} variant="glass" onClick=${() => go('evento', { id: sleepNow.id })}>Cambiar inicio<//>
          <${T.Button} variant="glass" onClick=${() => go('evento', { id: sleepNow.id })}>Agregar detalles<//>
        </div>`}
      </div>`;
    } else {
      const lf = lastFeed ? Z.evInfo(lastFeed, u, now) : null, ld = lastDiaper ? Z.evInfo(lastDiaper, u, now) : null;
      hero = ev.length ? html`<section className="tz-hero tz-glass" aria-label="Estado actual">
        <div className="tz-hero-state">
          <span className="tz-kicker text-label c-sleep">${Icon('sun', 16)}Despierta</span>
          <p className="text-display tz-num">${lastSleep ? Z.fAgo(lastSleep.end, now) : 'sin sueño registrado'}</p>
          ${lastSleep ? html`<p className="text-body tz-muted">Se despertó a las ${Z.fTime(lastSleep.end)} de ${Z.isNight(lastSleep.start) ? 'la noche' : 'una siesta de ' + Z.fDur((lastSleep.end - lastSleep.start) / Z.MIN)}.</p>` : null}
        </div>
        <div className="tz-hero-facts three">
          <div><span className="text-label tz-muted">Última toma</span><span className="text-body-strong tz-num">${lastFeed ? Z.fAgo(lastFeed.start, now) : '—'}</span><span className="text-body-sm tz-muted">${lf ? lf.title.replace('Toma de pecho', 'Pecho') + ' · ' + Z.fTime(lastFeed.start) : 'Sin registro'}</span></div>
          <div><span className="text-label tz-muted">Último pañal</span><span className="text-body-strong tz-num">${lastDiaper ? Z.fAgo(lastDiaper.start, now) : '—'}</span><span className="text-body-sm tz-muted">${ld ? ld.detail : 'Sin registro'}</span></div>
          <div><span className="text-label tz-muted">Sueño hoy</span><span className="text-body-strong tz-num">${Z.fDur(ds.total)}</span><span className="text-body-sm tz-muted">${ds.naps} ${ds.naps === 1 ? 'siesta' : 'siestas'}</span></div>
        </div>
      </section>` : html`<section className="tz-hero tz-glass" style=${{ gap: '8px' }}>
        <span className="tz-kicker text-label tz-muted">Primer día con Tereza</span>
        <p className="text-title-lg">¿Qué está haciendo ${s.baby.name} ahora?</p>
        <p className="text-body tz-muted">Empieza por ahí. Un toque guarda la hora; los detalles pueden esperar.</p>
      </section>`;
      dock = html`<div className="tz-dock"><${T.QuickActions} categories=${['sleep', 'feed', 'diaper']} labels=${{ sleep: 'Iniciar sueño', feed: 'Toma', diaper: 'Pañal' }} onSelect=${quick} /></div>`;
    }

    return html`<main className="tz-main docked">
      <${Top} />
      <${OfflineBanner} />
      <div className="tz-cols">
        <div className="tz-stack s16">
          ${hero}
          ${!breastNow && !sleepNow && ev.length && !limited ? html`<${Prediction} />` : null}
          ${fewWet && !limited ? html`<${Alert} title=${'Pocos pañales mojados hoy (' + wet + ')'}>Si sigue así, si rechaza las tomas o la notas decaída, llama a tu pediatra.<//>` : null}
          ${limited ? html`<div className="tz-banner">${Ic('info', 20, 'c-primary')}<p className="text-body-sm">Puedes registrar tomas, pañales y sueño, y ver lo de hoy. Para salud o días anteriores, pregúntale a quien administra el hogar.</p></div>` : null}
          ${dock}
        </div>
        <section className="tz-stack" aria-label="Registros de hoy">
          <div className="tz-sec"><h2 className="text-title">Hoy</h2>${limited ? null : html`<button type="button" className="tz-link" style=${{ background: 'none', border: 0, cursor: 'pointer' }} onClick=${() => go('diario', { off: 0 })}>Ver diario</button>`}</div>
          ${todayEv.length ? html`<div className="tz-list tz-glass">
            ${todayEv.slice(0, limited ? 20 : 6).map(e => html`<${EventRow} key=${e.id} e=${e} onClick=${limited ? undefined : () => go('evento', { id: e.id })} />`)}
          </div>` : html`<div className="tz-sunken tz-stack s8" style=${{ padding: '20px', alignItems: 'flex-start' }}>
            <p className="text-body">Lo que registres hoy aparecerá aquí, en orden.</p>
            ${limited ? null : html`<p className="text-body-sm tz-muted">¿Prefieres escribirlo? Conecta Claude y dile «${s.baby.name} se durmió a las 10».</p>`}
          </div>`}
        </section>
      </div>
    </main>`;
  }

  /* ---------------- Diario ---------------- */
  function Diario() {
    const { s, now, go, params } = useApp();
    const off = params.off || 0;
    const D = Z.addDays(Z.dayStart(now), off), D2 = D + Z.DAY;
    const ev = live(s);
    const PX = 32, y = m => (m / 60 * PX) + 'px';
    const dayEv = ev.filter(e => e.start >= D && e.start < D2 && e.type !== 'sueno').sort((a, b) => a.start - b.start);
    const sleeps = ev.filter(e => e.type === 'sueno' && e.start < D2 && (e.end || now) > D);
    const blocks = sleeps.map(e => {
      const a = Math.max(e.start, D), b = Math.min(e.end || Math.min(now, D2), D2);
      return b > a ? { id: e.id, nap: !Z.isNight(e.start), top: (a - D) / Z.MIN, h: (b - a) / Z.MIN } : null;
    }).filter(Boolean);
    // agrupar eventos cercanos para que no se encimen
    const groups = [];
    dayEv.forEach(e => { const g = groups[groups.length - 1]; if (g && e.start - g.start < 45 * Z.MIN) g.items.push(e); else groups.push({ start: e.start, items: [e] }); });
    const u = s.household.units;
    const ds = Z.daySleep(ev, D, now);
    const feeds = dayEv.filter(isFeed).length, diapers = dayEv.filter(e => e.type === 'panal').length;
    // tira de la semana (lunes a domingo)
    const dow = (new Date(D).getDay() + 6) % 7;
    const mon = Z.addDays(D, -dow);
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => {
      const d = Z.addDays(mon, i); const de = ev.filter(e => e.start >= d && e.start < d + Z.DAY);
      const marks = []; if (de.some(e => e.type === 'sueno')) marks.push('sleep'); if (de.some(isFeed)) marks.push('feed'); if (de.some(e => e.type === 'panal')) marks.push('diaper'); else if (de.some(e => e.type === 'medicamento')) marks.push('meds');
      return { weekday: Z.DIAS_C[new Date(d).getDay()], date: String(new Date(d).getDate()), marks, today: d === Z.dayStart(now), ariaLabel: Z.fDate(d), d };
    });
    const label = { 0: '12 a.m.', 3: '3 a.m.', 6: '6 a.m.', 9: '9 a.m.', 12: '12 p.m.', 15: '3 p.m.', 18: '6 p.m.', 21: '9 p.m.', 24: '12 a.m.' };
    const nowLine = off === 0 ? (now - D) / Z.MIN : null;
    return html`<main className="tz-main">
      <div className="tz-top">
        <div className="tz-stack" style=${{ gap: 0 }}><h1 className="text-title-lg">Diario</h1><p className="text-body-sm tz-muted">${Z.fDate(D)}</p></div>
        <div className="tz-top-actions">
          <button className="tz-iconbtn" type="button" aria-label="Día anterior" onClick=${() => go('diario', { off: off - 1 })}>${Icon('chevron-left')}</button>
          <button className="tz-iconbtn" type="button" aria-label="Día siguiente" disabled=${off >= 0} style=${{ opacity: off >= 0 ? 0.45 : 1 }} onClick=${() => off < 0 && go('diario', { off: off + 1 })}>${Icon('chevron-right')}</button>
        </div>
      </div>
      <${T.DayStrip} days=${days} selected=${dow} label="Semana" onSelect=${i => { const d = days[i].d; if (d <= Z.dayStart(now)) go('diario', { off: Math.round((d - Z.dayStart(now)) / Z.DAY) }); }} />
      <div className="tz-cols">
        <section className="tz-stack s16" aria-label="Línea de tiempo de 24 horas">
          <div className="tz-h wrap s8"><span className="tz-tag sleep">${Icon('moon', 14)}Sueño ${Z.fDur(ds.total)}</span><span className="tz-tag">${feeds} ${feeds === 1 ? 'toma' : 'tomas'}</span><span className="tz-tag">${diapers} ${diapers === 1 ? 'pañal' : 'pañales'}</span></div>
          <div className="tz-legend"><span><i className="tz-sw n"></i>Noche</span><span><i className="tz-sw d" style=${{ background: 'repeating-linear-gradient(135deg, var(--cat-sleep-soft) 0 6px, transparent 6px 10px)' }}></i>Siesta</span></div>
          <div className="tz-tl" style=${{ height: (24 * PX + 8) + 'px' }}>
            ${Array.from({ length: 25 }, (_, i) => html`<div key=${'h' + i} className="tz-tl-hour" style=${{ top: y(i * 60) }}><span>${label[i] || ''}</span></div>`)}
            ${blocks.map(b => html`<button key=${b.id} type="button" className=${'tz-tl-sleep' + (b.nap ? ' nap' : '')} aria-label=${(b.nap ? 'Siesta' : 'Noche') + ' de ' + Z.fDur(b.h)} style=${{ top: y(b.top), height: y(Math.max(b.h, 12)), cursor: 'pointer', padding: 0 }} onClick=${() => go('evento', { id: b.id })}></button>`)}
            ${nowLine != null ? html`<div style=${{ position: 'absolute', left: '56px', right: 0, top: y(nowLine), borderTop: '2px solid var(--primary)' }} aria-hidden="true"></div>` : null}
            ${groups.map(g => { const i0 = Z.evInfo(g.items[0], u, now); return html`<button key=${g.items[0].id} type="button" className="tz-tl-ev" style=${{ top: y((g.start - D) / Z.MIN), background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick=${() => go('evento', { id: g.items[0].id })}>
              <span className="t">${Z.fTime(g.start)}</span><${CatIcon} cat=${i0.cat} size="sm" />
              <span className="text-body-sm" style=${{ color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>${g.items.map(e => Z.evInfo(e, u, now).title).join(' · ')}</span>
            </button>`; })}
          </div>
        </section>
        <section className="tz-stack" aria-label="Todos los registros del día">
          <h2 className="text-title">Registros del día</h2>
          ${dayEv.length || blocks.length ? html`<div className="tz-list tz-glass">${ev.filter(e => e.start >= D && e.start < D2).sort(byStartDesc).map(e => html`<${EventRow} key=${e.id} e=${e} onClick=${() => go('evento', { id: e.id })} />`)}</div>` : html`<p className="text-body tz-muted">No hay registros este día.</p>`}
          <p className="text-body-sm tz-muted">${Z.sleepRef(Z.ageMonthsFloat(s.baby.birth, D)).label} de sueño en 24 h.</p>
        </section>
      </div>
    </main>`;
  }

  function Evento() {
    const { s, now, params, go, update, deleteEvent, toast, openSheet } = useApp();
    const e0 = s.events.find(e => e.id === params.id);
    const [e, setE] = useState(e0 ? JSON.parse(JSON.stringify(e0)) : null);
    if (!e0 || !e) return html`<main className="tz-main"><${PageHead} back="diario" backLabel="Diario" always=${true} title="Registro no encontrado" /><p className="text-body">Puede que lo hayan eliminado. Vuelve al diario para ver lo más reciente.</p></main>`;
    const u = s.household.units, i = Z.evInfo(e, u, now), p = e.payload;
    const set = (k, v) => setE(Object.assign({}, e, { payload: Object.assign({}, e.payload, { [k]: v }) }));
    const who = (s.members.find(m => m.id === e.by) || { name: 'Alguien' }).name;
    const step = u.vol === 'oz' ? 0.5 : 10;
    const save = () => { const before = JSON.parse(JSON.stringify(e0)); update(st => { const ix = st.events.findIndex(x => x.id === e.id); st.events[ix] = Object.assign({}, e, { edited: Date.now(), editedBy: st.me }); }); toast('Guardé los cambios', () => update(st => { const ix = st.events.findIndex(x => x.id === e.id); st.events[ix] = before; })); go(params.from || 'diario', { off: Math.round((Z.dayStart(e.start) - Z.dayStart(now)) / Z.DAY) }); };
    const fields = [];
    fields.push(html`<div key="t" className=${e.type === 'sueno' || e.type === 'toma_pecho' ? 'tz-timefield' : ''}>
      <${Field} label=${e.type === 'sueno' ? 'Se durmió' : 'Hora'} id="ev-start"><${TimeInput} id="ev-start" label="Inicio" value=${e.start} onChange=${v => setE(Object.assign({}, e, { start: v }))} /><//>
      ${e.type === 'sueno' || e.type === 'toma_pecho' ? html`<${Field} label=${e.type === 'sueno' ? 'Despertó' : 'Terminó'} id="ev-end">${e.end ? html`<${TimeInput} id="ev-end" label="Fin" value=${e.end} onChange=${v => setE(Object.assign({}, e, { end: v < e.start ? v + Z.DAY : v }))} />` : html`<span className="tz-input sunken">En curso</span>`}<//>` : null}
    </div>`);
    if (e.type === 'sueno') fields.push(html`<${Field} key="l" label="Dónde durmió"><${Chips} value=${p.lugar} onChange=${v => set('lugar', v)} options=${[{ v: 'cuna', l: 'Cuna' }, { v: 'brazos', l: 'Brazos' }, { v: 'carriola', l: 'Carriola' }, { v: 'auto', l: 'Auto' }, { v: 'otro', l: 'Otro' }]} /><//>`,
      html`<${Field} key="c" label="Cómo se durmió"><${Chips} value=${p.como} onChange=${v => set('como', v)} options=${[{ v: 'sola', l: 'Sola' }, { v: 'arrullo', l: 'Arrullo' }, { v: 'pecho', l: 'Pecho' }, { v: 'biberon', l: 'Biberón' }]} /><//>`);
    if (e.type === 'toma_biberon') {
      const vol = Z.U.volNum(p.volumen_ml || 0, u.vol), left = Z.U.volNum(p.sobrante_ml || 0, u.vol);
      fields.push(html`<${Field} key="ct" label="Qué tomó"><${Chips} value=${p.contenido} onChange=${v => set('contenido', v || 'materna')} options=${[{ v: 'materna', l: 'Leche materna' }, { v: 'formula', l: 'Fórmula' }, { v: 'mixta', l: 'Mixta' }]} /><//>`,
        html`<div key="vv" className="tz-grid2"><${Field} label="Le diste"><${Stepper} label="volumen" value=${Z.num(vol, 1)} unit=${u.vol} onDec=${() => set('volumen_ml', Math.round(Z.U.volToMl(Math.max(0, vol - step), u.vol)))} onInc=${() => set('volumen_ml', Math.round(Z.U.volToMl(vol + step, u.vol)))} /><//>
        <${Field} label="Sobró"><${Stepper} label="sobrante" value=${Z.num(left, 1)} unit=${u.vol} onDec=${() => set('sobrante_ml', Math.round(Z.U.volToMl(Math.max(0, left - step), u.vol)))} onInc=${() => set('sobrante_ml', Math.round(Z.U.volToMl(left + step, u.vol)))} /><//></div>`);
    }
    if (e.type === 'toma_pecho' && e.end) fields.push(html`<div key="pp" className="tz-grid2">
      <${Field} label="Izquierdo"><${Stepper} label="un minuto" value=${Math.round((p.segIzq || 0) / 60)} unit="min" onDec=${() => set('segIzq', Math.max(0, (p.segIzq || 0) - 60))} onInc=${() => set('segIzq', (p.segIzq || 0) + 60)} /><//>
      <${Field} label="Derecho"><${Stepper} label="un minuto" value=${Math.round((p.segDer || 0) / 60)} unit="min" onDec=${() => set('segDer', Math.max(0, (p.segDer || 0) - 60))} onInc=${() => set('segDer', (p.segDer || 0) + 60)} /><//></div>`);
    if (e.type === 'panal') fields.push(html`<${Field} key="pn" label="Tipo"><${Seg} label="Tipo de pañal" value=${p.mojado && p.sucio ? 'ambos' : p.sucio ? 'sucio' : 'mojado'} onChange=${v => setE(Object.assign({}, e, { payload: Object.assign({}, p, { mojado: v !== 'sucio', sucio: v !== 'mojado' }) }))} options=${[{ v: 'mojado', l: 'Mojado' }, { v: 'sucio', l: 'Sucio' }, { v: 'ambos', l: 'Ambos' }]} /><//>`);
    if (e.type === 'medicamento') fields.push(html`<${Field} key="md" label="Cantidad, tal como la indicó tu pediatra" id="ev-q"><input id="ev-q" className="tz-input" value=${p.cantidad || ''} onChange=${ev => set('cantidad', ev.target.value)} /><//>`);
    if (e.type === 'temperatura') fields.push(html`<${Stepper} key="tv" label="una décima" value=${Z.num(p.valor_c, 1)} unit="°C" onDec=${() => set('valor_c', Math.round((p.valor_c - 0.1) * 10) / 10)} onInc=${() => set('valor_c', Math.round((p.valor_c + 0.1) * 10) / 10)} />`);
    if (e.type === 'nota') fields.push(html`<${Field} key="nt" label="Nota" id="ev-nt"><textarea id="ev-nt" className="tz-input area" value=${p.texto || ''} onChange=${ev => set('texto', ev.target.value)}></textarea><//>`);
    else fields.push(html`<${Field} key="nn" label="Nota (opcional)" id="ev-n"><textarea id="ev-n" className="tz-input area" value=${e.notes || ''} onChange=${ev => setE(Object.assign({}, e, { notes: ev.target.value }))}></textarea><//>`);
    return html`<main className="tz-main" style=${{ paddingBottom: '160px' }}>
      <div className="tz-pagehead">
        <${Back} to=${params.from || 'diario'} label=${params.from === 'hoy' ? 'Hoy' : 'Diario'} always=${true} />
        <div className="tz-h"><${CatIcon} cat=${i.cat} size="lg" /><div className="tz-stack" style=${{ gap: 0 }}><h1 className="text-title-lg">${i.title}</h1><p className="text-body-sm tz-muted">${Z.fDate(e.start)}</p></div></div>
      </div>
      <div className="tz-cols">
        <div className="tz-stack s16">${fields}</div>
        <section className="tz-sunken tz-stack s8" style=${{ padding: '16px' }} aria-label="Historial del registro">
          <div className="tz-h top"><span className="tz-avatar sm">${who.charAt(0)}</span><div className="tz-stack" style=${{ gap: 0 }}><span className="text-body-strong">Registrado por ${who} ${e.source === 'mcp' ? 'desde Claude' : 'desde la app'}</span><span className="text-body-sm tz-muted tz-num">${Z.dayLabel(e.start, now)}, ${Z.fTime(e.start)}</span></div></div>
          ${e0.edited ? html`<hr className="tz-divider" /><div className="tz-h top"><span className="tz-avatar sm">${((s.members.find(m => m.id === e0.editedBy) || { name: 'A' }).name).charAt(0)}</span><div className="tz-stack" style=${{ gap: 0 }}><span className="text-body-strong">Editado desde la app</span><span className="text-body-sm tz-muted tz-num">${Z.fTime(e0.edited)}</span></div></div>` : null}
          ${e.type === 'toma_biberon' ? html`<button type="button" className="tz-link" style=${{ background: 'none', border: 0, padding: 0, cursor: 'pointer', minHeight: '36px' }} onClick=${() => openSheet({ type: 'conflicto', id: e.id })}>${Ic('sync', 18)}Probar: otro cuidador lo editó a la vez</button>` : null}
        </section>
      </div>
      <div className="tz-dock low">
        <${T.Button} variant="primary" size="lg" block=${true} onClick=${save}>Guardar cambios<//>
        <button className="tz-btn tz-btn-ghost text-button" type="button" style=${{ color: 'var(--danger)' }} onClick=${() => { deleteEvent(e.id); go(params.from || 'diario', { off: Math.round((Z.dayStart(e.start) - Z.dayStart(now)) / Z.DAY) }); }}>${Ic('trash', 20)}<span>Eliminar registro</span></button>
      </div>
    </main>`;
  }

  /* ---------------- Patrones y resumen ---------------- */
  function Patrones() {
    const { s, now, params, go } = useApp();
    const w = params.w || 0;
    const ev = live(s);
    const end = Z.addDays(Z.dayStart(now), 1 + w * 7), start = Z.addDays(end, -7);
    const ref = Z.sleepRef(Z.ageMonthsFloat(s.baby.birth, now));
    const days = []; for (let d = start; d < end; d = Z.addDays(d, 1)) days.push(d);
    const pct = m => (m / 1440 * 100).toFixed(2) + '%';
    const rows = days.map(D => {
      const segs = ev.filter(e => e.type === 'sueno').map(e => { const a = Math.max(e.start, D), b = Math.min(e.end || now, D + Z.DAY); return b > a ? { n: Z.isNight(e.start), l: (a - D) / Z.MIN, w: (b - a) / Z.MIN } : null; }).filter(Boolean);
      const ds = Z.daySleep(ev, D, now);
      return { D, segs, total: ds.total / 60, partial: D === Z.dayStart(now) };
    });
    const st = Z.periodStats(ev, start, Math.min(end, Z.dayStart(now)), now);
    const lo = 9, hi = 18, H = 168, yb = v => ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * H);
    return html`<main className="tz-main">
      <${PageHead} back="mas" backLabel="Más" title="Patrones de sueño" sub=${Z.fDate(start) + ' al ' + Z.fDate(Z.addDays(end, -1)).toLowerCase()} action=${html`<div className="tz-h s8">
        <button className="tz-iconbtn plain" type="button" aria-label="Semana anterior" onClick=${() => go('patrones', { w: w - 1 })}>${Icon('chevron-left')}</button>
        <button className="tz-iconbtn plain" type="button" aria-label="Semana siguiente" disabled=${w >= 0} style=${{ opacity: w >= 0 ? 0.45 : 1 }} onClick=${() => w < 0 && go('patrones', { w: w + 1 })}>${Icon('chevron-right')}</button></div>`} />
      <div className="tz-grid2">
        <${T.StatCard} label="Promedio diario" value=${Z.fDur(st.sleep).replace(' min', '')} unit=${Math.round(st.sleep) % 60 ? 'min' : ''} category="sleep" badge=${st.sleep / 60 >= ref.min && st.sleep / 60 <= ref.max ? 'En la referencia' : null} badgeTone="success" caption=${st.sleep / 60 >= ref.min && st.sleep / 60 <= ref.max ? null : ref.label} />
        <${T.StatCard} label="Siestas al día" value=${Z.num(st.naps, 1)} unit=${'· ' + Z.fDur(st.nap)} caption=${'Noche: ' + Z.fDur(st.night)} />
      </div>
      <div className="tz-cols even">
        <section className="tz-card lg tz-glass tz-stack s16" aria-label="Bandas de sueño por día">
          <h2 className="text-title">Cuándo durmió</h2>
          <div className="tz-bands">${rows.map(r => html`<div key=${r.D} className="tz-band-row"><span className="text-label tz-muted">${Z.cap(Z.DIAS[new Date(r.D).getDay()]).slice(0, 3)}</span>
            <div className="tz-band" role="img" aria-label=${Z.fDate(r.D) + ': ' + Z.fDur(r.total * 60) + ' de sueño'}>${r.segs.map((g, i) => html`<i key=${i} className=${g.n ? 'n' : 'd'} style=${{ left: pct(g.l), width: pct(g.w) }}></i>`)}</div></div>`)}</div>
          <div className="tz-axis"><span>12 a.m.</span><span>6 a.m.</span><span>12 p.m.</span><span>6 p.m.</span><span>12 a.m.</span></div>
          <div className="tz-legend"><span><i className="tz-sw n"></i>Noche</span><span><i className="tz-sw d"></i>Siesta</span></div>
        </section>
        <section className="tz-card lg tz-glass tz-stack s16" aria-label="Horas de sueño por día">
          <h2 className="text-title">Horas en 24 h</h2>
          <div style=${{ position: 'relative', height: H + 'px', marginTop: '20px' }}>
            <div className="tz-chart-ref" style=${{ bottom: yb(ref.min) + 'px', height: (yb(ref.max) - yb(ref.min)) + 'px' }}></div>
            <span className="text-caption tz-muted" style=${{ position: 'absolute', right: 0, bottom: (yb(ref.max) + 2) + 'px' }}>${ref.max} h</span>
            <span className="text-caption tz-muted" style=${{ position: 'absolute', right: 0, bottom: (yb(ref.min) - 18) + 'px' }}>${ref.min} h</span>
            <div style=${{ position: 'absolute', inset: '0 36px 0 0', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              ${rows.map(r => html`<div key=${r.D} style=${{ position: 'relative' }}>
                <span style=${{ position: 'absolute', left: '50%', bottom: yb(r.total) + 'px', width: '14px', height: '14px', margin: '0 0 -7px -7px', borderRadius: '999px', background: r.partial ? 'var(--surface)' : 'var(--cat-sleep)', boxShadow: r.partial ? 'inset 0 0 0 2px var(--cat-sleep)' : '0 0 0 3px var(--surface)' }}></span>
                <span className="text-label tz-num" style=${{ position: 'absolute', left: 0, right: 0, textAlign: 'center', bottom: (yb(r.total) + 12) + 'px', color: 'var(--ink)' }}>${Z.num(r.total, 1)}</span>
              </div>`)}
            </div>
          </div>
          <div className="tz-chart-x" style=${{ paddingRight: '36px' }}>${rows.map(r => html`<span key=${r.D}>${Z.DIAS_C[new Date(r.D).getDay()]}</span>`)}</div>
          <div className="tz-legend"><span><i className="tz-sw ref"></i>${ref.label}</span>${w === 0 ? html`<span>Hoy aún no termina (punto hueco)</span>` : null}</div>
        </section>
      </div>
    </main>`;
  }

  function Resumen() {
    const { s, now, go } = useApp();
    const [p, setP] = useState('7');
    const ev = live(s);
    const today = Z.dayStart(now);
    const from = p === 'hoy' ? today : Z.addDays(today, -(+p));
    const to = p === 'hoy' ? today + Z.DAY : today;
    const st = Z.periodStats(ev, from, to, now);
    const ref = Z.sleepRef(Z.ageMonthsFloat(s.baby.birth, now));
    const inRef = st.sleep / 60 >= ref.min && st.sleep / 60 <= ref.max;
    const u = s.household.units.vol;
    const per = p === 'hoy' ? '' : ' al día';
    const row = (l, v) => html`<div className="tz-row"><span className="grow"><span className="text-body">${l}</span></span><span className="text-body-strong tz-num">${v}</span></div>`;
    return html`<main className="tz-main">
      <${PageHead} back="mas" backLabel="Más" title="Resumen" sub=${p === 'hoy' ? 'Hoy hasta ahora' : 'Promedios del ' + Z.fShort(from) + ' al ' + Z.fShort(Z.addDays(to, -1))} />
      <${Seg} label="Período" value=${p} onChange=${setP} style=${{ maxWidth: '420px' }} options=${[{ v: 'hoy', l: 'Hoy' }, { v: '7', l: '7 días' }, { v: '30', l: '30 días' }]} />
      <div className="tz-cols even">
        <section className="tz-stack" aria-label="Sueño">
          <${T.StatCard} label=${p === 'hoy' ? 'Sueño hoy' : 'Sueño en 24 h'} value=${Z.fDur(st.sleep)} category="sleep" caption=${ref.label} badge=${p !== 'hoy' && inRef ? 'En la referencia' : null} badgeTone="success" />
          <div className="tz-list tz-glass">${row('Noche', Z.fDur(st.night))}${row('Siestas', Z.num(st.naps, 1) + per + ' · ' + Z.fDur(st.nap))}${row('Despertares de noche', Z.num(st.nightWakes, 1) + (p === 'hoy' ? '' : ' por noche'))}</div>
        </section>
        <div className="tz-stack s24">
          <section className="tz-stack" aria-label="Tomas">
            <div className="tz-sec"><h2 className="text-title tz-h s8"><${CatIcon} cat="feed" size="sm" />Tomas</h2><span className="text-body-strong tz-num">${Z.num(st.feeds, 1)}${per}</span></div>
            <div className="tz-list tz-glass">${row('Pecho', Z.num(st.pecho, 1) + per + ' · ' + Math.round(st.pechoMin) + ' min')}${row('Biberón', Z.num(st.bib, 1) + per + ' · ' + Z.U.vol(st.bibMl, u))}</div>
          </section>
          <section className="tz-stack" aria-label="Pañales">
            <div className="tz-sec"><h2 className="text-title tz-h s8"><${CatIcon} cat="diaper" size="sm" />Pañales</h2><span className="text-body-strong tz-num">${Z.num(st.wet + st.dirty, 1)}${per}</span></div>
            <div className="tz-list tz-glass">${row('Mojados', Z.num(st.wet, 1) + per)}${row('Sucios', Z.num(st.dirty, 1) + per)}</div>
          </section>
          <button type="button" className="tz-link" style=${{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick=${() => go('resumenPediatra')}>${Ic('clipboard', 20)}Preparar resumen para el pediatra</button>
        </div>
      </div>
    </main>`;
  }

  window.TZS1 = { Top, PageHead, OfflineBanner, Hoy, Diario, Evento, Patrones, Resumen, live };
})();
