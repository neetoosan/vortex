/* =========================================================
   VORTEX WRAPS — gallery
   Service filters (sticky bar, counts, shareable #hash),
   film tiles that appear once their files exist, and a
   lightbox with swipe, keyboard, counter and a "Book" CTA.
   Clip playback in the grid is handled by main.js.
   ========================================================= */
(() => {
  'use strict';
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const bar = $('#galleryBar');
  const chips = $$('.chip', bar);
  const countEl = $('#galleryCount');
  let items = $$('.g-item', grid);
  let filter = 'all';

  const ready = it => !it.hasAttribute('data-pending');
  const shown = () => items.filter(it => ready(it) && !it.hidden);
  const BOOK = {
    'colour-change': ['colour-change', 'Book a colour change'],
    ppf: ['ppf', 'Book paint protection'],
    'two-tone': ['partial', 'Book a two-tone wrap'],
  };

  /* keep the sticky bar right under the (sticky) header */
  const header = $('#header');
  const syncHeader = () => document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  syncHeader();
  if ('ResizeObserver' in window) new ResizeObserver(syncHeader).observe(header);

  /* ---------- counts ---------- */
  function updateCounts() {
    const total = items.filter(ready).length;
    chips.forEach(chip => {
      const f = chip.dataset.filter;
      const n = items.filter(it => ready(it) && (f === 'all' || it.dataset.cat === f)).length;
      chip.querySelector('sup').textContent = n;
      chip.hidden = f !== 'all' && n === 0;
    });
    const n = shown().length;
    countEl.textContent = filter === 'all' ? `${total} photos & clips` : `${n} of ${total}`;
  }

  /* ---------- filtering ---------- */
  function scrollToGrid() {
    const top = grid.getBoundingClientRect().top + window.scrollY - bar.offsetHeight - header.offsetHeight - 18;
    if (window.scrollY <= top + 2) return;
    if (window.vortexLenis) window.vortexLenis.scrollTo(top, { duration: 0.9 });
    else window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }
  function applyFilter(f, { animate = true } = {}) {
    if (!chips.some(c => c.dataset.filter === f && !c.hidden)) f = 'all';
    filter = f;
    chips.forEach(c => {
      const on = c.dataset.filter === f;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', on);
      if (on && animate) c.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    });
    const run = () => {
      items.forEach(it => { it.hidden = f !== 'all' && it.dataset.cat !== f; });
      updateCounts();
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    };
    if (!animate || reduce || !gsap) { run(); return; }
    gsap.killTweensOf(items);                       // stop the scroll-in tweens so nothing stays hidden
    gsap.set(items, { clearProps: 'opacity,transform' });
    gsap.to(grid, {
      opacity: 0, y: 12, duration: 0.18, ease: 'power2.in',
      onComplete: () => {
        run();
        scrollToGrid();
        gsap.set(grid, { clearProps: 'opacity,transform' });
        gsap.fromTo(shown().slice(0, 18), { opacity: 0, y: 28, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.035, ease: 'power3.out', clearProps: 'opacity,transform' });
      },
    });
  }
  const hashFilter = () => decodeURIComponent(location.hash.slice(1)) || 'all';
  chips.forEach(chip => chip.addEventListener('click', () => {
    applyFilter(chip.dataset.filter);
    history.replaceState(null, '', filter === 'all' ? location.pathname + location.search : `#${filter}`);
  }));
  window.addEventListener('hashchange', () => applyFilter(hashFilter()));

  /* ---------- films: only show tiles whose files exist ----------
     The edited films live in assets/web/videos/, which isn't uploaded yet
     (see .gitignore). Each film tile starts hidden (data-pending) and is
     revealed once its poster loads, so they appear by themselves as soon
     as the files are added and the gallery never shows empty boxes. */
  items.filter(it => it.hasAttribute('data-pending')).forEach(it => {
    const img = $('img', it), src = img && img.dataset.src;
    const probe = new Image();
    probe.onload = () => {
      img.src = src;
      it.removeAttribute('data-pending');
      applyFilter(filter, { animate: false });
    };
    probe.onerror = () => { it.remove(); items = items.filter(x => x !== it); updateCounts(); };
    if (src) probe.src = src; else probe.onerror();
  });
  // film tiles preview on hover
  if (window.matchMedia('(hover: hover)').matches) {
    $$('.g-item[data-type="film"] .g-open', grid).forEach(btn => {
      const v = $('video', btn);
      btn.addEventListener('mouseenter', () => {
        if (!v.getAttribute('src')) v.src = v.dataset.src;
        v.play().then(() => btn.classList.add('is-playing')).catch(() => {});
      });
      btn.addEventListener('mouseleave', () => { v.pause(); btn.classList.remove('is-playing'); });
    });
  }

  applyFilter(hashFilter(), { animate: false });

  /* =========================================================
     Lightbox
     ========================================================= */
  const lb = $('#lightbox');
  const media = $('#lbStage');
  const els = { count: $('#lbCount'), cat: $('#lbCat'), title: $('#lbTitle'), desc: $('#lbDesc'), book: $('#lbBook'), bookText: $('#lbBookText') };
  let list = [], index = -1, opener = null;

  function build(item) {
    const btn = $('.g-open', item), thumb = $('img', btn), kind = btn.dataset.kind;
    let el;
    if (kind === 'photo') {
      el = new Image();
      el.decoding = 'async';
      el.alt = thumb.alt;
      el.src = btn.dataset.full;
    } else {
      el = document.createElement('video');
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      if (thumb.getAttribute('src')) el.poster = thumb.getAttribute('src');
      el.setAttribute('aria-label', thumb.alt);
      if (kind === 'clip') {       // silent loop, like the GIF it replaced
        el.muted = true;
        el.setAttribute('muted', '');
        el.loop = true;
        el.autoplay = !reduce;
        el.controls = reduce;
      } else {                     // edited film with sound
        el.controls = true;
        el.autoplay = true;
      }
      el.src = btn.dataset.full;
    }
    el.className = 'lb-el';
    return el;
  }

  function show(i, dir = 0) {
    const item = list[i];
    if (!item) return;
    index = i;
    const el = build(item);
    const old = $$('.lb-el', media);
    if (!reduce) el.classList.add(dir > 0 ? 'from-right' : dir < 0 ? 'from-left' : 'from-zoom');
    media.appendChild(el);
    if (el.tagName === 'VIDEO' && el.autoplay) el.play().catch(() => {});   // don't rely on the autoplay attribute alone
    if (!reduce) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('from-right', 'from-left', 'from-zoom')));
    old.forEach(o => {
      if (o.pause) o.pause();
      if (reduce) { o.remove(); return; }
      o.classList.add(dir < 0 ? 'to-right' : 'to-left');
      setTimeout(() => o.remove(), 420);
    });

    const btn = $('.g-open', item), cat = item.dataset.cat;
    els.count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    els.cat.textContent = $('figcaption span', item)?.textContent || '';
    els.title.textContent = btn.dataset.title || '';
    els.desc.textContent = $('img', btn).alt;
    const [svc, label] = BOOK[cat] || [null, 'Book your wrap'];
    els.book.href = svc ? `book.html?service=${svc}` : 'book.html';
    els.bookText.textContent = label;

    // warm up the neighbouring photos
    [list[(i + 1) % list.length], list[(i - 1 + list.length) % list.length]].forEach(n => {
      const b = n && $('.g-open', n);
      if (b && b.dataset.kind === 'photo') new Image().src = b.dataset.full;
    });
  }
  const step = dir => { if (list.length > 1) show((index + dir + list.length) % list.length, dir); };

  function open(item) {
    list = shown();
    opener = $('.g-open', item);
    media.innerHTML = '';
    document.documentElement.classList.add('lb-open');
    lb.showModal();
    if (reduce) lb.classList.add('is-visible');
    else requestAnimationFrame(() => lb.classList.add('is-visible'));
    show(list.indexOf(item));
  }
  function close({ instant = false } = {}) {
    if (!lb.open) return;
    lb.classList.remove('is-visible');
    $$('video', media).forEach(v => v.pause());
    const done = () => {
      lb.close();
      media.innerHTML = '';
      document.documentElement.classList.remove('lb-open');
      if (opener) opener.focus({ preventScroll: true });
    };
    if (instant || reduce) done(); else setTimeout(done, 260);
  }

  grid.addEventListener('click', e => {
    const btn = e.target.closest('.g-open');
    if (btn) open(btn.closest('.g-item'));
  });
  $('#lbClose').addEventListener('click', () => close());
  $('#lbPrev').addEventListener('click', () => step(-1));
  $('#lbNext').addEventListener('click', () => step(1));
  els.book.addEventListener('click', () => close({ instant: true }));   // so the page transition is visible
  lb.addEventListener('cancel', e => { e.preventDefault(); close(); }); // Esc
  lb.addEventListener('click', e => {                                   // click on the empty backdrop
    if (e.target === lb || e.target === media || e.target.id === 'lbStageWrap') close();
  });
  document.addEventListener('keydown', e => {
    if (!lb.open) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  /* swipe (touch / pen) with the image following the finger */
  let sx = null, cur = null;
  media.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    sx = e.clientX;
    cur = $$('.lb-el', media).pop() || null;
  });
  media.addEventListener('pointermove', e => {
    if (sx === null || !cur) return;
    cur.style.transition = 'none';
    cur.style.transform = `translateX(${e.clientX - sx}px)`;
  });
  const endSwipe = e => {
    if (sx === null) return;
    const dx = (e.clientX ?? sx) - sx;
    if (cur) { cur.style.transition = ''; cur.style.transform = ''; }
    sx = null; cur = null;
    if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
  };
  media.addEventListener('pointerup', endSwipe);
  media.addEventListener('pointercancel', () => {   // the browser took over (e.g. vertical pan): just snap back
    if (cur) { cur.style.transition = ''; cur.style.transform = ''; }
    sx = null; cur = null;
  });
})();
