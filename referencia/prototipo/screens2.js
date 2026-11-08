/* Tereza · prototipo — Salud, Más y onboarding */
(function () {
  'use strict';
  const { useState } = React;
  const T = window.Tereza, Z = window.TZ;
  const { html, useApp, Icon, Ic, CatIcon, EventRow, Seg, Chips, Field, Stepper, Switch, Check, Back, Alert, RolePicker, ROLE_N } = window.TZUI;
  const { PageHead, live } = window.TZS1;
  const linkBtn = { background: 'none', border: 0, padding: 0, cursor: 'pointer' };

  function Row({ icon, title, sub, onClick, end }) {
    return html`<button type="button" className="tz-row" onClick=${onClick}>${icon}<span className="grow"><span className="text-body-strong">${title}</span>${sub ? html`<span className="text-body-sm tz-muted">${sub}</span>` : null}</span>${end || html`<span className="chev">${Icon('chevron-right')}</span>`}</button>`;
  }
  const ini = n => n.replace(/^Abuel[oa] /, '').charAt(0);
  const latest = (arr, key) => arr.filter(m => m[key]).sort((a, b) => b.at - a.at)[0];

  /* ---------------- Salud ---------------- */
  function Salud() {
    const { s, now, go, openSheet } = useApp();
    const u = s.household.units;
    const lw = latest(s.measurements, 'weightG');
    const pend = s.questions.filter(q => !q.resolved);
    const actives = s.meds.filter(m => m.active);
    const days = s.nextAppt ? Math.ceil((Z.dayStart(s.nextAppt.date) - Z.dayStart(now)) / Z.DAY) : null;
    const lastMed = id => live(s).filter(e => e.type === 'medicamento' && e.payload.medId === id).sort((a, b) => b.start - a.start)[0];
    return html`<main className="tz-main">
      <div className="tz-top"><h1 className="text-title-lg">Salud</h1>
        <button className="tz-btn tz-btn-glass text-button" type="button" onClick=${() => go('resumenPediatra')}>${Ic('clipboard', 20)}<span>Resumen</span></button></div>
      <div className="tz-cols">
        <div className="tz-stack s24">
          ${s.nextAppt ? html`<button type="button" className="tz-hero tz-glass" style=${{ gap: '12px', textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }} onClick=${() => go('pediatra')}>
            <span className="tz-kicker text-label c-doctor">${Icon('stethoscope', 16)}Próxima consulta${days >= 0 ? ' · ' + (days === 0 ? 'hoy' : days === 1 ? 'mañana' : 'en ' + days + ' días') : ''}</span>
            <span className="text-title-lg">${Z.fDate(s.nextAppt.date)}, ${Z.fTime(s.nextAppt.date)}</span>
            <span className="text-body tz-muted">${s.nextAppt.title} con la ${s.nextAppt.doctor}</span>
            <span className="tz-h wrap s8">${pend.length ? html`<span className="tz-tag doctor">${pend.length} ${pend.length === 1 ? 'duda anotada' : 'dudas anotadas'}</span>` : null}</span>
          </button>` : html`<div className="tz-sunken tz-stack s8" style=${{ padding: '20px', alignItems: 'flex-start' }}><p className="text-body">No hay próxima cita agendada.</p><button type="button" className="tz-link" style=${linkBtn} onClick=${() => openSheet({ type: 'cita' })}>${Ic('calendar', 18)}Agregar próxima cita</button></div>`}
          <section className="tz-stack" aria-label="Crecimiento">
            <div className="tz-sec"><h2 className="text-title">Crecimiento</h2><button type="button" className="tz-link" style=${linkBtn} onClick=${() => go('crecimiento')}>Ver curvas</button></div>
            ${lw ? html`<${T.StatCard} label=${'Último peso · ' + Z.fShort(lw.at) + ', ' + (lw.origin === 'casa' ? 'en casa' : lw.origin === 'consulta' ? 'en consulta' : 'al nacer')} value=${Z.U.weight(lw.weightG, u.weight).split(' ')[0]} unit=${u.weight + ' · ' + Z.U.weightAlt(lw.weightG, u.weight)} category="growth" caption=${Z.cap(Z.pText(Z.percentile(s.baby.sex, 'weight', Z.ageMonthsFloat(s.baby.birth, lw.at), lw.weightG / 1000))) + ' de la OMS para su edad'} />`
              : html`<div className="tz-card lg tz-glass tz-stack" style=${{ alignItems: 'flex-start' }}><${CatIcon} cat="growth" /><p className="text-body">Aún no hay medidas. Puedes empezar con el peso de la última consulta o uno que tomes en casa.</p><${T.Button} variant="primary" icon="growth" onClick=${() => openSheet({ type: 'medida' })}>Registrar primera medida<//></div>`}
          </section>
        </div>
        <div className="tz-stack s24">
          <section className="tz-stack" aria-label="Tratamientos activos">
            <div className="tz-sec"><h2 className="text-title">Tratamientos activos</h2><button type="button" className="tz-link" style=${linkBtn} onClick=${() => go('medicamentos')}>Historial</button></div>
            <div className="tz-list tz-glass">
              ${actives.length ? actives.map(m => { const l = lastMed(m.id); return html`<${Row} key=${m.id} icon=${html`<${CatIcon} cat="meds" />`} title=${m.name} sub=${'«' + m.indication + '»' + (l ? ' · ' + Z.dayLabel(l.start, now).toLowerCase() + ' ' + Z.fTime(l.start) : '')} onClick=${() => go('medicamentos')} />`; })
                : html`<${Row} icon=${html`<${CatIcon} cat="meds" />`} title="Ningún tratamiento activo" sub="Agrega uno cuando el pediatra lo indique" onClick=${() => openSheet({ type: 'tratamiento' })} end=${html`<span className="chev">${Icon('plus')}</span>`} />`}
            </div>
          </section>
          <section className="tz-stack" aria-label="Dudas para la consulta">
            <div className="tz-sec"><h2 className="text-title">Dudas para la consulta</h2><button type="button" className="tz-link" style=${linkBtn} onClick=${() => go('dudas')}>Ver todas</button></div>
            <div className="tz-list tz-glass">
              ${pend.length ? pend.slice(0, 3).map(q => html`<div key=${q.id} className="tz-row">${Ic('question', 20, 'c-doctor')}<span className="grow text-body">${q.text}</span></div>`)
                : html`<${Row} icon=${html`<span className="tz-icchip temp">${Ic('question', 22)}</span>`} title="Sin dudas anotadas" sub="Anótalas cuando surjan" onClick=${() => go('dudas')} />`}
            </div>
          </section>
          <section className="tz-list tz-glass" aria-label="Más de salud">
            <${Row} icon=${html`<${CatIcon} cat="doctor" />`} title="Pediatra y visitas" sub=${s.visits.length + ' visitas registradas'} onClick=${() => go('pediatra')} />
          </section>
        </div>
      </div>
    </main>`;
  }

  function GrowthChart({ metric }) {
    const { s, now } = useApp();
    const u = s.household.units;
    const isW = metric === 'weight';
    const conv = v => isW ? (u.weight === 'lb' ? v * 2.20462 : v) : (u.len === 'in' ? v / 2.54 : v);
    const cs = Z.curves(s.baby.sex, metric).map(c => c.map(conv));
    const all = cs.flat(); const lo = Math.floor(Math.min.apply(null, all) * 0.95), hi = Math.ceil(Math.max.apply(null, all) * 1.02);
    const X = m => 40 + m / 12 * 276, Y = v => 208 - (v - lo) / (hi - lo) * 196;
    const line = c => c.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    const band = line(cs[3]) + ' ' + cs[1].slice().reverse().map((v, i) => 'L' + X(12 - i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ') + ' Z';
    const key = isW ? 'weightG' : metric === 'length' ? 'lengthMm' : 'headMm';
    const pts = s.measurements.filter(m => m[key]).sort((a, b) => a.at - b.at).map(m => { const mo = Z.ageMonthsFloat(s.baby.birth, m.at); const v = isW ? m[key] / 1000 : m[key] / 10; return { x: X(Math.min(12, mo)), y: Y(conv(v)) }; });
    const stepV = (hi - lo) / 4; const ticks = [0, 1, 2, 3, 4].map(i => lo + stepV * i);
    const unit = isW ? u.weight : u.len;
    const name = isW ? 'peso' : metric === 'length' ? 'longitud' : 'perímetro cefálico';
    return html`<svg viewBox="0 0 340 236" role="img" aria-label=${'Curva OMS de ' + name + ' para la edad con los registros de ' + s.baby.name}>
      ${ticks.map(t => html`<g key=${t}><line className="grid" x1="40" x2="316" y1=${Y(t)} y2=${Y(t)}></line><text className="lbl" x="34" y=${Y(t) + 3} textAnchor="end">${Z.num(t, isW && unit === 'kg' ? 1 : 0)}</text></g>`)}
      ${[0, 2, 4, 6, 8, 10, 12].map(m => html`<text key=${m} className="lbl" x=${X(m)} y="228" textAnchor="middle">${m}</text>`)}
      <text className="lbl" x="4" y="10">${unit}</text>
      <path className="band" d=${band}></path>
      <path className="pl" d=${line(cs[0])}></path><path className="pl" d=${line(cs[4])}></path><path className="p50" d=${line(cs[2])}></path>
      ${[['97', cs[4]], ['85', cs[3]], ['50', cs[2]], ['15', cs[1]], ['3', cs[0]]].map(([l, c]) => html`<text key=${l} className="lbl" x="320" y=${Y(c[12]) + 3}>${l}</text>`)}
      ${pts.length > 1 ? html`<path className="me" d=${pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ')}></path>` : null}
      ${pts.map((p, i) => html`<circle key=${i} className="pt" cx=${p.x} cy=${p.y} r="4.5"></circle>`)}
    </svg>`;
  }

  function Crecimiento() {
    const { s, openSheet } = useApp();
    const [metric, setMetric] = useState('weight');
    const u = s.household.units;
    const key = metric === 'weight' ? 'weightG' : metric === 'length' ? 'lengthMm' : 'headMm';
    const rows = s.measurements.filter(m => m[key]).sort((a, b) => b.at - a.at);
    const fmt = m => metric === 'weight' ? Z.U.weight(m.weightG, u.weight) + ' · ' + Z.U.weightAlt(m.weightG, u.weight) : Z.U.len(m[key], u.len) + ' · ' + Z.U.lenAlt(m[key], u.len);
    const pOf = m => Z.percentile(s.baby.sex, metric, Z.ageMonthsFloat(s.baby.birth, m.at), metric === 'weight' ? m.weightG / 1000 : m[key] / 10);
    const last = rows[0];
    return html`<main className="tz-main docked" style=${{ paddingBottom: '190px' }}>
      <${PageHead} back="salud" backLabel="Salud" title="Crecimiento" />
      <${Seg} label="Medida" value=${metric} onChange=${setMetric} style=${{ maxWidth: '460px' }} options=${[{ v: 'weight', l: 'Peso' }, { v: 'length', l: 'Longitud' }, { v: 'head', l: 'Perímetro' }]} />
      <div className="tz-cols">
        <section className="tz-card lg tz-glass tz-stack s8 tz-growth" aria-label="Curva para la edad">
          <div className="tz-h between"><p className="text-body-strong">${metric === 'weight' ? 'Peso' : metric === 'length' ? 'Longitud' : 'Perímetro cefálico'} para la edad</p>${last ? html`<span className="tz-tag success">${Z.cap(Z.pText(pOf(last)))}</span>` : null}</div>
          <${GrowthChart} metric=${metric} />
          <div className="tz-legend"><span><i className="tz-sw" style=${{ background: 'var(--cat-growth)', height: '3px' }}></i>${s.baby.name}</span><span><i className="tz-sw ref"></i>Percentiles 15 a 85</span><span>Eje: edad en meses</span></div>
          <p className="text-body-sm tz-muted">Curvas OMS para ${s.baby.sex === 'M' ? 'niños' : 'niñas'}${s.baby.preterm ? ', con edad corregida' : ''}. Un percentil compara con la referencia; no es un diagnóstico. Prototipo: curvas aproximadas.</p>
        </section>
        <section className="tz-stack" aria-label="Medidas registradas">
          <h2 className="text-title">Medidas</h2>
          ${rows.length ? html`<div className="tz-list tz-glass">${rows.map(m => html`<div key=${m.id} className="tz-row">
            <span className="grow"><span className="text-body-strong tz-num">${fmt(m)}</span><span className="text-body-sm tz-muted tz-num">${Z.fDateY(m.at)}</span></span>
            <span className="end"><span className=${m.origin === 'consulta' ? 'tz-tag doctor' : 'tz-tag'}>${m.origin === 'consulta' ? 'Consulta' : m.origin === 'casa' ? 'Casa' : 'Hospital'}</span><span className="text-body-sm tz-muted tz-num">${Z.cap(Z.pText(pOf(m)))}</span></span>
          </div>`)}</div>` : html`<p className="text-body tz-muted">Aún no hay medidas de este tipo.</p>`}
        </section>
      </div>
      <div className="tz-dock"><${T.Button} variant="primary" size="lg" icon="growth" block=${true} onClick=${() => openSheet({ type: 'medida' })}>Registrar medida<//></div>
    </main>`;
  }

  function Medicamentos() {
    const { s, now, openSheet, update, toast } = useApp();
    const hist = live(s).filter(e => e.type === 'medicamento').sort((a, b) => b.start - a.start);
    const actives = s.meds.filter(m => m.active);
    const who = id => (s.members.find(m => m.id === id) || { name: '' }).name;
    return html`<main className="tz-main">
      <${PageHead} back="salud" backLabel="Salud" title="Medicamentos" action=${html`<button className="tz-btn tz-btn-glass text-button" type="button" onClick=${() => openSheet({ type: 'tratamiento' })}>${Icon('plus', 20)}<span>Tratamiento</span></button>`} />
      <div className="tz-cols">
        <section className="tz-stack" aria-label="Tratamientos activos">
          <h2 className="text-title">Activos</h2>
          ${actives.length ? actives.map(m => { const l = hist.find(e => e.payload.medId === m.id); return html`<div key=${m.id} className="tz-card lg tz-glass tz-stack s16">
            <div className="tz-h top"><${CatIcon} cat="meds" size="lg" /><div className="tz-stack" style=${{ gap: '2px' }}>
              <p className="text-body-strong" style=${{ fontSize: '17px' }}>${m.name}</p><p className="text-body">Indicación: «${m.indication}»</p>
              <p className="text-body-sm tz-muted">${m.by ? m.by + ' · ' : ''}desde el ${Z.fDateY(m.start)}</p></div></div>
            ${l ? html`<div className="tz-banner">${Icon('check', 20)}<span className="text-body">Última: ${Z.dayLabel(l.start, now).toLowerCase()} a las ${Z.fTime(l.start)}, por ${who(l.by)}</span></div>` : null}
            <div className="tz-h s8 wrap">
              <${T.Button} variant="primary" icon="pill" onClick=${() => openSheet({ type: 'medicamento', medId: m.id })}>Registrar que se dio<//>
              <${T.Button} variant="ghost" onClick=${() => { update(st => { st.meds.find(x => x.id === m.id).active = false; }); toast('Terminé el tratamiento ' + m.name, () => update(st => { st.meds.find(x => x.id === m.id).active = true; })); }}>Terminar tratamiento<//>
            </div>
          </div>`; }) : html`<p className="text-body tz-muted">Ningún tratamiento activo.</p>`}
          <${Alert} kind="neutral">Tereza guarda lo que se le dio y cuándo. No calcula, sugiere ni valida dosis o intervalos: eso lo indica tu pediatra.<//>
        </section>
        <section className="tz-stack" aria-label="Historial">
          <h2 className="text-title">Historial</h2>
          ${hist.length ? html`<div className="tz-list tz-glass">${hist.slice(0, 12).map(e => html`<div key=${e.id} className="tz-row">
            <span className="grow"><span className="text-body-strong">${e.payload.nombre}</span><span className="text-body-sm tz-muted">${e.payload.cantidad} · ${who(e.by)}${e.source === 'mcp' ? ', desde Claude' : ''}</span></span>
            <span className="end"><span className="text-body-strong tz-num">${Z.fTime(e.start)}</span><span className="text-body-sm tz-muted">${Z.dayLabel(e.start, now)}</span></span></div>`)}</div>` : html`<p className="text-body tz-muted">Sin administraciones registradas.</p>`}
        </section>
      </div>
    </main>`;
  }

  function Pediatra() {
    const { s, now, go, openSheet } = useApp();
    const pend = s.questions.filter(q => !q.resolved).length;
    const days = s.nextAppt ? Math.ceil((Z.dayStart(s.nextAppt.date) - Z.dayStart(now)) / Z.DAY) : null;
    return html`<main className="tz-main">
      <${PageHead} back="salud" backLabel="Salud" title="Pediatra" action=${html`<button className="tz-btn tz-btn-glass text-button" type="button" onClick=${() => openSheet({ type: 'visita' })}>${Icon('plus', 20)}<span>Visita</span></button>`} />
      <div className="tz-cols">
        <div className="tz-stack s24">
          <section className="tz-hero tz-glass" aria-label="Próxima cita" style=${{ gap: '12px' }}>
            <span className="tz-kicker text-label c-doctor">${Ic('calendar', 16)}Próxima cita${s.nextAppt && days >= 0 ? ' · ' + (days === 0 ? 'hoy' : 'en ' + days + ' días') : ''}</span>
            ${s.nextAppt ? html`<${React.Fragment}><p className="text-title-lg">${Z.fDate(s.nextAppt.date)}, ${Z.fTime(s.nextAppt.date)}</p><p className="text-body tz-muted">${s.nextAppt.title}</p><//>` : html`<p className="text-body">Sin cita agendada.</p>`}
            <div className="tz-h s8 wrap">
              <button className="tz-btn tz-btn-glass text-button" type="button" onClick=${() => go('dudas')}>${Ic('question', 20)}<span>${pend} ${pend === 1 ? 'duda' : 'dudas'}</span></button>
              <button className="tz-btn tz-btn-ghost text-button" type="button" onClick=${() => openSheet({ type: 'cita' })}>${Ic('edit', 20)}<span>${s.nextAppt ? 'Cambiar' : 'Agregar'}</span></button>
            </div>
          </section>
          <div className="tz-card tz-glass tz-h"><span className="tz-avatar doctor">MH</span><div className="grow tz-stack" style=${{ gap: 0 }}><span className="text-body-strong">Dra. Mónica Herrera</span><span className="text-body-sm tz-muted">Pediatra de ${s.baby.name}</span></div></div>
          <button type="button" className="tz-btn tz-btn-ghost text-button" style=${{ alignSelf: 'flex-start' }} onClick=${() => go('resumenPediatra')}>${Ic('clipboard', 20)}<span>Preparar resumen para la consulta</span></button>
        </div>
        <section className="tz-stack" aria-label="Visitas">
          <h2 className="text-title">Visitas</h2>
          ${s.visits.length ? html`<div className="tz-list tz-glass">${s.visits.slice().sort((a, b) => b.date - a.date).map(v => html`<button key=${v.id} type="button" className="tz-row" onClick=${() => go('visita', { id: v.id })}>
            <span className="tz-stack" style=${{ gap: 0, width: '48px', flex: 'none', textAlign: 'center' }}><span className="text-title tz-num">${new Date(v.date).getDate()}</span><span className="text-caption tz-muted">${Z.MESES[new Date(v.date).getMonth()].slice(0, 3)}</span></span>
            <span className="grow"><span className="text-body-strong">${v.title}</span><span className="text-body-sm tz-muted">${v.vaccines.length ? v.vaccines.length + ' vacunas' : 'Sin vacunas'}${v.attachments.length ? ' · ' + v.attachments.length + ' adjunto' : ''}</span></span>
            <span className="chev">${Icon('chevron-right')}</span></button>`)}</div>`
            : html`<div className="tz-sunken" style=${{ padding: '20px' }}><p className="text-body">Cuando registres una visita, sus notas, vacunas y adjuntos quedarán aquí.</p></div>`}
        </section>
      </div>
    </main>`;
  }

  function Visita() {
    const { s, params } = useApp();
    const v = s.visits.find(x => x.id === params.id);
    if (!v) return html`<main className="tz-main"><${PageHead} back="pediatra" backLabel="Pediatra" always=${true} title="Visita no encontrada" /></main>`;
    const u = s.household.units;
    const m = s.measurements.find(x => Math.abs(x.at - v.date) < Z.DAY);
    const res = s.questions.filter(q => q.resolved === v.id);
    const mo = m ? Z.ageMonthsFloat(s.baby.birth, m.at) : 0;
    const box = (l, val, sub) => html`<div className="tz-card tz-glass tz-stack s4" style=${{ padding: '12px' }}><span className="text-label tz-muted">${l}</span><span className="text-body-strong tz-num">${val}</span><span className="text-body-sm tz-muted tz-num">${sub}</span></div>`;
    return html`<main className="tz-main">
      <${PageHead} back="pediatra" backLabel="Pediatra" always=${true} title=${v.title} sub=${Z.fDate(v.date) + ' · ' + v.doctor} />
      <div className="tz-cols">
        <div className="tz-stack s24">
          ${m ? html`<section className="tz-stack" aria-label="Medidas"><h2 className="text-title">Medidas</h2><div className="tz-grid3">
            ${m.weightG ? box('Peso', Z.U.weight(m.weightG, u.weight), 'P' + Z.percentile(s.baby.sex, 'weight', mo, m.weightG / 1000)) : null}
            ${m.lengthMm ? box('Longitud', Z.U.len(m.lengthMm, u.len), 'P' + Z.percentile(s.baby.sex, 'length', mo, m.lengthMm / 10)) : null}
            ${m.headMm ? box('Cabeza', Z.U.len(m.headMm, u.len), 'P' + Z.percentile(s.baby.sex, 'head', mo, m.headMm / 10)) : null}
          </div></section>` : null}
          <section className="tz-stack" aria-label="Vacunas"><h2 className="text-title">Vacunas</h2>
            ${v.vaccines.length ? html`<div className="tz-list tz-glass">${v.vaccines.map(x => html`<div key=${x} className="tz-row"><span className="tz-icchip sm temp">${Ic('syringe', 16)}</span><span className="grow text-body">${x}</span></div>`)}</div>` : html`<p className="text-body tz-muted">No se aplicaron vacunas.</p>`}
          </section>
        </div>
        <div className="tz-stack s24">
          <section className="tz-stack s8" aria-label="Notas"><h2 className="text-title">Notas</h2><p className="text-body-lg">${v.notes || 'Sin notas.'}</p></section>
          ${res.length || v.attachments.length ? html`<div className="tz-list tz-glass">
            ${res.map(q => html`<div key=${q.id} className="tz-row"><span className="c-growth">${Icon('check', 20)}</span><span className="grow text-body">${q.text}</span></div>`)}
            ${v.attachments.map(a => html`<div key=${a} className="tz-row">${Ic('clip', 20, 'c-primary')}<span className="grow"><span className="text-body-strong">${a}</span><span className="text-body-sm tz-muted">Adjunto guardado</span></span></div>`)}
          </div>` : null}
        </div>
      </div>
    </main>`;
  }

  function Dudas() {
    const { s, now, update, toast } = useApp();
    const [text, setText] = useState('');
    const pend = s.questions.filter(q => !q.resolved), done = s.questions.filter(q => q.resolved);
    const who = q => (s.members.find(m => m.id === q.by) || { name: '' }).name + (q.source === 'mcp' ? ', desde Claude' : '');
    const lastVisit = s.visits.slice().sort((a, b) => b.date - a.date)[0];
    const add = () => { if (!text.trim()) return; const id = Z.uid('q'); update(st => { st.questions.push({ id, text: text.trim(), by: st.me, at: Date.now(), resolved: null }); }); setText(''); toast('Anoté la duda', () => update(st => { st.questions = st.questions.filter(q => q.id !== id); })); };
    const resolve = q => { update(st => { st.questions.find(x => x.id === q.id).resolved = lastVisit ? lastVisit.id : 'sin-visita'; }); toast('Marqué la duda como resuelta', () => update(st => { st.questions.find(x => x.id === q.id).resolved = null; })); };
    return html`<main className="tz-main">
      <${PageHead} back="salud" backLabel="Salud" title="Dudas para la consulta" sub=${s.nextAppt ? s.nextAppt.title + ' · ' + Z.fDate(s.nextAppt.date).toLowerCase() : null} />
      <form className="tz-h s8" onSubmit=${e => { e.preventDefault(); add(); }}>
        <label htmlFor="dq" className="tz-lbl" style=${{ position: 'absolute', left: '-9999px' }}>Nueva duda</label>
        <input id="dq" className="tz-input grow" value=${text} onChange=${e => setText(e.target.value)} placeholder="Escribe una duda…" />
        <button className="tz-fab" type="submit" aria-label="Agregar duda" style=${{ width: '48px', height: '48px' }}>${Icon('plus')}</button>
      </form>
      <div className="tz-cols even">
        <section className="tz-stack" aria-label="Pendientes">
          <div className="tz-sec"><h2 className="text-title">Pendientes</h2><span className="tz-tag doctor">${pend.length}</span></div>
          ${pend.length ? html`<div className="tz-list tz-glass">${pend.map(q => html`<div key=${q.id} className="tz-row" style=${{ alignItems: 'flex-start', paddingTop: '14px', paddingBottom: '14px' }}>
            <${Check} on=${false} label="Marcar como resuelta" onClick=${() => resolve(q)} />
            <span className="grow"><span className="text-body">${q.text}</span><span className="text-body-sm tz-muted">${who(q)} · ${Z.fShort(q.at)}</span></span></div>`)}</div>`
            : html`<p className="text-body tz-muted">No hay dudas pendientes. Anótalas cuando surjan.</p>`}
        </section>
        <section className="tz-stack" aria-label="Resueltas">
          <h2 className="text-title">Resueltas</h2>
          ${done.length ? html`<div className="tz-list tz-sunken">${done.map(q => { const v = s.visits.find(x => x.id === q.resolved); return html`<div key=${q.id} className="tz-row" style=${{ alignItems: 'flex-start', paddingTop: '14px', paddingBottom: '14px' }}>
            <${Check} on=${true} label="Volver a pendiente" onClick=${() => update(st => { st.questions.find(x => x.id === q.id).resolved = null; })} />
            <span className="grow"><span className="text-body tz-muted">${q.text}</span><span className="text-body-sm tz-muted">${v ? 'En ' + v.title.toLowerCase() + ', ' + Z.fShort(v.date) : 'Resuelta'}</span></span></div>`; })}</div>` : html`<p className="text-body tz-muted">Aún no hay dudas resueltas.</p>`}
        </section>
      </div>
    </main>`;
  }

  function ResumenPediatra() {
    const { s, now, toast } = useApp();
    const lastVisit = s.visits.slice().sort((a, b) => b.date - a.date)[0];
    const [from, setFrom] = useState(lastVisit ? Z.dayStart(lastVisit.date) : Z.addDays(Z.dayStart(now), -30));
    const ev = live(s);
    const st = Z.periodStats(ev, from, Z.dayStart(now), now);
    const u = s.household.units;
    const ms = s.measurements.filter(m => m.at >= from - Z.DAY).sort((a, b) => a.at - b.at);
    const meds = ev.filter(e => e.type === 'medicamento' && e.start >= from);
    const byMed = {}; meds.forEach(e => { const k = e.payload.nombre + ' · «' + e.payload.cantidad + '»'; byMed[k] = (byMed[k] || 0) + 1; });
    const temps = ev.filter(e => (e.type === 'temperatura' || e.type === 'sintoma') && e.start >= from).sort((a, b) => a.start - b.start);
    const pend = s.questions.filter(q => !q.resolved);
    const ref = Z.sleepRef(Z.ageMonthsFloat(s.baby.birth, now));
    const textOut = () => [
      'Resumen de ' + s.baby.name + ' (' + Z.ageText(s.baby.birth, now) + ') del ' + Z.fDateY(from) + ' al ' + Z.fDateY(now),
      'Sueño promedio: ' + Z.fDur(st.sleep) + ' en 24 h (' + ref.label.toLowerCase() + ')',
      'Tomas: pecho ' + Z.num(st.pecho, 1) + ' al día, biberón ' + Z.num(st.bib, 1) + ' al día de ' + Z.U.vol(st.bibMl, u.vol),
      'Pañales: ' + Z.num(st.wet, 1) + ' mojados y ' + Z.num(st.dirty, 1) + ' sucios al día',
      'Medicamentos: ' + (Object.keys(byMed).map(k => k + ' (' + byMed[k] + ' veces)').join('; ') || 'ninguno'),
      'Temperaturas y síntomas: ' + (temps.map(e => Z.fShort(e.start) + ' ' + Z.evInfo(e, u, now).detail).join('; ') || 'ninguno'),
      'Dudas: ' + pend.map((q, i) => (i + 1) + '. ' + q.text).join(' ')
    ].join('\n');
    const copy = () => { try { navigator.clipboard.writeText(textOut()).then(() => toast('Copié el resumen para pegarlo donde quieras'), () => toast('No se pudo copiar en este navegador')); } catch (e) { toast('No se pudo copiar en este navegador'); } };
    const sec = (cat, title, body) => html`<section className="tz-stack s8"><h3><${CatIcon} cat=${cat} size="sm" />${title}</h3>${body}</section>`;
    return html`<main className="tz-main" style=${{ paddingBottom: '40px' }}>
      <${PageHead} back="salud" backLabel="Salud" always=${true} title="Resumen para el pediatra" />
      <div className="tz-stack" style=${{ maxWidth: '760px' }}>
        <${Seg} label="Desde" value=${from === (lastVisit && Z.dayStart(lastVisit.date)) ? 'v' : String(Math.round((Z.dayStart(now) - from) / Z.DAY))} onChange=${v => setFrom(v === 'v' && lastVisit ? Z.dayStart(lastVisit.date) : Z.addDays(Z.dayStart(now), -(+v)))} options=${[lastVisit ? { v: 'v', l: 'Última visita' } : null, { v: '7', l: '7 días' }, { v: '30', l: '30 días' }].filter(Boolean)} />
        <div className="tz-grid2">
          <button className="tz-btn tz-btn-glass text-button" type="button" onClick=${() => toast('En la app real se abre el menú para compartir el PDF')}>${Ic('share', 20)}<span>Compartir</span></button>
          <button className="tz-btn tz-btn-primary text-button" type="button" onClick=${copy}>${Ic('copy', 20)}<span>Copiar texto</span></button>
        </div>
      </div>
      <article className="tz-doc" style=${{ maxWidth: '760px' }} aria-label="Resumen imprimible">
        <header className="tz-stack s4"><p className="text-title-lg">${s.baby.name} · ${Z.ageText(s.baby.birth, now)}</p>
          <p className="text-body-sm tz-muted">Nació el ${Z.fDateY(s.baby.birth)}${s.baby.preterm ? ', a las ' + s.baby.weeks + ' semanas' : ', a término'}</p>
          <p className="text-body-sm tz-muted">Del ${Z.fDateY(from)} al ${Z.fDateY(now)} · preparado por ${(s.members.find(m => m.id === s.me) || {}).name}</p></header>
        ${sec('growth', 'Crecimiento', ms.length ? html`<div style=${{ overflowX: 'auto' }}><table className="tz-table"><thead><tr><th>Fecha</th><th>Peso</th><th>Longitud</th><th>Percentil</th></tr></thead><tbody>
          ${ms.map(m => html`<tr key=${m.id}><td>${Z.fShort(m.at)} · ${m.origin}</td><td>${m.weightG ? Z.U.weight(m.weightG, u.weight) : '—'}</td><td>${m.lengthMm ? Z.U.len(m.lengthMm, u.len) : '—'}</td><td>${m.weightG ? 'P' + Z.percentile(s.baby.sex, 'weight', Z.ageMonthsFloat(s.baby.birth, m.at), m.weightG / 1000) : '—'}</td></tr>`)}
        </tbody></table></div>` : html`<p className="text-body tz-muted">Sin medidas en el período.</p>`)}
        ${sec('sleep', 'Sueño, promedio diario', html`<dl className="tz-dl"><dt>Total en 24 h (${ref.label.toLowerCase()})</dt><dd>${Z.fDur(st.sleep)}</dd><dt>Noche</dt><dd>${Z.fDur(st.night)}</dd><dt>Siestas</dt><dd>${Z.num(st.naps, 1)} · ${Z.fDur(st.nap)}</dd><dt>Despertares de noche</dt><dd>${Z.num(st.nightWakes, 1)}</dd></dl>`)}
        ${sec('feed', 'Tomas y pañales, promedio diario', html`<dl className="tz-dl"><dt>Pecho</dt><dd>${Z.num(st.pecho, 1)} · ${Math.round(st.pechoMin)} min</dd><dt>Biberón</dt><dd>${Z.num(st.bib, 1)} · ${Z.U.vol(st.bibMl, u.vol)}</dd><dt>Pañales mojados / sucios</dt><dd>${Z.num(st.wet, 1)} / ${Z.num(st.dirty, 1)}</dd></dl>`)}
        ${sec('meds', 'Medicamentos administrados', Object.keys(byMed).length ? html`<dl className="tz-dl">${Object.keys(byMed).map(k => html`<${React.Fragment} key=${k}><dt>${k}</dt><dd>${byMed[k]} ${byMed[k] === 1 ? 'vez' : 'veces'}</dd><//>`)}</dl>` : html`<p className="text-body tz-muted">Ninguno.</p>`)}
        ${sec('temp', 'Síntomas y temperaturas', temps.length ? html`<dl className="tz-dl">${temps.map(e => html`<${React.Fragment} key=${e.id}><dt>${Z.fShort(e.start)}, ${Z.fTime(e.start)}${e.notes ? ' · ' + e.notes : ''}</dt><dd>${Z.evInfo(e, u, now).detail}</dd><//>`)}</dl>` : html`<p className="text-body tz-muted">Ninguno registrado.</p>`)}
        <section className="tz-stack s8"><h3><span className="tz-icchip sm temp">${Ic('question', 16)}</span>Dudas pendientes</h3>
          ${pend.length ? html`<ol className="text-body" style=${{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>${pend.map(q => html`<li key=${q.id}>${q.text}</li>`)}</ol>` : html`<p className="text-body tz-muted">Ninguna.</p>`}</section>
        <p className="text-body-sm tz-muted" style=${{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>Datos registrados por la familia en Tereza. Este resumen no es un diagnóstico.</p>
      </article>
    </main>`;
  }

  /* ---------------- Más ---------------- */
  function Mas() {
    const { s, go, limited, update, toast, startTour } = useApp();
    const ic = (cls, chip) => html`<span className=${'tz-icchip' + (chip ? ' ' + chip : '')}>${Ic(cls, 22)}</span>`;
    const di = (name, chip) => html`<span className=${'tz-icchip' + (chip ? ' ' + chip : '')}>${Icon(name, 22)}</span>`;
    if (limited) return html`<main className="tz-main"><div className="tz-top"><h1 className="text-title-lg">Más</h1></div>
      <div className="tz-list tz-glass">
        <${Row} icon=${ic('users')} title="Cambiar de persona (prueba)" sub="Volver a ver la app como Andrea, admin" onClick=${() => { update(st => { st.me = 'andrea'; }); toast('Ahora ves la app como Andrea'); go('hoy'); }} />
      </div></main>`;
    const connected = s.members.filter(m => m.claude).length;
    return html`<main className="tz-main">
      <div className="tz-top"><h1 className="text-title-lg">Más</h1></div>
      <div className="tz-cols even">
        <div className="tz-stack s24">
          <section className="tz-stack" aria-label="Seguimiento"><h2 className="text-title">Seguimiento</h2>
            <div className="tz-list tz-glass">
              <${Row} icon=${di('chart', 'sleep')} title="Patrones de sueño" sub="Semana a semana" onClick=${() => go('patrones')} />
              <${Row} icon=${ic('clipboard', 'primary')} title="Resumen" sub="Hoy, 7 o 30 días" onClick=${() => go('resumen')} />
            </div></section>
          <section className="tz-stack" aria-label="Probar el prototipo"><h2 className="text-title">Probar el prototipo</h2>
            <div className="tz-list tz-glass">
              <${Row} icon=${di('play', 'primary')} title="Recorrido guiado" sub="El día a día de Andrea, de la instalación a la consulta" onClick=${() => startTour()} />
              <${Row} icon=${ic('sliders', 'warning')} title="Estados y roles" sub="Sin conexión, conflicto, rol limitado, vacío, onboarding" onClick=${() => go('pruebas')} />
            </div></section>
        </div>
        <section className="tz-stack" aria-label="Ajustes"><h2 className="text-title">Ajustes</h2>
          <div className="tz-list tz-glass">
            <${Row} icon=${html`<span className="tz-avatar">${s.baby.name.charAt(0)}</span>`} title=${s.baby.name} sub="Perfil y otros bebés" onClick=${() => go('bebe')} />
            <${Row} icon=${ic('users')} title="Cuidadores y roles" sub=${s.members.length + ' personas'} onClick=${() => go('cuidadores')} />
            <${Row} icon=${ic('sliders')} title="Unidades y modo noche" sub=${s.household.units.vol + ' · ' + s.household.units.weight + ' · ' + s.household.units.len + ' · noche ' + ({ auto: 'automática', on: 'siempre', off: 'nunca' })[s.household.night]} onClick=${() => go('preferencias')} />
            <${Row} icon=${di('bell')} title="Notificaciones" onClick=${() => go('notificaciones')} />
            <${Row} icon=${di('clock')} title="Ventanas de vigilia" sub=${s.windows.mode === 'custom' ? 'Las tuyas' : 'Automáticas'} onClick=${() => go('ventanas')} />
            <${Row} icon=${ic('plug')} title="Conexión con Claude" sub=${connected + (connected === 1 ? ' cuidador conectado' : ' cuidadores conectados')} onClick=${() => go('claude')} />
            <${Row} icon=${ic('shield')} title="Datos y privacidad" onClick=${() => go('datos')} />
          </div></section>
      </div>
    </main>`;
  }

  function Bebe() {
    const { s, now, update, toast, go } = useApp();
    const [b, setB] = useState(JSON.parse(JSON.stringify(s.baby)));
    const save = () => { const prev = s.baby; update(st => { st.baby = b; }); toast('Guardé el perfil de ' + b.name, () => update(st => { st.baby = prev; })); go('mas'); };
    return html`<main className="tz-main" style=${{ paddingBottom: '120px' }}>
      <${PageHead} back="mas" backLabel="Más" always=${true} title="Bebés" />
      <div className="tz-cols">
        <div className="tz-stack s16">
          <div className="tz-h" style=${{ gap: '16px' }}><span className="tz-avatar lg">${(b.name || '?').charAt(0)}</span>
            <div className="tz-stack" style=${{ gap: 0 }}><span className="text-title">${b.name}</span><span className="text-body-sm tz-muted">${Z.ageText(b.birth, now)} y ${Z.ageParts(b.birth, now).days} días</span>
              <button type="button" className="tz-link" style=${Object.assign({ minHeight: '36px' }, linkBtn)} onClick=${() => toast('En la app real eliges una foto de tu teléfono')}>${Ic('photo', 18)}Cambiar foto</button></div></div>
          <${Field} label="Nombre" id="bb-n"><input id="bb-n" className="tz-input" value=${b.name} onChange=${e => setB(Object.assign({}, b, { name: e.target.value }))} /><//>
          <${Field} label="Fecha de nacimiento" id="bb-d"><input id="bb-d" type="date" className="tz-input" value=${Z.toDateInput(b.birth)} onChange=${e => e.target.value && setB(Object.assign({}, b, { birth: Z.fromDateInput(e.target.value) }))} /><//>
          <${Field} label="¿Nació antes de las 37 semanas?" help="Si nació antes, usamos su edad corregida para crecimiento y estimaciones hasta los 2 años."><${Seg} label="Prematuro" value=${b.preterm ? 'si' : 'no'} onChange=${v => setB(Object.assign({}, b, { preterm: v === 'si', weeks: v === 'si' ? 34 : 39 }))} options=${[{ v: 'no', l: 'No' }, { v: 'si', l: 'Sí' }]} /><//>
          ${b.preterm ? html`<${Field} label="Semanas de gestación"><${Stepper} label="una semana" value=${b.weeks} unit="semanas" onDec=${() => setB(Object.assign({}, b, { weeks: Math.max(24, b.weeks - 1) }))} onInc=${() => setB(Object.assign({}, b, { weeks: Math.min(36, b.weeks + 1) }))} /><//>` : null}
          <${Field} label="Curvas de crecimiento" help="Solo sirve para elegir las curvas de la OMS."><${Seg} label="Curvas" value=${b.sex} onChange=${v => setB(Object.assign({}, b, { sex: v }))} options=${[{ v: 'F', l: 'Niña' }, { v: 'M', l: 'Niño' }]} /><//>
        </div>
        <section className="tz-stack" aria-label="Otros bebés"><h2 className="text-title">Otros bebés del hogar</h2>
          <${Alert} kind="neutral">Si agregas otro bebé, al registrar desde Claude te preguntaremos de quién se trata.<//>
          <button className="tz-btn tz-btn-glass tz-btn-block text-button" type="button" onClick=${() => toast('Agregar otro bebé llega después del prototipo')}>${Icon('plus', 20)}<span>Agregar otro bebé</span></button></section>
      </div>
      <div className="tz-dock low"><${T.Button} variant="primary" size="lg" block=${true} disabled=${!b.name.trim()} onClick=${save}>Guardar cambios<//></div>
    </main>`;
  }

  function Cuidadores() {
    const { s, now, openSheet } = useApp();
    const av = ['', 'feed', 'diaper', 'doctor'];
    return html`<main className="tz-main" style=${{ paddingBottom: '40px' }}>
      <${PageHead} back="mas" backLabel="Más" title="Cuidadores" action=${html`<${T.Button} variant="primary" icon="plus" onClick=${() => openSheet({ type: 'invitar' })}>Invitar<//>`} />
      <div className="tz-cols">
        <section className="tz-list tz-glass" aria-label="Personas con acceso">
          ${s.members.map((m, i) => html`<button key=${m.id} type="button" className="tz-row" onClick=${() => openSheet({ type: 'miembro', id: m.id })}>
            <span className=${'tz-avatar ' + av[i % 4]}>${ini(m.name)}</span>
            <span className="grow"><span className="text-body-strong">${m.name}${m.id === s.me ? ' (tú)' : ''}</span><span className="text-body-sm tz-muted">${m.claude ? 'Conectado a Claude' : 'Sin Claude'}</span></span>
            <span className=${m.role === 'admin' ? 'tz-tag primary' : 'tz-tag'}>${ROLE_N[m.role]}</span></button>`)}
          ${s.invites.map(iv => html`<div key=${iv.email} className="tz-row"><span className="tz-avatar">${Ic('mail', 18)}</span><span className="grow"><span className="text-body-strong">${iv.email}</span><span className="text-body-sm tz-muted">Invitación enviada el ${Z.fShort(iv.at)}</span></span><span className="tz-tag warning">Pendiente</span></div>`)}
        </section>
        <section className="tz-stack" aria-label="Qué puede hacer cada rol"><h2 className="text-title">Qué puede hacer cada rol</h2>
          <div className="tz-card tz-glass" style=${{ overflowX: 'auto' }}><table className="tz-table"><thead><tr><th></th><th>Admin</th><th>Cuidador</th><th>Limitado</th></tr></thead><tbody>
            <tr><td>Registrar tomas, pañales y sueño</td><td>Sí</td><td>Sí</td><td>Sí</td></tr>
            <tr><td>Ver días anteriores</td><td>Sí</td><td>Sí</td><td>No</td></tr>
            <tr><td>Salud y medicamentos</td><td>Sí</td><td>Sí</td><td>No</td></tr>
            <tr><td>Invitar y quitar personas</td><td>Sí</td><td>No</td><td>No</td></tr>
          </tbody></table></div></section>
      </div>
    </main>`;
  }

  function Preferencias() {
    const { s, update } = useApp();
    const h = s.household;
    const set = fn => update(st => fn(st.household));
    return html`<main className="tz-main" style=${{ paddingBottom: '40px' }}>
      <${PageHead} back="mas" backLabel="Más" always=${true} title="Unidades y modo noche" />
      <div className="tz-cols even">
        <section className="tz-stack" aria-label="Unidades"><h2 className="text-title">Unidades</h2>
          <div className="tz-card tz-glass tz-stack">
            <div className="tz-h between"><span className="text-body">Biberón y extracción</span><${Seg} label="Volumen" style=${{ width: '150px' }} value=${h.units.vol} onChange=${v => set(x => { x.units.vol = v; })} options=${[{ v: 'ml', l: 'ml' }, { v: 'oz', l: 'oz' }]} /></div>
            <div className="tz-h between"><span className="text-body">Peso</span><${Seg} label="Peso" style=${{ width: '150px' }} value=${h.units.weight} onChange=${v => set(x => { x.units.weight = v; })} options=${[{ v: 'kg', l: 'kg' }, { v: 'lb', l: 'lb' }]} /></div>
            <div className="tz-h between"><span className="text-body">Longitud</span><${Seg} label="Longitud" style=${{ width: '150px' }} value=${h.units.len} onChange=${v => set(x => { x.units.len = v; })} options=${[{ v: 'cm', l: 'cm' }, { v: 'in', l: 'in' }]} /></div>
            <p className="tz-help">Temperatura en °C. Todo se guarda en sistema métrico; cambiar la unidad no altera tus registros.</p>
          </div>
          <${Field} label="Zona horaria del hogar" id="pf-tz"><select id="pf-tz" className="tz-input" value=${h.tz} onChange=${e => set(x => { x.tz = e.target.value; })}>
            ${[['America/Guatemala', 'Guatemala (UTC−6)'], ['America/Mexico_City', 'Ciudad de México (UTC−6)'], ['America/El_Salvador', 'El Salvador (UTC−6)'], ['America/Bogota', 'Bogotá (UTC−5)'], ['America/Lima', 'Lima (UTC−5)']].map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}</select><//>
        </section>
        <section className="tz-stack" aria-label="Modo noche"><h2 className="text-title">Modo noche</h2>
          <${Seg} label="Cuándo usar el modo noche" value=${h.night} onChange=${v => set(x => { x.night = v; })} options=${[{ v: 'auto', l: 'Automático' }, { v: 'on', l: 'Siempre' }, { v: 'off', l: 'Nunca' }]} />
          ${h.night === 'auto' ? html`<div className="tz-timefield">
            <${Field} label="Empieza" id="pf-f"><input id="pf-f" type="time" className="tz-input" value=${h.nightFrom} onChange=${e => set(x => { x.nightFrom = e.target.value; })} /><//>
            <${Field} label="Termina" id="pf-t"><input id="pf-t" type="time" className="tz-input" value=${h.nightTo} onChange=${e => set(x => { x.nightTo = e.target.value; })} /><//></div>` : null}
          <p className="tz-help">De noche la pantalla baja su brillo, no usa blanco y no muestra animaciones. El botón de luna arriba lo cambia en cualquier momento.</p>
        </section>
      </div>
    </main>`;
  }

  function Notificaciones() {
    const { s, update } = useApp();
    const n = s.notif; const set = fn => update(st => fn(st.notif));
    const p = Z.predict(s, Date.now());
    return html`<main className="tz-main" style=${{ paddingBottom: '40px' }}>
      <${PageHead} back="mas" backLabel="Más" always=${true} title="Notificaciones" />
      <div className="tz-cols even">
        <div className="tz-stack s16">
          <div className="tz-list tz-glass">
            <div className="tz-row"><span className="grow"><span className="text-body-strong">Antes de la próxima siesta</span><span className="text-body-sm tz-muted">Según la franja estimada</span></span><${Switch} on=${n.nap} label="Avisar antes de la próxima siesta" onChange=${v => set(x => { x.nap = v; })} /></div>
            <div className="tz-row"><span className="grow"><span className="text-body-strong">Antes de la hora de dormir</span></span><${Switch} on=${n.bed} label="Avisar antes de la hora de dormir" onChange=${v => set(x => { x.bed = v; })} /></div>
            <div className="tz-row"><span className="grow"><span className="text-body-strong">Silencio de noche</span><span className="text-body-sm tz-muted">Nada entre ${Z.fTime(Z.fromTimeInput(Date.now(), s.household.nightFrom))} y ${Z.fTime(Z.fromTimeInput(Date.now(), s.household.nightTo))}</span></span><${Switch} on=${n.quiet} label="Silencio de noche" onChange=${v => set(x => { x.quiet = v; })} /></div>
          </div>
          <${Field} label="Con cuánta anticipación"><${Seg} label="Anticipación" value=${n.lead} onChange=${v => set(x => { x.lead = v; })} options=${[{ v: 10, l: '10 min' }, { v: 15, l: '15 min' }, { v: 20, l: '20 min' }]} /><//>
        </div>
        <div className="tz-stack s16">
          <${Field} label="Quién recibe los avisos"><div className="tz-list tz-glass">
            ${s.members.map(m => html`<button key=${m.id} type="button" className="tz-row" aria-pressed=${!!n.who[m.id]} onClick=${() => set(x => { x.who[m.id] = !x.who[m.id]; })}>
              <span className=${'tz-check' + (n.who[m.id] ? ' on' : '')} aria-hidden="true">${n.who[m.id] ? Icon('check', 16) : null}</span><span className="grow text-body">${m.name}</span></button>`)}
          </div><//>
          <${Field} label="Así se verá"><div className="tz-solid tz-h top" style=${{ padding: '12px 14px', borderRadius: '18px' }}>
            <span className="tz-avatar sm">T</span><span className="grow tz-stack" style=${{ gap: 0 }}><span className="text-body-strong">${s.baby.name} podría tener sueño pronto</span>
            <span className="text-body-sm tz-muted">${p.from ? 'Franja estimada: ' + Z.fTime(p.from) + ' a ' + Z.fTime(p.to) + ', según su edad y sus últimos registros.' : 'Franja estimada según su edad y sus últimos registros.'}</span></span></div><//>
          <p className="tz-help">En iPhone, los avisos llegan cuando Tereza está agregada a la pantalla de inicio.</p>
        </div>
      </div>
    </main>`;
  }

  function Ventanas() {
    const { s, now, update, toast, go } = useApp();
    const [w, setW] = useState(JSON.parse(JSON.stringify(s.windows)));
    const range = Z.wakeRange(Z.ageMonthsFloat(s.baby.birth, now));
    const labels = ['Antes de la 1.ª siesta', 'Antes de la 2.ª siesta', 'Antes de la 3.ª siesta', 'Antes de dormir en la noche'];
    const adj = (i, d) => { const c = w.custom.slice(); c[i] = Math.max(30, Math.min(360, c[i] + d)); setW(Object.assign({}, w, { custom: c })); };
    return html`<main className="tz-main" style=${{ paddingBottom: '120px' }}>
      <${PageHead} back="mas" backLabel="Más" always=${true} title="Ventanas de vigilia" sub=${'Cuánto tiempo suele estar despierta ' + s.baby.name + ' antes de cada sueño. Es una referencia práctica, no una regla.'} />
      <${Seg} label="Origen de las ventanas" value=${w.mode} style=${{ maxWidth: '420px' }} onChange=${v => setW(Object.assign({}, w, { mode: v }))} options=${[{ v: 'auto', l: 'Automáticas' }, { v: 'custom', l: 'Las mías' }]} />
      <div className="tz-cols">
        ${w.mode === 'custom' ? html`<div className="tz-list tz-glass">${labels.map((l, i) => html`<div key=${i} className="tz-row" style=${{ minHeight: '68px' }}>
          <span className="grow"><span className="text-body-strong">${l}</span></span>
          <button className="tz-iconbtn plain" type="button" aria-label="Restar 15 minutos" onClick=${() => adj(i, -15)}>${Ic('minus', 20)}</button>
          <span className="text-body-strong tz-num" style=${{ width: '88px', textAlign: 'center' }}>${Z.fDur(w.custom[i])}</span>
          <button className="tz-iconbtn plain" type="button" aria-label="Sumar 15 minutos" onClick=${() => adj(i, 15)}>${Icon('plus', 20)}</button></div>`)}</div>`
          : html`<div className="tz-card tz-glass tz-stack s8"><p className="text-body">Tereza parte de la referencia por edad y la ajusta con los registros de los últimos 7 a 14 días, sin salirse de ese rango.</p>
            ${range ? html`<p className="text-body-strong tz-num">Referencia a esta edad: ${Z.fDur(range[0])} a ${Z.fDur(range[1])}</p>` : html`<p className="text-body-strong">Antes de las 8 semanas no hacemos estimaciones.</p>`}</div>`}
        <div className="tz-stack s16">
          ${range ? html`<${Alert} kind="info">Referencia por edad: ${Z.fDur(range[0])} a ${Z.fDur(range[1])}. Mientras uses las tuyas, la estimación lo dirá.<//>` : null}
          <${Field} label="Hora habitual de dormir" id="vw-b"><input id="vw-b" type="time" className="tz-input" value=${w.bedtime} onChange=${e => setW(Object.assign({}, w, { bedtime: e.target.value }))} /><//>
        </div>
      </div>
      <div className="tz-dock low"><${T.Button} variant="primary" size="lg" block=${true} onClick=${() => { const prev = s.windows; update(st => { st.windows = w; }); toast('Guardé las ventanas', () => update(st => { st.windows = prev; })); go('mas'); }}>Guardar ventanas<//></div>
    </main>`;
  }

  function ClaudeScreen() {
    const { s, now, update, toast } = useApp();
    const copy = () => { try { navigator.clipboard.writeText('[URL DEL CONECTOR]').then(() => toast('Dirección copiada'), () => toast('No se pudo copiar')); } catch (e) { toast('No se pudo copiar'); } };
    return html`<main className="tz-main" style=${{ paddingBottom: '40px' }}>
      <${PageHead} back="mas" backLabel="Más" always=${true} title="Conexión con Claude" />
      <div className="tz-cols">
        <div className="tz-stack s16">
          <section className="tz-card lg tz-glass tz-stack" aria-label="Estado del conector">
            <span className="tz-tag success" style=${{ alignSelf: 'flex-start' }}>${Icon('check', 14)}Conector activo</span>
            <p className="text-body">Cada cuidador conecta su propia cuenta de Claude. Lo que registra queda con su nombre y con la marca «desde Claude».</p>
            <div className="tz-input sunken" style=${{ justifyContent: 'space-between' }}><span className="tz-tag" style=${{ fontSize: '13px' }}>[URL DEL CONECTOR]</span><button className="tz-iconbtn plain" type="button" aria-label="Copiar dirección" style=${{ marginRight: '-12px' }} onClick=${copy}>${Ic('copy', 20)}</button></div>
          </section>
          <section className="tz-stack" aria-label="Quién está conectado"><h2 className="text-title">Quién está conectado</h2>
            <div className="tz-list tz-glass">${s.members.map(m => html`<div key=${m.id} className="tz-row"><span className="tz-avatar sm">${ini(m.name)}</span>
              <span className="grow"><span className="text-body-strong">${m.name}</span><span className="text-body-sm tz-muted">${m.claude ? (m.lastClaude ? 'Último uso ' + Z.dayLabel(m.lastClaude, now).toLowerCase() + ', ' + Z.fTime(m.lastClaude) : 'Conectado') : 'Sin conectar'}</span></span>
              ${m.claude ? html`<button className="tz-btn tz-btn-ghost text-button" type="button" style=${{ padding: '0 12px' }} onClick=${() => { update(st => { st.members.find(x => x.id === m.id).claude = false; }); toast('Revoqué el acceso de ' + m.name + ' desde Claude', () => update(st => { st.members.find(x => x.id === m.id).claude = true; })); }}>Revocar</button>` : null}
            </div>`)}</div></section>
        </div>
        <section className="tz-stack" aria-label="Qué puede hacer Claude"><h2 className="text-title">Qué puede hacer Claude</h2>
          <div className="tz-list tz-glass">
            ${['Registrar, corregir y borrar eventos', 'Responder preguntas sobre el historial', 'Preparar el resumen para el pediatra'].map(t => html`<div key=${t} className="tz-row"><span className="c-growth">${Icon('check', 20)}</span><span className="grow text-body">${t}</span></div>`)}
            <div className="tz-row">${Ic('x', 20, 'tz-muted')}<span className="grow text-body">Sugerir o calcular dosis, o dar diagnósticos</span></div>
          </div>
          <div className="tz-card tz-glass tz-stack s8"><span className="text-label tz-muted">Ejemplo</span>
            <p className="text-body" style=${{ alignSelf: 'flex-end', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}>Tomó 4 oz a las 2 y se durmió a mitad</p>
            <p className="text-body">Guardé: biberón de 4 oz a las 2:00 p.m. e inicié su sueño a las 2:10 p.m. Tomé «las 2» como de la tarde; si fue de madrugada, dímelo y lo corrijo.</p></div>
        </section>
      </div>
    </main>`;
  }

  function Datos() {
    const { openSheet, toast } = useApp();
    return html`<main className="tz-main" style=${{ paddingBottom: '40px' }}>
      <${PageHead} back="mas" backLabel="Más" always=${true} title="Datos y privacidad" />
      <section className="tz-stack" aria-label="Exportar"><h2 className="text-title">Llévate tus datos</h2>
        <div className="tz-grid2" style=${{ maxWidth: '420px' }}>
          <button className="tz-btn tz-btn-glass text-button" type="button" onClick=${() => openSheet({ type: 'exportar', fmt: 'csv' })}>${Ic('download', 20)}<span>CSV</span></button>
          <button className="tz-btn tz-btn-glass text-button" type="button" onClick=${() => openSheet({ type: 'exportar', fmt: 'json' })}>${Ic('download', 20)}<span>JSON</span></button>
        </div></section>
      <section className="tz-list tz-glass" aria-label="Cómo cuidamos tus datos" style=${{ maxWidth: '640px' }}>
        <div className="tz-row">${Ic('lock', 20, 'c-primary')}<span className="grow text-body">Solo las personas de tu hogar ven los datos.</span></div>
        <div className="tz-row">${Ic('shield', 20, 'c-primary')}<span className="grow text-body">Los datos de salud no van a analítica, registros del servidor ni direcciones web.</span></div>
      </section>
      <button className="tz-btn tz-btn-danger text-button" type="button" style=${{ alignSelf: 'flex-start' }} onClick=${() => openSheet({ type: 'borrar' })}>${Ic('trash', 20)}<span>Eliminar cuenta y datos</span></button>
    </main>`;
  }

  function Pruebas() {
    const { s, update, toast, go, openSheet, resetAll, setLoading } = useApp();
    const lastBottle = live(s).filter(e => e.type === 'toma_biberon').sort((a, b) => b.start - a.start)[0];
    const toggleOffline = v => {
      if (!v) { const n = s.events.filter(e => e.pending).length; update(st => { st.sim.offline = false; st.events.forEach(e => { delete e.pending; }); }); toast(n ? 'Volvió la conexión. Envié ' + n + (n === 1 ? ' registro' : ' registros') : 'Volvió la conexión'); }
      else { update(st => { st.sim.offline = true; }); toast('Simulando sin conexión'); }
    };
    return html`<main className="tz-main" style=${{ paddingBottom: '40px' }}>
      <${PageHead} back="mas" backLabel="Más" always=${true} title="Estados y roles" sub="Herramientas solo de este prototipo para recorrer cada caso." />
      <div className="tz-cols even">
        <div className="tz-list tz-glass">
          <div className="tz-row"><span className="grow"><span className="text-body-strong">Simular sin conexión</span><span className="text-body-sm tz-muted">Lo que registres queda «por enviar»</span></span><${Switch} on=${s.sim.offline} label="Simular sin conexión" onChange=${toggleOffline} /></div>
          <${Row} icon=${html`<span className="tz-icchip warning">${Ic('sync', 22)}</span>`} title="Ver un conflicto de edición" sub="Dos cuidadores cambian el mismo biberón" onClick=${() => lastBottle ? openSheet({ type: 'conflicto', id: lastBottle.id }) : toast('Registra un biberón primero')} />
          <${Row} icon=${html`<span className="tz-icchip">${Ic('lock', 22)}</span>`} title="Ver como la abuela Carmen" sub="Rol limitado: Hoy y registro rápido" onClick=${() => { update(st => { st.me = 'carmen'; }); toast('Ahora ves la app como la abuela Carmen'); go('hoy'); }} />
          <${Row} icon=${html`<span className="tz-icchip">${Ic('sync', 22)}</span>`} title="Ver la pantalla de carga" onClick=${() => { go('hoy'); setLoading(true); }} />
        </div>
        <div className="tz-list tz-glass">
          <${Row} icon=${html`<span className="tz-icchip">${Ic('note', 22)}</span>`} title="Empezar sin registros" sub="Estados vacíos de Hoy, Diario y Salud" onClick=${() => { resetAll(true, true); toast('Datos vaciados'); }} />
          <${Row} icon=${html`<span className="tz-icchip primary">${Icon('home', 22)}</span>`} title="Restaurar datos de ejemplo" onClick=${() => { resetAll(true); toast('Datos de ejemplo restaurados'); }} />
          <${Row} icon=${html`<span className="tz-icchip primary">${Icon('play', 22)}</span>`} title="Ver el onboarding otra vez" onClick=${() => resetAll(false)} />
        </div>
      </div>
    </main>`;
  }

  /* ---------------- Onboarding ---------------- */
  function Onboarding() {
    const { s, now, finishOnboarding, obStep: step, setObStep: setStep, startTour, touring } = useApp();
    const [home, setHome] = useState(s.household.name);
    const [units, setUnits] = useState(Object.assign({}, s.household.units));
    const [name, setName] = useState(s.baby.name);
    const [birth, setBirth] = useState(s.baby.birth);
    const [pre, setPre] = useState(false); const [weeks, setWeeks] = useState(34);
    const [sex, setSex] = useState('F');
    const [mail, setMail] = useState(''); const [role, setRole] = useState('cuidador'); const [invited, setInvited] = useState([]);
    const done = empty => finishOnboarding({ home, units, baby: { name: name.trim() || 'Lucía', birth, preterm: pre, weeks: pre ? weeks : 39, sex }, invites: invited }, empty);
    const bars = html`<div className="tz-stack s8"><div className="tz-h s8" role="img" aria-label=${'Paso ' + step + ' de 5'}>${[1, 2, 3, 4, 5].map(i => html`<span key=${i} style=${{ flex: 1, height: '6px', borderRadius: '999px', background: i <= step ? 'var(--primary)' : 'var(--track)' }}></span>`)}</div><p className="text-label tz-muted">Paso ${step} de 5${step === 5 ? ' · opcional' : ''}</p></div>`;
    const nav = (label, ok, extra) => html`<div className="tz-stack" style=${{ marginTop: 'auto' }}><div className="tz-h s8">
      <button className="tz-iconbtn" type="button" aria-label="Volver" onClick=${() => setStep(step - 1)}>${Icon('chevron-left')}</button>
      <${T.Button} variant="primary" size="lg" block=${true} disabled=${ok === false} onClick=${() => setStep(step + 1)}>${label || 'Continuar'}<//></div>${extra || null}</div>`;
    let body;
    if (step === 0) body = html`<${React.Fragment}>
      <p className="tz-logo" style=${{ padding: 0 }}>Tereza</p>
      <div className="tz-stack s16" style=${{ marginTop: '24px' }}><h1 className="text-display">El día de tu bebé, a un toque.</h1>
        <p className="text-body-lg tz-muted">Registra sueño, tomas, pañales y salud con una mano, también a las 3 de la mañana. Comparte con quien cuida y consulta todo desde Claude cuando quieras.</p></div>
      <div className="tz-stack" style=${{ marginTop: 'auto' }}>
        <${T.Button} variant="primary" size="lg" block=${true} onClick=${() => setStep(1)}>Continuar con Google<//>
        <button className="tz-btn tz-btn-glass tz-btn-lg tz-btn-block text-button" type="button" onClick=${() => setStep(1)}>${Ic('mail', 20)}<span>Continuar con mi correo</span></button>
        <p className="text-body-sm tz-muted" style=${{ textAlign: 'center', marginTop: '4px' }}>Prototipo: ningún botón inicia sesión de verdad.</p>
        ${touring ? null : html`<button type="button" className="tz-btn tz-btn-ghost tz-btn-block text-button" onClick=${startTour}>${Icon('play', 20)}<span>Hacer el recorrido guiado</span></button>`}
      </div><//>`;
    if (step === 1) body = html`<${React.Fragment}>${bars}
      <div className="tz-stack s8"><h1 className="text-title-lg">Tu hogar</h1><p className="text-body tz-muted">Así se llamará el espacio que compartes con quienes cuidan a tu bebé.</p></div>
      <${Field} label="Nombre del hogar" id="ob-h"><input id="ob-h" className="tz-input" value=${home} onChange=${e => setHome(e.target.value)} /><//>
      <${Field} label="Zona horaria" help="La tomamos de tu dispositivo. Las horas como «a las 2» se interpretan con ella."><span className="tz-input">${Ic('globe', 20)}Guatemala (UTC−6)</span><//>
      <div className="tz-stack s8"><span className="tz-lbl">Unidades</span>
        ${[['vol', 'Biberón', ['ml', 'oz']], ['weight', 'Peso', ['kg', 'lb']], ['len', 'Longitud', ['cm', 'in']]].map(([k, l, o]) => html`<div key=${k} className="tz-h between"><span className="text-body">${l}</span><${Seg} label=${l} style=${{ width: '168px' }} value=${units[k]} onChange=${v => setUnits(Object.assign({}, units, { [k]: v }))} options=${o.map(x => ({ v: x, l: x }))} /></div>`)}
        <span className="tz-help">La temperatura se muestra en °C.</span></div>
      ${nav('Continuar', !!home.trim())}<//>`;
    if (step === 2) body = html`<${React.Fragment}>${bars}
      <div className="tz-h" style=${{ gap: '16px' }}><span className="tz-avatar lg">${Ic('photo')}</span><div className="tz-stack s4"><h1 className="text-title-lg">Tu bebé</h1><p className="text-body-sm tz-muted">La foto es opcional y solo la ve tu hogar.</p></div></div>
      <${Field} label="Nombre" id="ob-n"><input id="ob-n" className="tz-input" value=${name} onChange=${e => setName(e.target.value)} /><//>
      <${Field} label="Fecha de nacimiento" id="ob-b"><input id="ob-b" type="date" className="tz-input" value=${Z.toDateInput(birth)} onChange=${e => e.target.value && setBirth(Z.fromDateInput(e.target.value))} /><//>
      <${Field} label="¿Nació antes de las 37 semanas?" help="Si nació antes, usamos su edad corregida para el crecimiento y las estimaciones hasta los 2 años."><${Seg} label="Prematuro" value=${pre ? 'si' : 'no'} onChange=${v => setPre(v === 'si')} options=${[{ v: 'no', l: 'No' }, { v: 'si', l: 'Sí' }]} /><//>
      ${pre ? html`<${Field} label="Semanas de gestación"><${Stepper} label="una semana" value=${weeks} unit="semanas" onDec=${() => setWeeks(Math.max(24, weeks - 1))} onInc=${() => setWeeks(Math.min(36, weeks + 1))} /><//>` : null}
      <${Field} label="Curvas de crecimiento" help="Solo sirve para elegir las curvas de la OMS."><${Seg} label="Curvas" value=${sex} onChange=${setSex} options=${[{ v: 'F', l: 'Niña' }, { v: 'M', l: 'Niño' }]} /><//>
      ${nav('Continuar', !!name.trim())}<//>`;
    if (step === 3) body = html`<${React.Fragment}>${bars}
      <div className="tz-stack s8"><${T.CategoryIcon} category="sleep" size="lg" /><h1 className="text-title-lg">Antes de empezar: sueño seguro</h1><p className="text-body tz-muted">Tres pautas básicas para cada siesta y cada noche.</p></div>
      <ol className="tz-list tz-glass" style=${{ margin: 0, padding: 0, listStyle: 'none' }}>
        ${[['Boca arriba, siempre', 'En siestas y en la noche, durante su primer año.'], ['Superficie firme y plana', 'Colchón firme con sábana ajustable, sin inclinarlo.'], ['Cuna despejada', 'Sin almohadas, cobijas sueltas, peluches ni protectores.']].map(([t, d], i) => html`<li key=${i} className="tz-row" style=${{ alignItems: 'flex-start', padding: '16px' }}><span className="tz-avatar sm" aria-hidden="true">${i + 1}</span><span className="grow"><span className="text-body-strong">${t}</span><span className="text-body-sm tz-muted">${d}</span></span></li>`)}
      </ol>
      <p className="text-body-sm tz-muted">Basado en las recomendaciones de la Academia Americana de Pediatría. Si tienes dudas, consulta a tu pediatra.</p>
      ${nav('Entendido')}<//>`;
    if (step === 4) body = html`<${React.Fragment}>
      <div className="tz-h between"><div className="grow">${bars}</div><button type="button" className="tz-link" style=${Object.assign({ marginLeft: '16px' }, linkBtn)} onClick=${() => setStep(5)}>Saltar</button></div>
      <div className="tz-stack s8"><h1 className="text-title-lg">Invita a quien cuida</h1><p className="text-body tz-muted">Cada persona entra con su propia cuenta y ve solo lo que su rol permite.</p></div>
      <${Field} label="Correo" id="ob-m"><input id="ob-m" type="email" className="tz-input" value=${mail} onChange=${e => setMail(e.target.value)} placeholder="nombre@correo.com" /><//>
      <${Field} label="Rol"><${RolePicker} value=${role} onChange=${setRole} /><//>
      ${invited.length ? html`<p className="text-body-sm c-growth">${invited.length === 1 ? 'Invitación lista para ' : 'Invitaciones listas para '}${invited.map(i => i.email).join(', ')}</p>` : null}
      <div className="tz-stack" style=${{ marginTop: 'auto' }}>
        <${T.Button} variant="glass" size="lg" block=${true} disabled=${!/.+@.+\..+/.test(mail)} onClick=${() => { setInvited(invited.concat({ email: mail.trim(), role, at: Date.now() })); setMail(''); }}>Agregar invitación<//>
        <div className="tz-h s8"><button className="tz-iconbtn" type="button" aria-label="Volver" onClick=${() => setStep(3)}>${Icon('chevron-left')}</button><${T.Button} variant="primary" size="lg" block=${true} onClick=${() => setStep(5)}>Continuar<//></div>
      </div><//>`;
    if (step === 5) body = html`<${React.Fragment}>${bars}
      <div className="tz-stack s8"><h1 className="text-title-lg">Registra hablando con Claude</h1><p className="text-body tz-muted">Agrega Tereza como conector en Claude, en la web o en el celular, y escribe como le hablarías a otra persona.</p></div>
      <div className="tz-stack s8" aria-label="Ejemplo de conversación">
        <p className="text-body" style=${{ alignSelf: 'flex-end', maxWidth: '80%', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}>Tomó 4 oz a las 2 y se durmió a mitad</p>
        <div className="tz-card tz-glass tz-stack s4" style=${{ maxWidth: '92%', borderRadius: '18px 18px 18px 4px', padding: '12px 14px' }}><p className="text-body">Guardé: biberón de 4 oz a las 2:00 p.m. e inicié su sueño a las 2:10 p.m.</p><p className="text-body-sm tz-muted">Tomé «las 2» como de la tarde. Si fue de madrugada, dímelo y lo corrijo.</p></div>
      </div>
      <ol className="tz-stack s8 text-body" style=${{ margin: 0, paddingLeft: '20px' }}><li>En Claude, agrega un conector personalizado.</li><li>Pega la dirección de Tereza: <span className="tz-tag" style=${{ fontSize: '13px' }}>[URL DEL CONECTOR]</span></li><li>Entra con tu cuenta. Cada cuidador conecta la suya.</li></ol>
      <div className="tz-stack" style=${{ marginTop: 'auto' }}>
        <${T.Button} variant="primary" size="lg" block=${true} onClick=${() => done(false)}>Listo, ir a Hoy<//>
        <${T.Button} variant="ghost" block=${true} onClick=${() => done(true)}>Empezar sin datos de ejemplo<//>
      </div><//>`;
    return html`<div className="tz-app solo"><main className="tz-main solo" style=${{ gap: '20px', minHeight: '100dvh' }}>${body}</main></div>`;
  }

  window.TZS2 = { Salud, Crecimiento, Medicamentos, Pediatra, Visita, Dudas, ResumenPediatra, Mas, Bebe, Cuidadores, Preferencias, Notificaciones, Ventanas, ClaudeScreen, Datos, Pruebas, Onboarding };
})();
