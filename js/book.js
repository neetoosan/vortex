/* =========================================================
   VORTEX WRAPS — booking wizard (book.html)
   Uses CONTACT from main.js. Sends via WhatsApp or email.
   ========================================================= */
(() => {
  'use strict';
  const form = document.getElementById('wizard');
  if (!form) return;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const DRAFT = 'vx-booking-draft';

  const panes = $$('.pane', form);
  const stepsEl = $$('#steps li:not(.steps__bar)');
  const fill = $('#stepsFill');
  const prev = $('#prevBtn'), next = $('#nextBtn'), sendBtns = $('#sendBtns'), nav = $('#wizardNav');
  const LAST = 4;
  let step = 0, furthest = 0;

  /* ---------- setup: years, min date ---------- */
  const yearSel = $('#yearSelect');
  const thisYear = new Date().getFullYear();
  for (let y = thisYear + 1; y >= thisYear - 30; y--) yearSel.add(new Option(y, y));
  yearSel.add(new Option('Older', 'Older'));
  const dateIn = $('#dateInput');
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  dateIn.min = iso(new Date());

  /* ---------- read form ---------- */
  const val = n => {
    const els = form.elements[n];
    if (!els) return '';
    if (els instanceof RadioNodeList) {
      if (els[0] && els[0].type === 'checkbox') return [...els].filter(e => e.checked).map(e => e.value);
      return els.value;
    }
    if (els.type === 'checkbox') return els.checked ? [els.value] : [];
    return els.value.trim();
  };
  const data = () => ({
    service: val('service'), make: val('make'), model: val('model'), year: val('year'), body: val('body'),
    finish: val('finish'), colour: val('colour'), colourOther: val('colourOther'), coverage: val('coverage'),
    date: val('date'), time: val('time'), contactBy: val('contactBy'),
    name: val('name'), phone: val('phone'), email: val('email'), notes: val('notes'),
  });
  const prettyDate = s => {
    if (!s) return '';
    const d = new Date(`${s}T12:00:00`);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* ---------- live summary ---------- */
  const car = $('#sumCar');
  const finishMap = { Gloss: 'gloss', Satin: 'satin', Matte: 'matte', Metallic: 'metallic', Chrome: 'chrome', 'Clear (PPF)': 'gloss' };
  const pct = $('#sumPct');
  function summary() {
    const d = data();
    const set = (id, text) => {
      const el = $(`#sum-${id}`);
      const t = text || '—';
      if (el.textContent !== t) {
        el.textContent = t;
        el.classList.remove('is-new'); void el.offsetWidth; el.classList.add('is-new');
      }
    };
    set('service', d.service.join(' + '));
    set('vehicle', [d.year, d.make, d.model].filter(Boolean).join(' ') + (d.body ? ` · ${d.body}` : ''));
    set('look', [d.finish, d.colourOther || d.colour, d.coverage && `${d.coverage}`].filter(Boolean).join(' · '));
    set('date', [prettyDate(d.date), d.time].filter(Boolean).join(' · '));
    set('contact', [d.name, d.phone].filter(Boolean).join(' · '));

    const sw = $('input[name="colour"]:checked', form);
    if (sw) car.style.setProperty('--car', sw.closest('.sw-opt').style.getPropertyValue('--sw'));
    car.dataset.finish = finishMap[d.finish] || 'satin';

    const checks = [d.service.length, d.make && d.model, d.finish || d.colour || d.colourOther || d.coverage, d.date, d.name && d.phone];
    const p = Math.round(checks.filter(Boolean).length / checks.length * 100);
    if (gsap && !reduce) gsap.to(pct, { innerText: p, duration: 0.6, snap: { innerText: 1 } });
    else pct.textContent = p;
  }

  /* ---------- validation per step ---------- */
  function validate(i) {
    const d = data();
    const pane = panes[i];
    const err = $('.pane__error', pane);
    $$('.is-invalid', pane).forEach(e => e.classList.remove('is-invalid'));
    let msg = '';
    const bad = name => { const el = form.elements[name]; (el.length ? el[0] : el).classList.add('is-invalid'); };
    if (i === 0 && !d.service.length) msg = 'Pick at least one service to continue.';
    if (i === 1) {
      if (!d.make) bad('make');
      if (!d.model) bad('model');
      if (!d.make || !d.model) msg = 'Add your car’s make and model.';
    }
    if (i === 3) {
      if (!d.date) { bad('date'); msg = 'Choose a preferred date.'; }
      else if (d.date < dateIn.min) { bad('date'); msg = 'Please choose a date from today onwards.'; }
    }
    if (i === 4) {
      if (!d.name) bad('name');
      if (!d.phone || d.phone.replace(/\D/g, '').length < 7) bad('phone');
      if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) bad('email');
      if ($('.is-invalid', pane)) msg = 'Please add your name and a valid phone number' + (d.email && !/^\S+@\S+\.\S+$/.test(d.email) ? ' (and check your email).' : '.');
    }
    err.textContent = msg;
    if (msg && gsap && !reduce) gsap.fromTo(pane, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    return !msg;
  }

  /* ---------- navigation ---------- */
  function go(to, dir = 1, moveFocus = true) {
    const from = panes[step];
    const target = panes[to];
    step = to;
    furthest = Math.max(furthest, Math.min(to, LAST));
    stepsEl.forEach((li, i) => {
      li.classList.toggle('is-current', i === to);
      li.classList.toggle('is-done', i < to || (to > LAST));
      $('button', li).disabled = i > furthest;
    });
    fill.style.transform = `scaleX(${Math.min(to, LAST) / LAST})`;
    prev.style.visibility = to === 0 || to > LAST ? 'hidden' : 'visible';
    next.hidden = to >= LAST;
    sendBtns.hidden = to !== LAST;
    nav.hidden = to > LAST;

    if (gsap && !reduce && from !== target) {
      gsap.to(from, {
        x: -40 * dir, opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => {
          from.classList.remove('is-active');
          gsap.set(from, { clearProps: 'all' });
          target.classList.add('is-active');
          gsap.fromTo(target, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
          gsap.from($$('.opt-card, .chip-opt, .sw-opt, .field', target), { y: 16, opacity: 0, stagger: 0.03, duration: 0.45, ease: 'power3.out' });
          focusPane(target);
        },
      });
    } else {
      from.classList.remove('is-active');
      target.classList.add('is-active');
      if (moveFocus) focusPane(target);
    }
    const top = form.getBoundingClientRect().top + window.scrollY - 90;
    if (window.scrollY > top) (window.vortexLenis ? window.vortexLenis.scrollTo(top) : window.scrollTo({ top, behavior: 'smooth' }));
  }
  function focusPane(p) {
    const first = p.querySelector('legend') || p;
    if (p.classList.contains('pane--done')) { p.focus({ preventScroll: true }); return; }
    first.setAttribute('tabindex', '-1');
    first.focus({ preventScroll: true });
  }

  next.addEventListener('click', () => { if (validate(step)) go(step + 1, 1); });
  prev.addEventListener('click', () => go(step - 1, -1));
  $$('#steps button').forEach(b => b.addEventListener('click', () => {
    const t = +b.dataset.goto;
    if (t === step || t > furthest) return;
    if (t > step && !validate(step)) return;
    go(t, t > step ? 1 : -1);
  }));
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && step < LAST) { e.preventDefault(); next.click(); }
  });

  /* ---------- message ---------- */
  function message() {
    const d = data();
    const L = ['Hi Vortex Wraps! I’d like to book a wrap.', ''];
    L.push(`• Service: ${d.service.join(', ')}`);
    L.push(`• Car: ${[d.year, d.make, d.model].filter(Boolean).join(' ')}${d.body ? ` (${d.body})` : ''}`);
    if (d.finish || d.colour || d.colourOther) L.push(`• Look: ${[d.finish, d.colourOther || d.colour].filter(Boolean).join(' – ')}`);
    if (d.coverage) L.push(`• Coverage: ${d.coverage}`);
    L.push(`• Preferred date: ${prettyDate(d.date)}${d.time ? `, ${d.time}` : ''}`);
    if (d.contactBy) L.push(`• Best way to reach me: ${d.contactBy}`);
    L.push('', `Name: ${d.name}`, `Phone: ${d.phone}`);
    if (d.email) L.push(`Email: ${d.email}`);
    if (d.notes) L.push(`Notes: ${d.notes}`);
    return L.join('\n');
  }
  const waURL = () => `https://wa.me/${CONTACT.phoneIntl}?text=${encodeURIComponent(message())}`;

  let sent = false;
  function finish(openUrl, external) {
    if (external) window.open(openUrl, '_blank', 'noopener');
    else location.href = openUrl;
    $('#resendWa').href = waURL();
    // Leaving the last field fires `change` just before the send click, which queues a
    // draft save 300ms later — cancel it, or the sent booking comes back next visit.
    sent = true;
    clearTimeout(saveT);
    try { localStorage.removeItem(DRAFT); } catch { /* ignore */ }
    go(LAST + 1, 1);
    const check = $('.done-check');
    if (gsap && !reduce) {
      gsap.fromTo('.done-check circle', { strokeDashoffset: 340 }, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out', delay: 0.5 });
      gsap.fromTo('.done-check path', { strokeDashoffset: 80 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out', delay: 1.2 });
      gsap.from(check, { scale: 0.6, duration: 0.8, ease: 'back.out(2)', delay: 0.4 });
    }
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate(LAST)) return;
    finish(waURL(), true);
  });
  $('#sendEmail').addEventListener('click', () => {
    if (!validate(LAST)) return;
    const d = data();
    const subject = `Wrap booking — ${[d.make, d.model].filter(Boolean).join(' ')} — ${d.name}`;
    finish(`mailto:${CONTACT.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message())}`, false);
  });

  /* ---------- prefill: URL params, then saved draft ---------- */
  const params = new URLSearchParams(location.search);
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch { draft = null; }
  if (draft) {
    Object.entries(draft).forEach(([k, v]) => {
      const el = form.elements[k];
      if (!el) return;
      if (el instanceof RadioNodeList) [...el].forEach(i => { i.checked = Array.isArray(v) ? v.includes(i.value) : i.value === v; });
      else el.value = v;
    });
  }
  const svc = params.get('service');
  if (svc) {
    const box = $(`input[name="service"][data-key="${CSS.escape(svc)}"]`, form);
    if (box) box.checked = true;
  }
  const pf = params.get('finish');
  if (pf) { const r = $(`input[name="finish"][value="${CSS.escape(pf)}"]`, form); if (r) r.checked = true; }
  const pc = params.get('colour');
  if (pc) { const r = $(`input[name="colour"][value="${CSS.escape(pc)}"]`, form); if (r) r.checked = true; }

  /* ---------- save draft on change ---------- */
  let saveT;
  form.addEventListener('input', () => {
    summary();
    clearTimeout(saveT);
    if (sent) return;
    saveT = setTimeout(() => {
      const d = data();
      try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch { /* storage unavailable */ }
    }, 300);
    const pane = panes[step];
    if (pane && $('.pane__error', pane)?.textContent) {
      $$('.is-invalid', pane).forEach(el => { if (el.value) el.classList.remove('is-invalid'); });
    }
  });
  form.addEventListener('change', () => form.dispatchEvent(new Event('input')));

  go(0, 1, false); // initial render: don't pull keyboard/screen-reader focus into the form
  summary();
})();
